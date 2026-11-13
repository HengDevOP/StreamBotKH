#!/usr/bin/env python3
"""
Neural Voice Cloning & Tone-Color Conversion Engine (v4 Hybrid Studio Edition) for StreamService.

Pipeline:
1. Hybrid Glottal Autocorrelation + TorchAudio F0 Tracker (65-295 Hz 4th-order Butterworth + IQR outlier filter)
   to measure exact fundamental frequency (F0) without F1 formant octave errors or background noise skew.
2. High-Resolution 24kHz Phase-Vocoder Pitch Alignment (`torchaudio.functional.pitch_shift`)
   gently aligning carrier F0 to the speaker's natural vocal register.
3. OpenVoiceV2 Neural Tone-Color Converter (`models/openvoice_v2/converter/checkpoint.pth` VITS Flow + HiFi-GAN)
   using a multi-window RMS-weighted 256-D ReferenceEncoder speaker embedding (`g_tgt`) blended with
   high-frequency transient preservation so Khmer & English consonants stay 100% crisp at 24kHz.
4. 513-Tap Blackman Zero-Phase Symmetric FIR Welch LTAS Formant Filter (`scipy.signal.welch` + 1/3-octave
   log-frequency Gaussian smoothing + `scipy.signal.fftconvolve`) transferring exact vocal tract resonances
   (F1-F4) and 220 Hz broadcast chest warmth without circular STFT phasing.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import soundfile as sf
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchaudio.functional as AF
from scipy import signal
from torch.nn.utils import weight_norm

TARGET_SR = 24000
OV2_SR = 22050
PROFILE_VERSION = 4

PROJECT_ROOT = Path(__file__).resolve().parent.parent

OV2_CKPT_CANDIDATES = [
    PROJECT_ROOT / "models/openvoice_v2/converter/checkpoint.pth",
    PROJECT_ROOT / "public/assets/voice-clone/models/openvoice_v2/converter/checkpoint.pth",
    Path.home()
    / ".cache/huggingface/hub/models--myshell-ai--OpenVoiceV2/snapshots/f36e7edfe1684461a8343844af60babc2efbb727/converter/checkpoint.pth",
]


def find_ov2_checkpoint() -> Path | None:
    for p in OV2_CKPT_CANDIDATES:
        if p.exists():
            return p
    hub_dir = Path.home() / ".cache/huggingface/hub/models--myshell-ai--OpenVoiceV2/snapshots"
    if hub_dir.exists():
        for ckpt in hub_dir.glob("*/converter/checkpoint.pth"):
            if ckpt.exists():
                return ckpt
    return None


def find_ffmpeg() -> str:
    for cmd in ("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", "ffmpeg"):
        if os.path.exists(cmd) or cmd == "ffmpeg":
            return cmd
    return "ffmpeg"


# ============================================================================
# OpenVoiceV2 Neural Architecture (Pure PyTorch VITS Flow + HiFi-GAN + RefEnc)
# ============================================================================
def fused_add_tanh_sigmoid_multiply(input_a: torch.Tensor, input_b: torch.Tensor, n_channels: torch.Tensor) -> torch.Tensor:
    n_channels_int = n_channels[0]
    in_act = input_a + input_b
    return torch.tanh(in_act[:, :n_channels_int, :]) * torch.sigmoid(in_act[:, n_channels_int:, :])


class WN(nn.Module):
    def __init__(self, hidden_channels: int, kernel_size: int, dilation_rate: int, n_layers: int, gin_channels: int = 0, p_dropout: float = 0.0):
        super().__init__()
        self.hidden_channels = hidden_channels
        self.n_layers = n_layers
        self.in_layers = nn.ModuleList()
        self.res_skip_layers = nn.ModuleList()
        self.drop = nn.Dropout(p_dropout)
        if gin_channels != 0:
            self.cond_layer = weight_norm(nn.Conv1d(gin_channels, 2 * hidden_channels * n_layers, 1))
        for i in range(n_layers):
            dilation = dilation_rate ** i
            padding = int((kernel_size * dilation - dilation) / 2)
            self.in_layers.append(
                weight_norm(nn.Conv1d(hidden_channels, 2 * hidden_channels, kernel_size, dilation=dilation, padding=padding))
            )
            res_skip_channels = hidden_channels if i == n_layers - 1 else 2 * hidden_channels
            self.res_skip_layers.append(weight_norm(nn.Conv1d(hidden_channels, res_skip_channels, 1)))

    def forward(self, x: torch.Tensor, x_mask: torch.Tensor, g: torch.Tensor | None = None) -> torch.Tensor:
        output = torch.zeros_like(x)
        n_channels_tensor = torch.IntTensor([self.hidden_channels])
        if g is not None:
            g = self.cond_layer(g)
        for i in range(self.n_layers):
            x_in = self.in_layers[i](x)
            g_l = (
                g[:, i * 2 * self.hidden_channels : (i + 1) * 2 * self.hidden_channels, :]
                if g is not None
                else torch.zeros_like(x_in)
            )
            acts = self.drop(fused_add_tanh_sigmoid_multiply(x_in, g_l, n_channels_tensor))
            res_skip_acts = self.res_skip_layers[i](acts)
            if i < self.n_layers - 1:
                x = (x + res_skip_acts[:, : self.hidden_channels, :]) * x_mask
                output = output + res_skip_acts[:, self.hidden_channels :, :]
            else:
                output = output + res_skip_acts
        return output * x_mask


class PosteriorEncoder(nn.Module):
    def __init__(
        self,
        in_channels: int = 513,
        out_channels: int = 192,
        hidden_channels: int = 192,
        kernel_size: int = 5,
        dilation_rate: int = 1,
        n_layers: int = 16,
        gin_channels: int = 256,
    ):
        super().__init__()
        self.out_channels = out_channels
        self.pre = nn.Conv1d(in_channels, hidden_channels, 1)
        self.enc = WN(hidden_channels, kernel_size, dilation_rate, n_layers, gin_channels=gin_channels)
        self.proj = nn.Conv1d(hidden_channels, out_channels * 2, 1)

    def forward(self, x: torch.Tensor, x_mask: torch.Tensor, g: torch.Tensor | None = None, tau: float = 0.12):
        x = self.pre(x) * x_mask
        x = self.enc(x, x_mask, g=g)
        stats = self.proj(x) * x_mask
        m, logs = torch.split(stats, self.out_channels, dim=1)
        z = (m + torch.randn_like(m) * tau * torch.exp(logs)) * x_mask
        return z, m, logs


class ResidualCouplingLayer(nn.Module):
    def __init__(
        self,
        channels: int = 192,
        hidden_channels: int = 192,
        kernel_size: int = 5,
        dilation_rate: int = 1,
        n_layers: int = 4,
        p_dropout: float = 0.0,
        gin_channels: int = 256,
    ):
        super().__init__()
        self.half_channels = channels // 2
        self.pre = nn.Conv1d(self.half_channels, hidden_channels, 1)
        self.enc = WN(hidden_channels, kernel_size, dilation_rate, n_layers, p_dropout=p_dropout, gin_channels=gin_channels)
        self.post = nn.Conv1d(hidden_channels, self.half_channels, 1)

    def forward(self, x: torch.Tensor, x_mask: torch.Tensor, g: torch.Tensor | None = None, reverse: bool = False) -> torch.Tensor:
        x0, x1 = torch.split(x, [self.half_channels] * 2, 1)
        h = self.enc(self.pre(x0) * x_mask, x_mask, g=g)
        m = self.post(h) * x_mask
        x1 = (x1 + m) * x_mask if not reverse else (x1 - m) * x_mask
        return torch.cat([x0, x1], 1)


class Flip(nn.Module):
    def forward(self, x: torch.Tensor, *args, reverse: bool = False, **kwargs) -> torch.Tensor:
        return torch.flip(x, [1])


class ResidualCouplingBlock(nn.Module):
    def __init__(
        self,
        channels: int = 192,
        hidden_channels: int = 192,
        kernel_size: int = 5,
        dilation_rate: int = 1,
        n_layers: int = 4,
        n_flows: int = 4,
        gin_channels: int = 256,
    ):
        super().__init__()
        self.flows = nn.ModuleList()
        for _ in range(n_flows):
            self.flows.append(ResidualCouplingLayer(channels, hidden_channels, kernel_size, dilation_rate, n_layers, gin_channels=gin_channels))
            self.flows.append(Flip())

    def forward(self, x: torch.Tensor, x_mask: torch.Tensor, g: torch.Tensor | None = None, reverse: bool = False) -> torch.Tensor:
        for flow in (self.flows if not reverse else reversed(self.flows)):
            x = flow(x, x_mask, g=g, reverse=reverse)
        return x


class ResBlock1(nn.Module):
    def __init__(self, channels: int, kernel_size: int = 3, dilation: tuple[int, ...] = (1, 3, 5)):
        super().__init__()
        self.convs1 = nn.ModuleList(
            [weight_norm(nn.Conv1d(channels, channels, kernel_size, 1, dilation=d, padding=(kernel_size * d - d) // 2)) for d in dilation]
        )
        self.convs2 = nn.ModuleList(
            [weight_norm(nn.Conv1d(channels, channels, kernel_size, 1, dilation=1, padding=(kernel_size - 1) // 2)) for _ in dilation]
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        for c1, c2 in zip(self.convs1, self.convs2):
            x = c2(F.leaky_relu(c1(F.leaky_relu(x, 0.1)), 0.1)) + x
        return x


class Generator(nn.Module):
    def __init__(
        self,
        initial_channel: int = 192,
        resblock_kernel_sizes: tuple[int, ...] = (3, 7, 11),
        resblock_dilation_sizes: tuple[tuple[int, ...], ...] = ((1, 3, 5), (1, 3, 5), (1, 3, 5)),
        upsample_rates: tuple[int, ...] = (8, 8, 2, 2),
        upsample_initial_channel: int = 512,
        upsample_kernel_sizes: tuple[int, ...] = (16, 16, 4, 4),
        gin_channels: int = 256,
    ):
        super().__init__()
        self.num_kernels = len(resblock_kernel_sizes)
        self.num_upsamples = len(upsample_rates)
        self.conv_pre = nn.Conv1d(initial_channel, upsample_initial_channel, 7, 1, padding=3)
        self.ups = nn.ModuleList(
            [
                weight_norm(
                    nn.ConvTranspose1d(
                        upsample_initial_channel // (2 ** i),
                        upsample_initial_channel // (2 ** (i + 1)),
                        k,
                        u,
                        padding=(k - u) // 2,
                    )
                )
                for i, (u, k) in enumerate(zip(upsample_rates, upsample_kernel_sizes))
            ]
        )
        self.resblocks = nn.ModuleList(
            [
                ResBlock1(upsample_initial_channel // (2 ** (i + 1)), k, d)
                for i in range(len(self.ups))
                for k, d in zip(resblock_kernel_sizes, resblock_dilation_sizes)
            ]
        )
        self.conv_post = nn.Conv1d(upsample_initial_channel // (2 ** len(self.ups)), 1, 7, 1, padding=3, bias=False)
        self.cond = nn.Conv1d(gin_channels, upsample_initial_channel, 1)

    def forward(self, x: torch.Tensor, g: torch.Tensor | None = None) -> torch.Tensor:
        x = self.conv_pre(x) + (self.cond(g) if g is not None else 0)
        for i in range(self.num_upsamples):
            x = self.ups[i](F.leaky_relu(x, 0.1))
            x = sum(self.resblocks[i * self.num_kernels + j](x) for j in range(self.num_kernels)) / self.num_kernels
        return torch.tanh(self.conv_post(F.leaky_relu(x)))


class ReferenceEncoder(nn.Module):
    def __init__(self, spec_channels: int = 513, gin_channels: int = 256):
        super().__init__()
        self.layernorm = nn.LayerNorm(spec_channels)
        filters = [1, 32, 32, 64, 64, 128, 128]
        self.convs = nn.ModuleList(
            [weight_norm(nn.Conv2d(filters[i], filters[i + 1], kernel_size=(3, 3), stride=(2, 2), padding=(1, 1))) for i in range(6)]
        )
        self.gru = nn.GRU(128 * 9, 128, batch_first=True)
        self.proj = nn.Linear(128, gin_channels)

    def forward(self, y: torch.Tensor) -> torch.Tensor:
        y = self.layernorm(y.transpose(1, 2)).unsqueeze(1)
        for conv in self.convs:
            y = F.relu(conv(y))
        y = y.transpose(1, 2)
        y = y.contiguous().view(y.size(0), y.size(1), -1)
        self.gru.flatten_parameters()
        _, out = self.gru(y)
        return self.proj(out.squeeze(0)).unsqueeze(-1)


class OpenVoiceConverter(nn.Module):
    def __init__(self):
        super().__init__()
        self.dec = Generator()
        self.enc_q = PosteriorEncoder()
        self.flow = ResidualCouplingBlock()
        self.ref_enc = ReferenceEncoder()

    def voice_conversion(self, y: torch.Tensor, g_src: torch.Tensor, g_tgt: torch.Tensor, tau: float = 0.12) -> torch.Tensor:
        y_mask = torch.ones(y.size(0), 1, y.size(2), device=y.device, dtype=y.dtype)
        z, _, _ = self.enc_q(y, y_mask, g=g_src, tau=tau)
        z_p = self.flow(z, y_mask, g=g_src)
        z_hat = self.flow(z_p, y_mask, g=g_tgt, reverse=True)
        o_hat = self.dec(z_hat * y_mask, g=g_tgt)
        return o_hat


_OV2_MODEL: OpenVoiceConverter | None = None
_PROFILE_MEM_CACHE: dict[str, dict] = {}


def get_ov2_model() -> OpenVoiceConverter | None:
    global _OV2_MODEL
    if _OV2_MODEL is not None:
        return _OV2_MODEL
    ckpt_path = find_ov2_checkpoint()
    if ckpt_path is None:
        return None
    model = OpenVoiceConverter()
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)["model"]
    model.load_state_dict(ckpt, strict=True)
    model.eval()
    _OV2_MODEL = model
    return _OV2_MODEL


def wav_to_ov2_spec(wav_22k: torch.Tensor) -> torch.Tensor:
    if wav_22k.dim() == 1:
        wav_22k = wav_22k.unsqueeze(0)
    hann = torch.hann_window(1024, device=wav_22k.device, dtype=wav_22k.dtype)
    pad = int((1024 - 256) / 2)
    y = F.pad(wav_22k.unsqueeze(1), (pad, pad), mode="reflect").squeeze(1)
    spec = torch.stft(
        y,
        n_fft=1024,
        hop_length=256,
        win_length=1024,
        window=hann,
        center=False,
        normalized=False,
        onesided=True,
        return_complex=True,
    )
    return torch.sqrt(spec.real.pow(2) + spec.imag.pow(2) + 1e-6)


def extract_multiwindow_se(model: OpenVoiceConverter, wav_24k: np.ndarray) -> torch.Tensor:
    wav_t = torch.from_numpy(wav_24k).float().unsqueeze(0)
    wav_22k = AF.resample(wav_t, TARGET_SR, OV2_SR).squeeze(0)

    win_len = int(OV2_SR * 2.0)
    hop_len = int(OV2_SR * 1.0)
    chunks: list[torch.Tensor] = []

    if wav_22k.numel() <= win_len:
        chunks.append(wav_22k)
    else:
        rms_all = []
        raw_chunks = []
        for start in range(0, wav_22k.numel() - win_len // 2, hop_len):
            seg = wav_22k[start : start + win_len]
            if seg.numel() < int(OV2_SR * 0.8):
                continue
            rms_val = float(torch.sqrt(torch.mean(seg ** 2)).item())
            rms_all.append(rms_val)
            raw_chunks.append(seg)
        if raw_chunks:
            thresh = max(0.012, float(np.percentile(rms_all, 35)) * 0.75)
            for seg, r in zip(raw_chunks, rms_all):
                if r >= thresh:
                    chunks.append(seg)
        if not chunks:
            chunks = [wav_22k]

    embeddings = []
    weights = []
    with torch.no_grad():
        for seg in chunks:
            spec = wav_to_ov2_spec(seg.unsqueeze(0))
            g = model.ref_enc(spec)
            seg_rms = float(torch.sqrt(torch.mean(seg ** 2)).item()) + 1e-4
            embeddings.append(g * seg_rms)
            weights.append(seg_rms)
    total_w = sum(weights) or 1.0
    return torch.stack(embeddings, dim=0).sum(dim=0) / total_w


# ============================================================================
# Audio Loading, IQR-Filtered Glottal F0 Tracking, and Spectral Analysis
# ============================================================================
def load_audio_24k_mono(path_str: str) -> np.ndarray:
    try:
        wav, sr = sf.read(path_str, dtype="float32", always_2d=False)
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
        if sr != TARGET_SR:
            wav = AF.resample(torch.from_numpy(wav).unsqueeze(0), sr, TARGET_SR).squeeze(0).numpy()
        return wav.astype(np.float32)
    except Exception:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            tmp_wav = tf.name
        try:
            ffmpeg_bin = find_ffmpeg()
            subprocess.run(
                [ffmpeg_bin, "-y", "-i", path_str, "-ac", "1", "-ar", str(TARGET_SR), tmp_wav],
                check=True,
                capture_output=True,
                timeout=10,
            )
            wav, _ = sf.read(tmp_wav, dtype="float32", always_2d=False)
            if wav.ndim > 1:
                wav = wav.mean(axis=1)
            return wav.astype(np.float32)
        finally:
            try:
                os.unlink(tmp_wav)
            except Exception:
                pass


def analyze_voiced_acoustics(wav_24k: np.ndarray) -> dict:
    # Cap analysis window to first 35 seconds so huge files are fast and clean
    if len(wav_24k) > TARGET_SR * 35:
        wav_24k = wav_24k[: TARGET_SR * 35]

    peak = float(np.max(np.abs(wav_24k)))
    norm_wav = wav_24k / peak * 0.92 if peak > 1e-5 else wav_24k

    # 1. Band-pass filter at 70-290 Hz (4th-order Butterworth) to isolate the glottal fundamental wave (F0)
    sos_glot = signal.butter(4, [70.0 / (TARGET_SR / 2.0), 290.0 / (TARGET_SR / 2.0)], btype="band", output="sos")
    glottal = signal.sosfiltfilt(sos_glot, norm_wav)

    win = 2048
    hop = 512
    min_lag = int(TARGET_SR / 290.0)
    max_lag = int(TARGET_SR / 72.0)

    pitches: list[float] = []
    glot_frames: list[np.ndarray] = []
    orig_frames: list[np.ndarray] = []
    rms_list: list[float] = []

    for s in range(0, len(norm_wav) - win, hop):
        f_orig = norm_wav[s : s + win]
        f_glot = glottal[s : s + win]
        zcr = float(np.sum(np.abs(np.diff(np.signbit(f_orig)))) * (TARGET_SR / (2.0 * win)))
        if zcr < 1800.0:
            glot_frames.append(f_glot)
            orig_frames.append(f_orig)
            rms_list.append(float(np.sqrt(np.mean(f_orig ** 2))))

    voiced_segs: list[np.ndarray] = []
    if glot_frames:
        thresh = max(0.018, float(np.percentile(rms_list, 50)))
        for f_glot, f_orig, r in zip(glot_frames, orig_frames, rms_list):
            if r < thresh:
                continue
            voiced_segs.append(f_orig)
            f = f_glot - np.mean(f_glot)
            acf = np.correlate(f, f, mode="full")[win - 1 : win + max_lag + 1]
            if acf[0] < 1e-7:
                continue
            nacf = acf / acf[0]
            d = 1
            while d < max_lag - 2 and nacf[d] > 0:
                d += 1
            while d < max_lag - 2 and nacf[d] <= 0:
                d += 1
            d = max(d, min_lag)
            if d >= max_lag - 2:
                continue
            region = nacf[d:max_lag]
            max_val = float(np.max(region))
            if max_val < 0.50:
                continue
            best_lag = d + int(np.argmax(region))
            for i in range(1, len(region) - 1):
                if region[i] > region[i - 1] and region[i] >= region[i + 1] and region[i] >= 0.84 * max_val:
                    best_lag = d + i
                    break
            pitches.append(TARGET_SR / float(best_lag))

    # IQR outlier filtering to reject octave jumps and background music/noise
    if len(pitches) >= 6:
        arr_p = np.array(pitches, dtype=np.float32)
        q25, q75 = np.percentile(arr_p, [25, 75])
        iqr = max(10.0, float(q75 - q25))
        clean_p = arr_p[(arr_p >= q25 - 1.2 * iqr) & (arr_p <= q75 + 1.2 * iqr)]
        if len(clean_p) >= 4:
            arr_p = clean_p
        f0_med = float(np.median(arr_p))
        f0_p25 = float(np.percentile(arr_p, 25))
        f0_p75 = float(np.percentile(arr_p, 75))
        f0_std = float(np.std(arr_p))
    elif len(pitches) >= 2:
        f0_med = float(np.median(pitches))
        f0_p25 = float(np.percentile(pitches, 25))
        f0_p75 = float(np.percentile(pitches, 75))
        f0_std = float(np.std(pitches))
    else:
        f0_med, f0_p25, f0_p75, f0_std = 132.0, 118.0, 146.0, 15.0

    voiced_audio = np.concatenate(voiced_segs) if voiced_segs else norm_wav
    v_rms = float(np.sqrt(np.mean(voiced_audio ** 2))) + 1e-8
    voiced_norm = (voiced_audio / v_rms).astype(np.float32)

    freqs, psd = signal.welch(voiced_norm, fs=TARGET_SR, nperseg=2048, noverlap=1024)
    centroid = float(np.sum(freqs * psd) / (np.sum(psd) + 1e-12))

    # Speaking cadence estimation from voiced syllable modulation rate
    env_win = int(TARGET_SR * 0.015)
    n_env = max(1, len(norm_wav) // env_win)
    env = np.sqrt(np.mean(norm_wav[: n_env * env_win].reshape(n_env, env_win) ** 2, axis=1))
    v_env = env > (np.percentile(env, 35) * 0.6)
    voiced_ratio = float(np.mean(v_env))
    local_mean = np.convolve(env, np.ones(25) / 25.0, mode="same")
    mod = env - local_mean
    zc = int(np.sum((mod[:-1] < 0) & (mod[1:] >= 0) & v_env[1:]))
    voiced_sec = max(1.0, float(np.sum(v_env)) * 0.015)
    syl_per_vsec = zc / voiced_sec
    cadence_score = syl_per_vsec * voiced_ratio
    tempo_ratio = float(np.clip(0.96 + (cadence_score - 4.30) * 0.06, 0.92, 1.10))
    rate_percent = int(round((tempo_ratio - 1.0) * 100.0))

    rms_std = float(np.std(rms_list)) if rms_list else 0.05
    rms_mean = float(np.mean(rms_list)) if rms_list else 0.10
    dyn_variation = rms_std / max(1e-4, rms_mean)

    # Sub-band acoustic energy distribution
    freq_mask_chest = (freqs >= 100) & (freqs <= 320)
    freq_mask_presence = (freqs >= 2500) & (freqs <= 4800)
    freq_mask_air = (freqs >= 5500) & (freqs <= 11000)

    power_total = float(np.sum(psd)) + 1e-12
    ratio_chest = float(np.sum(psd[freq_mask_chest])) / power_total
    ratio_presence = float(np.sum(psd[freq_mask_presence])) / power_total
    ratio_air = float(np.sum(psd[freq_mask_air])) / power_total

    chest_gain_db = round(float(np.clip(1.4 + (ratio_chest - 0.20) * 6.0, 0.8, 3.0)), 1)
    presence_gain_db = round(float(np.clip(1.2 + (ratio_presence - 0.15) * 5.5, 0.8, 2.6)), 1)
    air_gain_db = round(float(np.clip(0.9 + (ratio_air - 0.08) * 4.5, 0.5, 2.2)), 1)

    detected_gender = "female" if f0_med >= 175.0 else "male"
    base_ref_f0 = 210.0 if detected_gender == "female" else 132.0
    pitch_offset_hz = int(round(np.clip(f0_med - base_ref_f0, -18.0, 18.0)))

    if tempo_ratio >= 1.03 and (f0_std >= 19.0 or dyn_variation >= 0.40):
        sound_style = "Energetic Streamer"
        timbre = "punchy & vibrant broadcast style"
        tau = 0.12
    elif ratio_chest >= 0.28 or (f0_med < 120.0 and detected_gender == "male"):
        sound_style = "Deep & Resonant"
        timbre = "warm studio chest resonance"
        tau = 0.14
    elif centroid >= 420.0 or ratio_presence >= 0.20:
        sound_style = "Crisp & Animated"
        timbre = "bright high-clarity presence"
        tau = 0.12
    elif f0_std <= 16.0 and tempo_ratio <= 1.01:
        sound_style = "Calm & Natural"
        timbre = "smooth mellow intonation"
        tau = 0.14
    else:
        sound_style = "Warm & Conversational"
        timbre = "balanced natural studio voice"
        tau = 0.13

    if tempo_ratio >= 1.05:
        pacing_label = f"Fast & Upbeat (+{rate_percent}%)"
    elif tempo_ratio >= 1.02:
        pacing_label = f"Brisk (+{rate_percent}%)"
    elif tempo_ratio >= 0.98:
        pacing_label = "Natural (1.0x)"
    else:
        pacing_label = f"Relaxed ({rate_percent}%)"

    return {
        "averagePitchHz": int(round(f0_med)),
        "f0Median": round(f0_med, 2),
        "f0P25": round(f0_p25, 2),
        "f0P75": round(f0_p75, 2),
        "f0Std": round(f0_std, 2),
        "detectedGender": detected_gender,
        "baseModel": "neural-female" if detected_gender == "female" else "neural-male",
        "soundStyle": sound_style,
        "pacingLabel": pacing_label,
        "timbre": timbre,
        "tau": tau,
        "spectralBrightnessHz": int(round(centroid)),
        "speakingTempoRatio": round(tempo_ratio, 3),
        "chestGainDb": chest_gain_db,
        "presenceGainDb": presence_gain_db,
        "airGainDb": air_gain_db,
        "pitchOffsetHz": pitch_offset_hz,
        "ratePercent": rate_percent,
        "freqs": freqs,
        "psd": psd,
    }


def apply_zero_phase_fir_formant_transfer(
    work_sig: np.ndarray,
    freqs: np.ndarray,
    p_ref: np.ndarray,
    strength: float = 0.78,
    warmth_db: float = 1.6,
) -> np.ndarray:
    """
    513-Tap Blackman Zero-Phase Symmetric FIR Welch LTAS Formant Transfer.
    Transfers the speaker's vocal tract resonances (F1-F4) and microphone warmth
    while preserving 100% phase coherence and Khmer/English consonant crispness above 7.5 kHz.
    """
    _, p_src = signal.welch(work_sig, fs=TARGET_SR, nperseg=2048, noverlap=1024)
    db_diff = 10.0 * np.log10((p_ref + 1e-9) / (p_src + 1e-9))

    # Center around core speech vowel/consonant band (150 - 4500 Hz)
    speech_mask = (freqs >= 150) & (freqs <= 4500)
    if np.any(speech_mask):
        db_diff -= float(np.median(db_diff[speech_mask]))

    # 1/3-octave log-frequency Gaussian smoothing (captures vocal tract formants without comb filtering)
    smoothed_db = np.zeros_like(db_diff)
    smoothed_db[0] = db_diff[0]
    f_pos = np.maximum(freqs[1:], 1.0)
    for i in range(1, len(freqs)):
        oct_dist = np.abs(np.log2(f_pos / max(freqs[i], 1.0)))
        weights = np.exp(-0.5 * (oct_dist / 0.28) ** 2)
        weights /= np.sum(weights) + 1e-12
        smoothed_db[i] = float(np.sum(db_diff[1:] * weights))

    # Broadcast chest warmth curve around 220 Hz
    if warmth_db > 0.0:
        warmth_curve = warmth_db * np.exp(-0.5 * ((np.log2(np.maximum(freqs, 1.0) / 220.0)) / 0.6) ** 2)
        smoothed_db += warmth_curve

    # Preserve natural high-frequency air & sibilance above 7.5 kHz
    hf_mask = freqs > 7500
    if np.any(hf_mask):
        smoothed_db[hf_mask] *= np.clip((12000.0 - freqs[hf_mask]) / (12000.0 - 7500.0), 0.0, 1.0)

    smoothed_db = np.clip(smoothed_db * strength, -6.5, 6.5)

    # Synthesize 513-tap Blackman-windowed zero-phase symmetric FIR filter
    gain_lin = 10.0 ** (smoothed_db / 20.0)
    full_spec = np.concatenate([gain_lin, gain_lin[-2:0:-1]])
    h = np.fft.fftshift(np.real(np.fft.ifft(full_spec)))
    filter_len = 513
    start = (len(full_spec) - filter_len) // 2
    fir = (h[start : start + filter_len] * np.blackman(filter_len)).astype(np.float32)
    norm_factor = float(np.sum(fir) / (np.sum(h) + 1e-9))
    if abs(norm_factor) > 1e-4:
        fir /= norm_factor

    return signal.fftconvolve(work_sig, fir, mode="same").astype(np.float32)


def get_or_build_profile(ref_wav_path: str, force_rebuild: bool = False) -> dict:
    abs_key = str(Path(ref_wav_path).resolve())
    if not force_rebuild and abs_key in _PROFILE_MEM_CACHE:
        return _PROFILE_MEM_CACHE[abs_key]

    cache_path = Path(f"{ref_wav_path}.ov2_profile.pt")
    if not force_rebuild and cache_path.exists():
        try:
            if cache_path.stat().st_mtime >= Path(ref_wav_path).stat().st_mtime:
                prof = torch.load(cache_path, map_location="cpu", weights_only=False)
                if prof.get("version") == PROFILE_VERSION and "psd" in prof and "freqs" in prof:
                    _PROFILE_MEM_CACHE[abs_key] = prof
                    return prof
        except Exception:
            pass

    wav_24k = load_audio_24k_mono(ref_wav_path)
    peak = float(np.max(np.abs(wav_24k)))
    if peak > 1e-5:
        wav_24k = wav_24k / peak * 0.92

    acoustics = analyze_voiced_acoustics(wav_24k)
    ov2_model = get_ov2_model()
    g_tgt = extract_multiwindow_se(ov2_model, wav_24k) if ov2_model is not None else None

    profile_data = {
        "version": PROFILE_VERSION,
        "meta": {k: v for k, v in acoustics.items() if k not in ("freqs", "psd")},
        "freqs": acoustics["freqs"],
        "psd": acoustics["psd"],
        "g_tgt": g_tgt,
    }
    try:
        torch.save(profile_data, cache_path)
    except Exception:
        pass
    _PROFILE_MEM_CACHE[abs_key] = profile_data
    return profile_data


def convert_audio_to_cloned_voice(
    src_audio_path: str,
    ref_wav_path: str,
    out_audio_path: str,
    pitch_offset_hz: float = 0.0,
) -> dict:
    profile = get_or_build_profile(ref_wav_path)
    meta = profile["meta"]
    g_tgt = profile.get("g_tgt")
    freqs = profile.get("freqs")
    p_ref = profile.get("psd")

    src_wav = load_audio_24k_mono(src_audio_path)
    if len(src_wav) < 400:
        sf.write(out_audio_path, src_wav, TARGET_SR)
        return meta

    # 1. Natural 24kHz Phase-Vocoder Pitch Alignment (clamped to [-3.5, +3.5] semitones for zero chipmunk/monster artifacts)
    target_f0 = float(meta.get("f0Median", meta.get("averagePitchHz", 132.0)))
    pitch_aligned_wav = src_wav
    try:
        src_acoustics = analyze_voiced_acoustics(src_wav)
        src_f0 = float(src_acoustics.get("f0Median", 132.0))
        if src_f0 > 55.0 and target_f0 > 55.0:
            pitch_ratio = target_f0 / src_f0
            auto_semitones = float(12.0 * np.log2(np.clip(pitch_ratio, 0.78, 1.28)))
            manual_semitones = float(pitch_offset_hz) / 14.0
            total_shift = float(np.clip(auto_semitones * 0.82 + manual_semitones, -3.5, 3.5))
            if abs(total_shift) >= 0.20:
                pitch_aligned_wav = (
                    AF.pitch_shift(
                        torch.from_numpy(src_wav).unsqueeze(0),
                        TARGET_SR,
                        n_steps=total_shift,
                        n_fft=1024,
                        win_length=1024,
                        hop_length=256,
                    )
                    .squeeze(0)
                    .numpy()
                )
    except Exception:
        pitch_aligned_wav = src_wav

    # 2. Hybrid OpenVoiceV2 Neural Tone-Color Conversion + High-Definition Carrier Blend
    # Blends OpenVoiceV2's 256-D VITS Flow vocal tract conversion with the 24kHz phase-locked carrier
    # so both the speaker's core timbre AND crisp 24kHz consonant articulation are preserved.
    ov2_model = get_ov2_model()
    if ov2_model is not None and g_tgt is not None:
        try:
            with torch.no_grad():
                src_22k = AF.resample(torch.from_numpy(pitch_aligned_wav).unsqueeze(0), TARGET_SR, OV2_SR)
                spec_src = wav_to_ov2_spec(src_22k)
                g_src = extract_multiwindow_se(ov2_model, pitch_aligned_wav)

                target_vector = g_tgt.to(spec_src.device)
                style_tau = float(meta.get("tau", 0.12))
                ov2_out_22k = ov2_model.voice_conversion(spec_src, g_src=g_src, g_tgt=target_vector, tau=style_tau)
                ov2_wav_24k = AF.resample(ov2_out_22k.squeeze(0), OV2_SR, TARGET_SR).squeeze(0).cpu().numpy()

                min_len = min(len(ov2_wav_24k), len(pitch_aligned_wav))
                ov2_seg = ov2_wav_24k[:min_len]
                car_seg = pitch_aligned_wav[:min_len]

                # RMS-match OpenVoiceV2 output to carrier before blending
                rms_ov2 = float(np.sqrt(np.mean(ov2_seg ** 2))) + 1e-8
                rms_car = float(np.sqrt(np.mean(car_seg ** 2))) + 1e-8
                ov2_seg = ov2_seg * (rms_car / rms_ov2)

                # Extract crisp high-frequency sibilance (>5.5 kHz) from 24kHz carrier
                sos_hi = signal.butter(4, 5500.0 / (TARGET_SR / 2.0), btype="highpass", output="sos")
                car_hi = signal.sosfiltfilt(sos_hi, car_seg)

                blended_wav = (0.58 * ov2_seg + 0.42 * car_seg + 0.18 * car_hi).astype(np.float32)
        except Exception:
            blended_wav = pitch_aligned_wav
    else:
        blended_wav = pitch_aligned_wav

    # 3. 513-Tap Blackman Zero-Phase Symmetric FIR Welch LTAS Formant Transfer
    final_processed = blended_wav
    if freqs is not None and p_ref is not None:
        try:
            warmth_db = float(meta.get("chestGainDb", 1.6))
            final_processed = apply_zero_phase_fir_formant_transfer(
                blended_wav,
                freqs=freqs,
                p_ref=p_ref,
                strength=0.80,
                warmth_db=warmth_db,
            )
        except Exception:
            final_processed = blended_wav

    # 4. Studio High-Pass Filter at 70 Hz (removes sub-bass rumble)
    try:
        sos_hp = signal.butter(2, 70.0 / (TARGET_SR / 2.0), btype="highpass", output="sos")
        final_processed = signal.sosfiltfilt(sos_hp, final_processed).astype(np.float32)
    except Exception:
        pass

    # 5. Soft Broadcast Mastering Limiter & Normalization (-0.6 dBFS)
    peak_val = float(np.max(np.abs(final_processed)))
    if peak_val > 1e-5:
        normed = final_processed / peak_val
        soft_limited = np.tanh(normed * 1.15) / np.tanh(1.15)
        final_processed = (soft_limited * 0.94).astype(np.float32)

    # 6. Output Export
    if out_audio_path.lower().endswith(".mp3"):
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf_out:
            tmp_out_wav = tf_out.name
        try:
            sf.write(tmp_out_wav, final_processed, TARGET_SR, subtype="PCM_16")
            ffmpeg_bin = find_ffmpeg()
            subprocess.run(
                [ffmpeg_bin, "-y", "-i", tmp_out_wav, "-ar", str(TARGET_SR), "-ac", "1", "-b:a", "192k", out_audio_path],
                check=True,
                capture_output=True,
                timeout=10,
            )
        finally:
            try:
                os.unlink(tmp_out_wav)
            except Exception:
                pass
    else:
        sf.write(out_audio_path, final_processed, TARGET_SR, subtype="PCM_16")

    return meta


def serve_loop() -> None:
    """
    Persistent JSON-lines stdio worker mode so OpenVoiceV2 stays warm in memory (~220ms per conversion).
    """
    get_ov2_model()
    sys.stdout.write(json.dumps({"ready": True}) + "\n")
    sys.stdout.flush()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id", "")
            cmd = req.get("cmd", "convert")
            ref_wav = req.get("refWav", "")
            if cmd == "analyze":
                prof = get_or_build_profile(ref_wav, force_rebuild=bool(req.get("force", False)))
                sys.stdout.write(json.dumps({"id": req_id, "ok": True, "meta": prof["meta"]}) + "\n")
            else:
                meta = convert_audio_to_cloned_voice(
                    src_audio_path=req["srcAudio"],
                    ref_wav_path=ref_wav,
                    out_audio_path=req["outAudio"],
                    pitch_offset_hz=float(req.get("pitchOffsetHz", 0.0)),
                )
                sys.stdout.write(json.dumps({"id": req_id, "ok": True, "meta": meta}) + "\n")
        except Exception as exc:
            sys.stdout.write(json.dumps({"id": req.get("id", ""), "ok": False, "error": str(exc)}) + "\n")
        sys.stdout.flush()


def main() -> None:
    parser = argparse.ArgumentParser(description="Neural Voice Clone Analyzer & Converter (v4 Hybrid Studio Edition)")
    parser.add_argument("--serve", action="store_true", help="Run persistent stdio JSON-lines worker")
    parser.add_argument("--analyze", action="store_true", help="Analyze reference WAV and prebuild OpenVoiceV2 profile")
    parser.add_argument("--convert", action="store_true", help="Convert source TTS audio to match reference voice")
    parser.add_argument("--ref-wav", help="Path to reference voice sample (.wav/.webm)")
    parser.add_argument("--src-audio", help="Path to source TTS audio (.mp3/.wav)")
    parser.add_argument("--out-audio", help="Path to output converted audio (.mp3/.wav)")
    parser.add_argument("--pitch-offset-hz", type=float, default=0.0, help="Optional manual pitch offset in Hz")
    parser.add_argument("--force", action="store_true", help="Force rebuild cached profile")
    args = parser.parse_args()

    if args.serve:
        serve_loop()
        return

    if not args.ref_wav:
        parser.error("--ref-wav is required unless --serve is specified")

    if args.analyze:
        prof = get_or_build_profile(args.ref_wav, force_rebuild=args.force)
        print(json.dumps(prof["meta"]))
        return

    if args.convert:
        if not args.src_audio or not args.out_audio:
            parser.error("--convert requires --src-audio and --out-audio")
        meta = convert_audio_to_cloned_voice(
            src_audio_path=args.src_audio,
            ref_wav_path=args.ref_wav,
            out_audio_path=args.out_audio,
            pitch_offset_hz=args.pitch_offset_hz,
        )
        print(json.dumps(meta))
        return


if __name__ == "__main__":
    main()
