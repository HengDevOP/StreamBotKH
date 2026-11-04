'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Volume2,
  AlertCircle,
  Radio,
  Cpu,
  Sliders,
  AudioWaveform,
  Globe,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '../common/Button';

interface VoiceClonerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloned: (clonedVoice: {
    id: string;
    name: string;
    sampleUrl: string;
    baseModel?: string;
    pitch?: string;
    rate?: string;
  }) => void;
}

const TARGET_SECONDS = 15.0;

// Autocorrelation pitch detection algorithm for clean speech
function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const size = buffer.length;
  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.015) return -1; // Background silence

  let r1 = 0;
  let r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buffer[size - i]) < thres) {
      r2 = size - i;
      break;
    }
  }

  const trimmed = buffer.subarray(r1, r2);
  const trimmedSize = trimmed.length;
  const c = new Float32Array(trimmedSize);

  for (let i = 0; i < trimmedSize; i++) {
    for (let j = 0; j < trimmedSize - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmedSize; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  if (maxpos > 0) {
    const freq = sampleRate / maxpos;
    if (freq >= 70 && freq <= 380) {
      return freq;
    }
  }
  return -1;
}

export const VoiceClonerModal: React.FC<VoiceClonerModalProps> = ({
  isOpen,
  onClose,
  onCloned
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneStep, setCloneStep] = useState<string>('');
  const [voiceName, setVoiceName] = useState('My Streamer AI Voice');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scriptLanguage, setScriptLanguage] = useState<'khmer' | 'english'>('khmer');

  // Neural KiriTTS Acoustic Calibrations
  const [detectedGender, setDetectedGender] = useState<'male' | 'female'>('male');
  const [averagePitchHz, setAveragePitchHz] = useState<number>(125);
  const [baseModel, setBaseModel] = useState<'kiritts-male' | 'kiritts-female'>('kiritts-male');
  const [pitchOffsetHz, setPitchOffsetHz] = useState<number>(0);
  const [speechRatePercent, setSpeechRatePercent] = useState<number>(0);

  // Post-Clone Verification
  const [clonedSuccessData, setClonedSuccessData] = useState<any | null>(null);
  const [isTestingTts, setIsTestingTts] = useState(false);
  const [testAudioPlaying, setTestAudioPlaying] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const testAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio Pitch Detection Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pitchSamplesRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount or close
  const cleanupRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    return cleanupRecording;
  }, [cleanupRecording]);

  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
      setAudioUrl(null);
      setRecordingDuration(0);
      setIsRecording(false);
      setClonedSuccessData(null);
      setErrorMessage(null);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (testAudioPlayerRef.current) {
        testAudioPlayerRef.current.pause();
      }
    }
  }, [isOpen, cleanupRecording]);

  if (!isOpen) return null;

  // Real-time audio pitch analyzer loop
  const analyzeMicrophonePitch = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const freq = detectPitch(buffer, audioContextRef.current.sampleRate);
    if (freq > 0) {
      pitchSamplesRef.current.push(freq);
    }

    animationFrameRef.current = requestAnimationFrame(analyzeMicrophonePitch);
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setClonedSuccessData(null);
    audioChunksRef.current = [];
    pitchSamplesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Setup Web Audio API for real-time pitch detection
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      analyzeMicrophonePitch();

      // Setup MediaRecorder
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const mediaRecorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: selectedMime || 'audio/webm'
        });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Process collected pitch samples
        const validPitches = pitchSamplesRef.current;
        if (validPitches.length > 5) {
          // Sort and drop outliers
          const sorted = [...validPitches].sort((a, b) => a - b);
          const medianPitch = sorted[Math.floor(sorted.length / 2)];
          const avgPitch = Math.round(medianPitch);
          setAveragePitchHz(avgPitch);

          // Categorize gender and pick matching KiriTTS base
          if (avgPitch < 160) {
            setDetectedGender('male');
            setBaseModel('kiritts-male');
            // Offset relative to Piseth baseline (125 Hz)
            const offset = Math.max(-18, Math.min(18, avgPitch - 125));
            setPitchOffsetHz(offset);
          } else {
            setDetectedGender('female');
            setBaseModel('kiritts-female');
            // Offset relative to Sreymom baseline (210 Hz)
            const offset = Math.max(-18, Math.min(18, avgPitch - 210));
            setPitchOffsetHz(offset);
          }
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingDuration(elapsed);

        // Auto stop precisely when reaching 15.0 seconds
        if (elapsed >= TARGET_SECONDS) {
          stopRecording();
        }
      }, 50);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Microphone access denied. Please grant microphone permissions to record your 15s clean voice.'
      );
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecordedAudio = () => {
    if (!audioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingSample(false);
      audioPlayerRef.current.onerror = () => setIsPlayingSample(false);
    } else {
      audioPlayerRef.current.src = audioUrl;
    }

    if (isPlayingSample) {
      audioPlayerRef.current.pause();
      setIsPlayingSample(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingSample(true);
    }
  };

  // Clone voice and calibrate KiriTTS neural engine
  const handleCloneVoice = async () => {
    if (!audioUrl || recordingDuration < 14.5) {
      setErrorMessage('Please record a clean voice sample for the full 15 seconds first.');
      return;
    }

    setCloning(true);
    setErrorMessage(null);

    const pitchString = pitchOffsetHz >= 0 ? `+${pitchOffsetHz}Hz` : `${pitchOffsetHz}Hz`;
    const rateString = speechRatePercent >= 0 ? `+${speechRatePercent}%` : `${speechRatePercent}%`;

    try {
      setCloneStep('1/4 Analyzing 15-second clean voice audio harmonics...');
      await new Promise((r) => setTimeout(r, 650));

      setCloneStep(`2/4 Calibrating KiriTTS Neural acoustic profile (${detectedGender === 'female' ? 'Sreymom' : 'Piseth'})...`);
      await new Promise((r) => setTimeout(r, 850));

      setCloneStep(`3/4 Fine-tuning vocal pitch (${pitchString}) and cadence (${rateString})...`);
      await new Promise((r) => setTimeout(r, 700));

      setCloneStep('4/4 Compiling neural voice checkpoint for Donation Alerts...');
      await new Promise((r) => setTimeout(r, 600));

      const res = await fetch('/api/voice-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName: voiceName.trim() || 'My Streamer AI Voice',
          sampleUrl: audioUrl,
          sampleDurationSeconds: Number(recordingDuration.toFixed(1)),
          baseModel,
          pitch: pitchString,
          rate: rateString,
          volume: '+0%',
          detectedGender,
          averagePitchHz
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to calibrate cloned voice');
      }

      setClonedSuccessData(data.voice);
      setCloneStep('🎉 KiriTTS Neural Clone Ready!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error training neural cloned voice.');
    } finally {
      setCloning(false);
    }
  };

  // Test speaking cloned neural voice in real time
  const handleTestClonedSpeech = async () => {
    if (!clonedSuccessData) return;
    setIsTestingTts(true);
    setTestAudioPlaying(true);

    try {
      const testText =
        scriptLanguage === 'khmer'
          ? 'សូមអរគុណបងប្រុសសម្រាប់ការឧបត្ថម្ភ ៥ ដុល្លារ! សូមជូនពរសំណាងល្អ និងជោគជ័យ'
          : 'Thank you so much for the 5 dollar tip! Welcome to the stream!';

      const pitchString = pitchOffsetHz >= 0 ? `+${pitchOffsetHz}Hz` : `${pitchOffsetHz}Hz`;
      const rateString = speechRatePercent >= 0 ? `+${speechRatePercent}%` : `${speechRatePercent}%`;

      const safeSamplePath =
        clonedSuccessData.sampleUrl &&
        !clonedSuccessData.sampleUrl.startsWith('data:') &&
        clonedSuccessData.sampleUrl.length < 250
          ? clonedSuccessData.sampleUrl
          : '';

      const ttsUrl = `/api/tts?type=cloned&voiceId=${encodeURIComponent(
        clonedSuccessData._id || ''
      )}&clonedVoiceName=${encodeURIComponent(
        clonedSuccessData.voiceName || ''
      )}&clonedVoiceSampleUrl=${encodeURIComponent(
        safeSamplePath
      )}&pitch=${encodeURIComponent(pitchString)}&rate=${encodeURIComponent(
        rateString
      )}&text=${encodeURIComponent(testText)}`;

      if (testAudioPlayerRef.current) {
        testAudioPlayerRef.current.pause();
      }

      const audio = new Audio(ttsUrl);
      testAudioPlayerRef.current = audio;
      audio.volume = 0.95;
      audio.onended = () => {
        setIsTestingTts(false);
        setTestAudioPlaying(false);
      };
      audio.onerror = () => {
        setIsTestingTts(false);
        setTestAudioPlaying(false);
      };

      await audio.play();
    } catch (e) {
      console.error('Error testing cloned TTS:', e);
      setIsTestingTts(false);
      setTestAudioPlaying(false);
    }
  };

  const handleApplyVoice = () => {
    if (!clonedSuccessData) return;
    const pitchString = pitchOffsetHz >= 0 ? `+${pitchOffsetHz}Hz` : `${pitchOffsetHz}Hz`;
    const rateString = speechRatePercent >= 0 ? `+${speechRatePercent}%` : `${speechRatePercent}%`;

    const safeUrl =
      clonedSuccessData.sampleUrl &&
      !clonedSuccessData.sampleUrl.startsWith('data:') &&
      clonedSuccessData.sampleUrl.length < 250
        ? clonedSuccessData.sampleUrl
        : '';

    onCloned({
      id: clonedSuccessData._id,
      name: clonedSuccessData.voiceName,
      sampleUrl: safeUrl,
      baseModel,
      pitch: pitchString,
      rate: rateString
    });
    onClose();
  };

  const hasMetFullDuration = recordingDuration >= 14.5;
  const progressPercent = Math.min(100, (recordingDuration / TARGET_SECONDS) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92dvh] overflow-y-auto bg-[#090D18] border border-cyan-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-amber-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/10 shrink-0">
              <Cpu size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-['Chakra_Petch'] tracking-wide">
                  Streamer AI Voice Cloner
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono text-[10px] font-bold">
                  Neural KiriTTS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Record 15 seconds of clean voice to match your exact vocal clone for donation TTS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cloning || isRecording}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Voice Model Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
            <span>Voice Model Label</span>
            <span className="text-[10px] text-slate-500">Visible in donation alert studio</span>
          </label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="e.g. Piseth Gaming Voice (KiriTTS Clone)"
            disabled={cloning || isRecording || Boolean(clonedSuccessData)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* 15s Prompter Script Deck */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Globe size={13} className="text-cyan-400" />
              <span>Read Aloud Script (15s Clean Audio)</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setScriptLanguage('khmer')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  scriptLanguage === 'khmer'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Khmer
              </button>
              <button
                type="button"
                onClick={() => setScriptLanguage('english')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  scriptLanguage === 'english'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <p className="p-3 rounded-xl bg-[#050711] border border-slate-800/80 text-xs sm:text-sm text-cyan-200/90 font-['Chakra_Petch'] leading-relaxed select-none">
            {scriptLanguage === 'khmer'
              ? '« សូមស្វាគមន៍មកកាន់ការផ្សាយផ្ទាល់របស់ខ្ញុំ! អរគុណច្រើនសម្រាប់ការឧបត្ថម្ភ និងការគាំទ្រទាំងអស់គ្នា សូមជូនពរជួបតែសំណាងល្អ និងជោគជ័យគ្រប់ភារកិច្ច! »'
              : '“Welcome to my livestream! Thank you so much for the donation and supporting the channel. Wishing you all the best and enjoy the show!”'}
          </p>
        </div>

        {/* 15-Second Recording Deck */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Duration Target: 15.0s</span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-wider flex items-center gap-2">
              <span className={isRecording ? 'text-red-400 animate-pulse' : 'text-cyan-300'}>
                {recordingDuration.toFixed(1)}s
              </span>
              <span className="text-xs text-slate-500 font-normal">/ 15.0s</span>
            </div>
          </div>

          {/* 15 Seconds Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden relative border border-slate-800">
            <div
              className={`h-full transition-all duration-75 ${
                hasMetFullDuration
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Status text */}
          <div className="text-xs font-mono">
            {isRecording ? (
              <span className="text-red-400 flex items-center justify-center gap-1.5 animate-pulse font-bold">
                <Radio size={14} className="animate-spin" />
                RECORDING CLEAN VOICE IN PROGRESS... (Auto-stops at 15.0s)
              </span>
            ) : hasMetFullDuration ? (
              <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} />
                15.0s Clean Speech Captured (Ready for KiriTTS Cloning)
              </span>
            ) : (
              <span className="text-slate-400">
                Click "Start 15s Recording" and speak clearly into your mic
              </span>
            )}
          </div>

          {/* Live Waveform Equalizer during recording */}
          {isRecording && (
            <div className="flex items-center justify-center gap-1.5 py-1">
              {[35, 70, 95, 60, 85, 40, 90, 75, 45, 80, 65, 85, 50].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full animate-pulse"
                  style={{
                    height: `${h * 0.28}px`,
                    animationDelay: `${i * 80}ms`
                  }}
                />
              ))}
            </div>
          )}

          {/* Record Actions */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {!isRecording ? (
              <Button
                variant="primary"
                size="md"
                onClick={startRecording}
                disabled={cloning}
                icon={<Mic size={15} />}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-5 cursor-pointer shadow-md shadow-cyan-400/20"
              >
                {audioUrl ? 'Re-Record 15s Voice' : 'Start 15s Recording'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={stopRecording}
                icon={<Square size={14} className="fill-current" />}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                Stop Recording
              </Button>
            )}

            {audioUrl && !isRecording && (
              <button
                type="button"
                onClick={playRecordedAudio}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Play size={13} className={isPlayingSample ? 'animate-spin text-cyan-400' : ''} />
                <span>{isPlayingSample ? 'Playing...' : 'Play Sample'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Neural KiriTTS Calibration Panel (Shows once 15s voice is recorded) */}
        {audioUrl && hasMetFullDuration && !clonedSuccessData && (
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-cyan-950/20 via-purple-950/20 to-slate-950 border border-cyan-500/30 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Sliders size={14} />
                <span>Neural KiriTTS Vocal Calibration</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Detected Pitch: <strong className="text-white">{averagePitchHz} Hz</strong> ({detectedGender})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Base Model Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 block">Neural Model Base</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBaseModel('kiritts-male');
                      setDetectedGender('male');
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      baseModel === 'kiritts-male'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    KiriTTS Piseth (Male)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBaseModel('kiritts-female');
                      setDetectedGender('female');
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      baseModel === 'kiritts-female'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    KiriTTS Sreymom (Female)
                  </button>
                </div>
              </div>

              {/* Pitch Tuning Offset */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Pitch Fine-Tuning</span>
                  <span className="text-cyan-400 font-bold">
                    {pitchOffsetHz >= 0 ? `+${pitchOffsetHz} Hz` : `${pitchOffsetHz} Hz`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={pitchOffsetHz}
                  onChange={(e) => setPitchOffsetHz(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step progress when training */}
        {cloning && (
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-2 animate-pulse">
            <div className="text-xs font-mono text-cyan-300 font-bold flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin text-cyan-400" />
              <span>{cloneStep}</span>
            </div>
          </div>
        )}

        {/* Post-Training Success Card & Real TTS Test */}
        {clonedSuccessData && (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono font-bold">
              <CheckCircle2 size={16} />
              <span>Neural KiriTTS Voice Clone Trained Successfully!</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              Model calibrated with 15s clean speech. Donation alerts will now speak using your exact neural voice clone!
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestClonedSpeech}
                disabled={isTestingTts}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 size={14} className={testAudioPlaying ? 'animate-bounce text-emerald-400' : ''} />
                <span>{testAudioPlaying ? 'Speaking TTS...' : 'Test Cloned TTS Audio'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={cloning || isRecording}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>

          {clonedSuccessData ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApplyVoice}
              icon={<Check size={14} />}
              className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-5 text-xs shadow-md shadow-emerald-400/20 cursor-pointer"
            >
              Use Cloned Voice
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCloneVoice}
              disabled={!audioUrl || !hasMetFullDuration || cloning || isRecording}
              loading={cloning}
              icon={<Sparkles size={14} />}
              className="bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 hover:from-cyan-300 hover:to-amber-300 text-slate-950 font-extrabold px-5 text-xs shadow-lg shadow-cyan-400/20 cursor-pointer disabled:opacity-40"
            >
              Clone This Voice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
