#!/usr/bin/env python3
"""
Neural Voice Cloning & Tone-Color Conversion Engine for StreamService.

Pipeline:
1. Band-Passed Glottal Autocorrelation F0 Tracker (65-295 Hz 4th-order Butterworth + ZCR gate)
   to measure exact fundamental frequency (F0) without F1 formant octave errors.
2. FFmpeg WSOLA Pitch & Cadence Pre-Alignment (`asetrate` + `aresample` + `atempo`)
   shifting the base TTS voice's F0 and speaking tempo to match the recorded voice sample.
3. OpenVoiceV2 Neural Tone-Color Converter (`myshell-ai/OpenVoiceV2` VITS Flow + HiFi-GAN)
   using a multi-window 256-D ReferenceEncoder speaker embedding (`g_tgt`) extracted across all
   voiced segments of the streamer's 15-second recorded voice sample.
4. 513-Tap Blackman Linear-Phase FIR Welch LTAS Formant Envelope Filter (`scipy.signal.welch`
   + `scipy.signal.fftconvolve`) transferring the exact vocal tract formant resonances (F1-F4).
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

OV2_CKPT_CANDIDATES = [
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

    def forward(self, x: torch.Tensor, x_mask: torch.Tensor, g: torch.Tensor | None = None, tau: float = 0.15):
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

    def voice_conversion(self, y: torch.Tensor, g_src: torch.Tensor, g_tgt: torch.Tensor, tau: float = 0.15) -> torch.Tensor:
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
    ckpt = torch.load(ckpt_path, map_location="cpu")["model"]
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
            thresh = max(0.01, float(np.percentile(rms_all, 30)) * 0.7)
            for seg, r in zip(raw_chunks, rms_all):
                if r >= thresh:
                    chunks.append(seg)
        if not chunks:
            chunks = [wav_22k]

    embeddings = []
    with torch.no_grad():
        for seg in chunks:
            spec = wav_to_ov2_spec(seg.unsqueeze(0))
            g = model.ref_enc(spec)
            embeddings.append(g)
    return torch.stack(embeddings, dim=0).mean(dim=0)


# ============================================================================
# Audio Loading, Glottal F0 Tracking, and Spectral Analysis
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
    peak = float(np.max(np.abs(wav_24k)))
    norm_wav = wav_24k / peak * 0.92 if peak > 1e-5 else wav_24k

    # 1. Band-pass filter at 65-295 Hz (4th-order Butterworth) to isolate the glottal fundamental wave (F0)
    # and prevent F1 formant oscillations (400-700 Hz) from causing 2nd-harmonic octave errors!
    sos_glot = signal.butter(4, [65.0 / (TARGET_SR / 2.0), 295.0 / (TARGET_SR / 2.0)], btype="band", output="sos")
    glottal = signal.sosfiltfilt(sos_glot, norm_wav)

    win = 2048
    hop = 512
    min_lag = int(TARGET_SR / 295.0)
    max_lag = int(TARGET_SR / 70.0)

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
        thresh = max(0.015, float(np.percentile(rms_list, 48)))
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
            if max_val < 0.45:
                continue
            best_lag = d + int(np.argmax(region))
            for i in range(1, len(region) - 1):
                if region[i] > region[i - 1] and region[i] >= region[i + 1] and region[i] >= 0.82 * max_val:
                    best_lag = d + i
                    break
            pitches.append(TARGET_SR / float(best_lag))

    if len(pitches) >= 4:
        f0_med = float(np.median(pitches))
        f0_p25 = float(np.percentile(pitches, 25))
        f0_p75 = float(np.percentile(pitches, 75))
        f0_std = float(np.std(pitches))
    else:
        f0_med, f0_p25, f0_p75, f0_std = 130.0, 115.0, 145.0, 15.0

    voiced_audio = np.concatenate(voiced_segs) if voiced_segs else norm_wav
    v_rms = float(np.sqrt(np.mean(voiced_audio ** 2))) + 1e-8
    voiced_norm = (voiced_audio / v_rms).astype(np.float32)

    freqs, psd = signal.welch(voiced_norm, fs=TARGET_SR, nperseg=1024, noverlap=512)
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
    tempo_ratio = float(np.clip(0.96 + (cadence_score - 4.35) * 0.075, 0.90, 1.12))

    detected_gender = "female" if f0_med >= 175.0 else "male"
    base_ref_f0 = 210.0 if detected_gender == "female" else 130.0
    pitch_offset_hz = int(round(np.clip(f0_med - base_ref_f0, -30.0, 30.0)))
    rate_percent = int(round((tempo_ratio - 1.0) * 100.0))

    return {
        "averagePitchHz": int(round(f0_med)),
        "f0Median": round(f0_med, 2),
        "f0P25": round(f0_p25, 2),
        "f0P75": round(f0_p75, 2),
        "f0Std": round(f0_std, 2),
        "detectedGender": detected_gender,
        "baseModel": "kiritts-male",
        "spectralBrightnessHz": int(round(centroid)),
        "speakingTempoRatio": round(tempo_ratio, 3),
        "chestGainDb": 2.2 if detected_gender == "male" else 1.2,
        "presenceGainDb": 1.8,
        "airGainDb": 1.2,
        "pitchOffsetHz": pitch_offset_hz,
        "ratePercent": rate_percent,
        "freqs": freqs,
        "psd": psd,
    }


def get_or_build_profile(ref_wav_path: str, force_rebuild: bool = False) -> dict:
    abs_key = str(Path(ref_wav_path).resolve())
    if not force_rebuild and abs_key in _PROFILE_MEM_CACHE:
        return _PROFILE_MEM_CACHE[abs_key]

    cache_path = Path(f"{ref_wav_path}.ov2_profile.pt")
    if not force_rebuild and cache_path.exists():
        try:
            if cache_path.stat().st_mtime >= Path(ref_wav_path).stat().st_mtime:
                prof = torch.load(cache_path, map_location="cpu", weights_only=False)
                if prof.get("version") == 2:
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
        "version": 2,
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
    psd_ref = profile["psd"]
    freqs_ref = profile["freqs"]
    g_tgt = profile.get("g_tgt")

    src_wav = load_audio_24k_mono(src_audio_path)
    if len(src_wav) < 400:
        sf.write(out_audio_path, src_wav, TARGET_SR)
        return meta

    src_acoustics = analyze_voiced_acoustics(src_wav)
    f0_src = float(src_acoustics["f0Median"])
    f0_ref = float(meta["f0Median"]) + float(pitch_offset_hz)
    f0_ref = float(np.clip(f0_ref, 72.0, 290.0))
    tempo_ref = float(meta.get("speakingTempoRatio", 1.0))

    # 1. Exact Glottal F0 Pitch & Cadence Pre-Alignment via FFmpeg WSOLA (`asetrate` + `aresample` + `atempo`)
    pf = float(np.clip(f0_ref / max(70.0, f0_src), 0.62, 1.78))
    tf = float(np.clip((1.0 / pf) * tempo_ref, 0.52, 1.85))

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf_pre:
        pre_wav_path = tf_pre.name

    try:
        ffmpeg_bin = find_ffmpeg()
        subprocess.run(
            [
                ffmpeg_bin,
                "-y",
                "-i",
                src_audio_path,
                "-af",
                f"asetrate=24000*{pf:.5f},aresample=24000,atempo={tf:.5f}",
                "-ar",
                str(TARGET_SR),
                "-ac",
                "1",
                pre_wav_path,
            ],
            check=True,
            capture_output=True,
            timeout=10,
        )
        pre_wav = load_audio_24k_mono(pre_wav_path)
    except Exception:
        pre_wav = src_wav
    finally:
        try:
            os.unlink(pre_wav_path)
        except Exception:
            pass

    # 2. Pure OpenVoiceV2 Neural Tone-Color Conversion (VITS Normalizing Flow + HiFi-GAN)
    ov2_model = get_ov2_model()
    if ov2_model is not None and g_tgt is not None:
        try:
            with torch.no_grad():
                pre_22k = AF.resample(torch.from_numpy(pre_wav).unsqueeze(0), TARGET_SR, OV2_SR)
                spec_src = wav_to_ov2_spec(pre_22k)
                g_src = extract_multiwindow_se(ov2_model, pre_wav)
                # Push speaker tone color 1.30x along (g_tgt - g_src) so client's vocal tract identity strongly dominates
                g_pushed = g_src + 1.30 * (g_tgt - g_src)
                ov2_out_22k = ov2_model.voice_conversion(spec_src, g_src=g_src, g_tgt=g_pushed, tau=0.15)
                ov2_wav_24k = AF.resample(ov2_out_22k.squeeze(0), OV2_SR, TARGET_SR).squeeze(0).numpy()
        except Exception:
            ov2_wav_24k = pre_wav
    else:
        ov2_wav_24k = pre_wav

    # 3. 513-Tap Blackman Linear-Phase FIR Welch LTAS Formant Envelope Filter
    out_acoustics = analyze_voiced_acoustics(ov2_wav_24k)
    psd_out = out_acoustics["psd"]

    k_smooth = np.ones(9) / 9.0
    log_ref = np.convolve(10.0 * np.log10(psd_ref + 1e-10), k_smooth, mode="same")
    log_out = np.convolve(10.0 * np.log10(psd_out + 1e-10), k_smooth, mode="same")

    diff_db = np.clip((log_ref - log_out) * 0.78, -9.5, 9.5)
    diff_db[freqs_ref < 85.0] = 0.0
    diff_db[freqs_ref > 7500.0] *= 0.25

    nyq = TARGET_SR / 2.0
    norm_freqs = np.clip(freqs_ref / nyq, 0.0, 1.0)
    norm_freqs[0] = 0.0
    norm_freqs[-1] = 1.0
    gains = 10.0 ** (diff_db / 20.0)
    gains[-1] = 0.0

    fir = signal.firwin2(513, norm_freqs, gains, window="blackman")
    final_wav = signal.fftconvolve(ov2_wav_24k, fir, mode="same").astype(np.float32)

    # 4. Soft-Knee Broadcast Vocal Compression & Normalization
    rms_val = float(np.sqrt(np.mean(final_wav ** 2))) + 1e-8
    final_wav = final_wav / rms_val * 0.14
    final_wav = np.tanh(final_wav * 1.35) / np.tanh(1.35)
    peak_val = float(np.max(np.abs(final_wav)))
    if peak_val > 1e-5:
        final_wav = (final_wav / peak_val * 0.92).astype(np.float32)

    if out_audio_path.lower().endswith(".mp3"):
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf_out:
            tmp_out_wav = tf_out.name
        try:
            sf.write(tmp_out_wav, final_wav, TARGET_SR, subtype="PCM_16")
            ffmpeg_bin = find_ffmpeg()
            subprocess.run(
                [ffmpeg_bin, "-y", "-i", tmp_out_wav, "-ar", str(TARGET_SR), "-ac", "1", "-b:a", "96k", out_audio_path],
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
        sf.write(out_audio_path, final_wav, TARGET_SR, subtype="PCM_16")

    return meta


def serve_loop() -> None:
    """
    Persistent JSON-lines stdio worker mode so OpenVoiceV2 stays warm in memory (~280ms per conversion).
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
    parser = argparse.ArgumentParser(description="Neural Voice Clone Analyzer & Converter")
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
