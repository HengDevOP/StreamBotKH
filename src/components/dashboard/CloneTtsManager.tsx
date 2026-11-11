'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Check,
  Volume2,
  AlertCircle,
  Radio,
  AudioWaveform,
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  Send,
  Info,
  Lock,
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '../common/Button';

export interface VoiceCloneItem {
  _id?: string;
  id?: string;
  userId: string;
  voiceName: string;
  sampleUrl: string;
  sampleDurationSeconds?: number;
  baseModel?: string;
  pitch?: string;
  rate?: string;
  volume?: string;
  detectedGender?: string;
  averagePitchHz?: number;
  soundStyle?: string;
  pacingLabel?: string;
  timbre?: string;
  f0Std?: number;
  clonedAt?: string | Date;
}

interface CloneTtsManagerProps {
  user: any;
  currentPlan?: 'free' | 'pro' | string;
  isAdmin?: boolean;
  onUpgrade?: () => void;
}

const MIN_SECONDS = 5.0;
const RECOMMENDED_SECONDS = 15.0;
const TARGET_SECONDS = 15.0;
const MAX_VOICES = 3;

const SUGGESTED_SCRIPTS = [
  {
    title: 'Donor Appreciation (English)',
    text: 'Thank you so much for the donation! Your support keeps this stream running and means the world to me. Let’s make today an awesome stream!'
  },
  {
    title: 'Hype Stream Welcome (English)',
    text: 'Hey chat! Welcome in everyone. A massive shoutout to all our supporters, subscribers, and donors today. You guys are truly legendary!'
  },
  {
    title: 'Khmer & English Mixed (Bilingual)',
    text: 'អរគុណច្រើនសម្រាប់ការឧបត្ថម្ភ! Thank you so much for your generous tip. Let’s keep having fun together on stream!'
  }
];

export const CloneTtsManager: React.FC<CloneTtsManagerProps> = ({
  user,
  currentPlan = 'free',
  isAdmin = false,
  onUpgrade
}) => {
  const isProUser = true; // All features unlocked for free plan users

  // Voice list & active alert status
  const [clones, setClones] = useState<VoiceCloneItem[]>([]);
  const [activeVoiceName, setActiveVoiceName] = useState<string | null>(null);
  const [loadingClones, setLoadingClones] = useState<boolean>(true);

  // Training inputs
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('record');
  const [voiceName, setVoiceName] = useState<string>('My Streamer Voice');
  const [selectedScriptIndex, setSelectedScriptIndex] = useState<number>(0);

  // Audio recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);
  const [isPlayingRecordedSample, setIsPlayingRecordedSample] = useState<boolean>(false);


  // UI feedback & training status
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingStep, setTrainingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Testing Cloned Voices: STRICT PER-CARD ISOLATION
  const [voiceTestTexts, setVoiceTestTexts] = useState<Record<string, string>>({});
  const [speakingVoiceId, setSpeakingVoiceId] = useState<string | null>(null);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

  // Refs for recording & audio playback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Single active audio player ref for both raw samples & TTS
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const getVoiceId = (voice: VoiceCloneItem, index?: number): string => {
    return String(voice._id || voice.id || `voice-${index ?? 0}`);
  };

  // Authenticated fetch helper
  const authFetch = useCallback(
    (url: string, init: RequestInit = {}) => {
      const authToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('streamneon_auth_token') ||
            localStorage.getItem('auth_token') ||
            localStorage.getItem('streamneon_token')
          : null;
      const headers = new Headers(init.headers || {});
      if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }
      if (authToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      if (user?.overlayToken && !headers.has('x-streamer-token')) {
        headers.set('x-streamer-token', user.overlayToken);
      }
      return fetch(url, { ...init, headers, credentials: 'include' });
    },
    [user?.overlayToken]
  );

  // Load existing voice clones
  const fetchClones = useCallback(async () => {
    try {
      setLoadingClones(true);
      const token = user?.overlayToken || user?.id || '';
      const query = token ? `?token=${encodeURIComponent(token)}` : '';
      const res = await authFetch(`/api/voice-clone${query}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.voices)) {
        setClones(data.voices);
        if (data.isClonedActive && data.activeClonedVoiceName) {
          setActiveVoiceName(data.activeClonedVoiceName);
        } else if (data.voices.length > 0 && !activeVoiceName) {
          setActiveVoiceName(data.activeClonedVoiceName || null);
        }
      }
    } catch (e) {
      console.error('Error fetching voice clones:', e);
    } finally {
      setLoadingClones(false);
    }
  }, [authFetch, user?.overlayToken, user?.id, activeVoiceName]);

  useEffect(() => {
    fetchClones();
  }, [fetchClones]);

  // Clean stop of any playing audio
  const stopAllAudio = () => {
    if (activeAudioPlayerRef.current) {
      try {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current.currentTime = 0;
      } catch {}
      activeAudioPlayerRef.current = null;
    }
    setSpeakingVoiceId(null);
    setPlayingSampleId(null);
    setIsPlayingRecordedSample(false);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      stopVisualizer();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Visualizer canvas loop (Clean slate style, no neon rainbow)
  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const canvas = canvasRef.current;
      if (!canvas) return;
      if (canvas.clientWidth > 0) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight || 80;
      }
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          const barHeight = Math.max(3, (val / 255) * canvas.height * 0.9);
          // Natural slate-blue calm waveform
          canvasCtx.fillStyle = val > 40 ? '#60a5fa' : '#334155';
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.warn('Could not initialize audio visualizer:', e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Start Recording
  const handleStartRecording = async () => {
    stopAllAudio();
    setErrorMessage(null);
    setRecordedBlob(null);
    setSampleAudioUrl(null);
    setRecordingTime(0);
    setRecordedDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 48000
        }
      });

      startVisualizer(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        stopVisualizer();

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setSampleAudioUrl(url);
      };

      recorder.start(250);
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingTime(elapsed);
        setRecordedDuration(elapsed);
      }, 100);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone permissions in your browser.'
          : 'Could not access microphone: ' + (err.message || 'Unknown error')
      );
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Handle Audio File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopAllAudio();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMessage('Please upload a valid audio file (WAV, MP3, M4A, WebM).');
      return;
    }

    setErrorMessage(null);
    const audioUrl = URL.createObjectURL(file);
    const tempAudio = new Audio(audioUrl);

    tempAudio.onloadedmetadata = () => {
      const dur = tempAudio.duration;
      if (dur < 4.8) {
        setErrorMessage(`Audio file is ${dur.toFixed(1)}s long. Minimum 5 seconds of clean speech is required (5s – 15s or longer).`);
        setRecordedBlob(null);
        setSampleAudioUrl(null);
        return;
      }
      setRecordedBlob(file);
      setRecordedDuration(dur);
      setRecordingTime(dur);
      setSampleAudioUrl(audioUrl);
    };

    tempAudio.onerror = () => {
      setErrorMessage('Could not load audio file. Please try another recording.');
    };
  };

  // Playback the recording in trainer
  const handleTogglePlayRecordedSample = () => {
    if (!sampleAudioUrl) return;

    if (isPlayingRecordedSample) {
      stopAllAudio();
      return;
    }

    stopAllAudio();
    const audio = new Audio(sampleAudioUrl);
    activeAudioPlayerRef.current = audio;
    setIsPlayingRecordedSample(true);

    audio.onended = () => {
      setIsPlayingRecordedSample(false);
      activeAudioPlayerRef.current = null;
    };
    audio.onerror = () => {
      setIsPlayingRecordedSample(false);
      activeAudioPlayerRef.current = null;
    };
    audio.play().catch(() => {
      setIsPlayingRecordedSample(false);
      activeAudioPlayerRef.current = null;
    });
  };

  // Reset recording
  const handleRetake = () => {
    stopAllAudio();
    setRecordedBlob(null);
    setSampleAudioUrl(null);
    setRecordingTime(0);
    setRecordedDuration(0);
    setIsRecording(false);
  };

  // Train AI Voice Model
  const handleTrainVoice = async () => {
    if (!isProUser) {
      onUpgrade?.();
      return;
    }

    if (clones.length >= MAX_VOICES) {
      setErrorMessage(`You have reached the maximum limit of ${MAX_VOICES} cloned voices for the Pro plan. Delete an existing voice to train a new one.`);
      return;
    }

    if (!recordedBlob) {
      setErrorMessage('Please record or upload at least 5 seconds of voice audio.');
      return;
    }

    if (recordedDuration < 4.8) {
      setErrorMessage(`Voice audio is only ${recordedDuration.toFixed(1)}s. At least 5 seconds is required (5s – 15s or longer).`);
      return;
    }

    stopAllAudio();
    setIsTraining(true);
    setTrainingStep('Preparing audio sample for acoustic training...');
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlob);
      });

      const base64Data = await base64Promise;

      setTrainingStep('Analyzing acoustic pitch, cadence, and vocal dynamics...');
      await new Promise((r) => setTimeout(r, 600));

      setTrainingStep('Extracting neural sound style, pacing, and speaking rhythm...');
      await new Promise((r) => setTimeout(r, 600));

      setTrainingStep('Synthesizing custom neural voice model & formant profile...');

      const payload = {
        voiceName: voiceName.trim() || 'My Streamer Voice',
        sampleUrl: base64Data,
        sampleDurationSeconds: Math.round(recordedDuration),
        baseModel: 'auto',
        pitch: '+0Hz',
        rate: '+0%',
        token: user?.overlayToken || user?.id || undefined,
        userId: user?.id || undefined
      };

      const res = await authFetch('/api/voice-clone', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success && data.voice) {
        setSuccessToast(`Voice model "${data.voice.voiceName}" created successfully!`);
        setTimeout(() => setSuccessToast(null), 4000);
        handleRetake();
        await fetchClones();
      } else {
        setErrorMessage(data.error || 'Failed to train AI voice model.');
      }
    } catch (err: any) {
      console.error('Error training voice:', err);
      setErrorMessage(err.message || 'Error communicating with Voice Cloning service.');
    } finally {
      setIsTraining(false);
      setTrainingStep('');
    }
  };

  // Set Voice Model as Active Alert Voice
  const handleSetActiveAlertVoice = async (voice: VoiceCloneItem) => {
    try {
      const res = await authFetch('/api/voice-clone', {
        method: 'POST',
        body: JSON.stringify({
          action: 'set_active_alert_voice',
          voiceName: voice.voiceName,
          sampleUrl: voice.sampleUrl,
          voiceId: voice._id || voice.id,
          token: user?.overlayToken || user?.id || undefined,
          userId: user?.id || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveVoiceName(voice.voiceName);
        setSuccessToast(`"${voice.voiceName}" is now active for donation alerts!`);
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setErrorMessage(data.error || 'Failed to activate voice for donation alerts.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating alert settings.');
    }
  };

  // Reset to default alert voice
  const handleResetDefaultVoice = async () => {
    try {
      const res = await authFetch('/api/voice-clone', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_default_voice',
          token: user?.overlayToken || user?.id || undefined,
          userId: user?.id || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveVoiceName(null);
        setSuccessToast('Donation alerts TTS reset to standard voice.');
        setTimeout(() => setSuccessToast(null), 3500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resetting alert voice.');
    }
  };

  // Delete Voice Clone
  const handleDeleteVoice = async (voice: VoiceCloneItem) => {
    const id = voice._id || voice.id;
    if (!id) return;
    if (!window.confirm(`Delete "${voice.voiceName}"? This action cannot be undone.`)) return;

    stopAllAudio();

    try {
      const token = user?.overlayToken || user?.id || '';
      const query = token ? `&token=${encodeURIComponent(token)}` : '';
      const res = await authFetch(`/api/voice-clone?id=${encodeURIComponent(id)}${query}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (activeVoiceName === voice.voiceName) {
          setActiveVoiceName(null);
        }
        setSuccessToast(`Voice model "${voice.voiceName}" deleted.`);
        setTimeout(() => setSuccessToast(null), 3000);
        await fetchClones();
      } else {
        setErrorMessage(data.error || 'Failed to delete voice model.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error deleting voice.');
    }
  };

  // Play Raw Sample of a saved voice card (Isolated per card)
  const handleTogglePlayCardSample = (voice: VoiceCloneItem, voiceId: string) => {
    if (!voice.sampleUrl) return;

    if (playingSampleId === voiceId) {
      stopAllAudio();
      return;
    }

    stopAllAudio();
    setPlayingSampleId(voiceId);

    const audio = new Audio(voice.sampleUrl);
    activeAudioPlayerRef.current = audio;

    audio.onended = () => {
      setPlayingSampleId(null);
      activeAudioPlayerRef.current = null;
    };
    audio.onerror = () => {
      setPlayingSampleId(null);
      activeAudioPlayerRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingSampleId(null);
      activeAudioPlayerRef.current = null;
    });
  };

  // Test Speech Synthesis Tester (STRICTLY ISOLATED TO THIS SPECIFIC CARD)
  const handleTestSynthesis = async (voice: VoiceCloneItem, voiceId: string) => {
    // If THIS specific card is currently speaking, clicking Speak stops it cleanly
    if (speakingVoiceId === voiceId) {
      stopAllAudio();
      return;
    }

    // Stop whatever else might be playing
    stopAllAudio();
    setSpeakingVoiceId(voiceId);

    try {
      const defaultText = 'Thank you {name} for the $10.00 tip! Have an awesome stream!';
      const userText = voiceTestTexts[voiceId] ?? defaultText;
      const cleanText = userText.replace('{name}', 'CyberSamurai').replace('{amount}', '$10.00');

      const safeSamplePath =
        voice.sampleUrl && !voice.sampleUrl.startsWith('data:') && voice.sampleUrl.length < 250
          ? voice.sampleUrl
          : '';

      const ttsUrl = `/api/tts?type=cloned&clonedVoiceName=${encodeURIComponent(
        voice.voiceName
      )}&clonedVoiceSampleUrl=${encodeURIComponent(safeSamplePath)}&text=${encodeURIComponent(cleanText.slice(0, 250))}`;

      const audio = new Audio(ttsUrl);
      activeAudioPlayerRef.current = audio;

      audio.onended = () => {
        setSpeakingVoiceId((current) => (current === voiceId ? null : current));
        if (activeAudioPlayerRef.current === audio) {
          activeAudioPlayerRef.current = null;
        }
      };

      audio.onerror = () => {
        setSpeakingVoiceId((current) => (current === voiceId ? null : current));
        if (activeAudioPlayerRef.current === audio) {
          activeAudioPlayerRef.current = null;
        }
        setErrorMessage('Could not synthesize speech with this voice model.');
      };

      await audio.play();
    } catch (err: any) {
      console.error('Error synthesizing speech:', err);
      setSpeakingVoiceId((current) => (current === voiceId ? null : current));
      setErrorMessage(err.message || 'Synthesis error');
    }
  };

  const isLimitReached = clones.length >= MAX_VOICES;
  const progressPercent = Math.min(100, (recordingTime / RECOMMENDED_SECONDS) * 100);
  const isMinMet = recordingTime >= 4.8;
  const isRecommendedMet = recordingTime >= RECOMMENDED_SECONDS;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-16 px-1 sm:px-2 md:px-0">
      {/* FEEDBACK BANNERS */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MAIN VOICE TRAINER WORKSPACE */}
      <div className="rounded-2xl bg-[#0B0F19] border border-slate-800 p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
              Train Voice Model
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record or upload a voice sample (minimum 5s – 15s or longer) to train your AI voice.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => {
                setInputMode('record');
                handleRetake();
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                inputMode === 'record'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic size={13} />
              <span>Microphone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('upload');
                handleRetake();
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                inputMode === 'upload'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload size={13} />
              <span>Upload Audio</span>
            </button>
          </div>
        </div>

        {/* 3 VOICES LIMIT BANNER */}
        {isLimitReached && (
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">
                3 of 3 Voice Slots Used
              </p>
              <p className="text-slate-400 mt-0.5">
                You have reached the Pro plan limit of 3 cloned voices. To train a new voice model, please delete one of your existing models below.
              </p>
            </div>
          </div>
        )}

        {/* Voice Name Input */}
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">
            Voice Model Name
          </label>
          <input
            type="text"
            value={voiceName}
            disabled={isLimitReached}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="e.g. Heng Streamer Voice"
            className="w-full px-3.5 py-2.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-slate-600 placeholder-slate-500 disabled:opacity-50"
          />
        </div>

        {/* RECORDING / UPLOAD INTERFACE */}
        {inputMode === 'record' ? (
          <div className="space-y-3.5 sm:space-y-4">
            {/* Reading Script Selector */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Radio size={13} className="text-slate-400" />
                  <span>Sample Reading Script:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {SUGGESTED_SCRIPTS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedScriptIndex(idx)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                        selectedScriptIndex === idx
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Script {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800 italic break-words">
                &ldquo;{SUGGESTED_SCRIPTS[selectedScriptIndex].text}&rdquo;
              </p>
            </div>

            {/* Audio Waveform Canvas */}
            <div className="relative w-full h-20 sm:h-24 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full block" />
              {!isRecording && !sampleAudioUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs font-mono pointer-events-none px-3 text-center">
                  <Mic size={18} className="mb-1 text-slate-600" />
                  <span>Click &quot;Start Recording&quot; and speak into your microphone</span>
                </div>
              )}
            </div>

            {/* Duration & Requirement Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                <span className="text-slate-400">
                  Duration: <strong className={isMinMet ? 'text-emerald-400' : 'text-slate-200'}>{recordingTime.toFixed(1)}s</strong> (min 5s – 15s+)
                </span>
                <span className={isMinMet ? 'text-emerald-400 flex items-center gap-1 font-semibold' : 'text-slate-500'}>
                  {isMinMet ? <Check size={13} /> : null}
                  {isMinMet
                    ? isRecommendedMet
                      ? 'Optimal duration reached'
                      : 'Ready (minimum 5s met)'
                    : 'Minimum 5 seconds required'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    isMinMet ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {!isRecording && !sampleAudioUrl && (
                <button
                  type="button"
                  disabled={isLimitReached}
                  onClick={handleStartRecording}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Start Recording</span>
                </button>
              )}

              {isRecording && (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Square size={13} className="fill-white" />
                  <span>Stop Recording ({recordingTime.toFixed(1)}s)</span>
                </button>
              )}

              {sampleAudioUrl && !isRecording && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleTogglePlayRecordedSample}
                    className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isPlayingRecordedSample ? <Pause size={13} /> : <Play size={13} />}
                    <span>{isPlayingRecordedSample ? 'Pause' : 'Listen'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRetake}
                    className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs border border-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Retake</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* UPLOAD MODE */
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
              <Upload size={24} className="mx-auto text-slate-500" />
              <div>
                <p className="text-xs font-semibold text-white">
                  Upload Clean Voice Sample
                </p>
                <p className="text-[11px] text-slate-500">
                  WAV, MP3, M4A, or WebM audio file (minimum 5s – 15s or longer)
                </p>
              </div>

              <input
                type="file"
                accept="audio/*"
                disabled={isLimitReached}
                onChange={handleFileUpload}
                className="hidden"
                id="voice-audio-file-upload"
              />
              <label
                htmlFor="voice-audio-file-upload"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 cursor-pointer transition-colors ${
                  isLimitReached ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <span>Browse File</span>
              </label>

              {sampleAudioUrl && (
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <span className="text-xs font-mono text-emerald-400">
                    File Ready ({recordedDuration.toFixed(1)}s)
                  </span>
                  <button
                    type="button"
                    onClick={handleTogglePlayRecordedSample}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    {isPlayingRecordedSample ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isPlayingRecordedSample ? 'Pause' : 'Play'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRAIN ACTION BUTTON */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
          <p className="text-xs text-slate-500">
            {isLimitReached
              ? 'Limit of 3 voices reached. Delete an existing model to train another.'
              : 'Requires minimum 5s of clean speech (5s – 15s or longer).'}
          </p>

          <button
            type="button"
            onClick={handleTrainVoice}
            disabled={!recordedBlob || isTraining || recordedDuration < 4.8 || isLimitReached}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTraining ? (
              <>
                <Loader2 size={14} className="animate-spin text-slate-950" />
                <span>Training Voice...</span>
              </>
            ) : (
              <span>Train Voice Model</span>
            )}
          </button>
        </div>

        {isTraining && trainingStep && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" />
            <span>{trainingStep}</span>
          </div>
        )}
      </div>

      {/* SAVED VOICES SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white font-['Chakra_Petch'] tracking-wide flex items-center gap-2">
            <span>Your Voice Models</span>
            <span className="text-xs font-mono text-slate-400">({clones.length} / {MAX_VOICES})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {activeVoiceName && (
              <button
                type="button"
                onClick={handleResetDefaultVoice}
                className="text-xs font-mono py-1.5 px-3 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                title="Reset alerts to default system voice"
              >
                Reset Default Voice
              </button>
            )}
            <Button
              variant="outline"
              onClick={fetchClones}
              disabled={loadingClones}
              className="text-xs font-mono py-1 px-3 border-slate-800 text-slate-300"
            >
              {loadingClones ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {clones.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-[#0B0F19] border border-dashed border-slate-800 text-center space-y-2">
            <AudioWaveform size={28} className="mx-auto text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-white">
                No Voice Models Yet
              </p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                Record a clean voice sample above to create your first custom AI voice model.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clones.map((voice, idx) => {
              const voiceId = getVoiceId(voice, idx);
              const isCurrentActive = activeVoiceName === voice.voiceName;

              // STRICTLY ISOLATED PER-CARD PLAYBACK STATES:
              const isThisSpeaking = speakingVoiceId === voiceId;
              const isThisPlayingSample = playingSampleId === voiceId;

              const defaultText = 'Thank you {name} for the $10.00 tip! Have an awesome stream!';
              const currentCardText = voiceTestTexts[voiceId] ?? defaultText;

              return (
                <div
                  key={voiceId}
                  className={`rounded-2xl bg-[#0B0F19] border p-4 sm:p-5 space-y-3.5 sm:space-y-4 transition-colors ${
                    isCurrentActive
                      ? 'border-emerald-600/60 bg-emerald-950/10'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] truncate max-w-[200px] sm:max-w-none">
                          {voice.voiceName}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 shrink-0">
                          <Sparkles size={9} className="text-emerald-400" />
                          <span>Neural Clone</span>
                        </span>
                        {isCurrentActive && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mt-1">
                        <span>{voice.clonedAt ? new Date(voice.clonedAt).toLocaleDateString() : 'Trained'}</span>
                        <span>•</span>
                        <span>{voice.sampleDurationSeconds ? `${voice.sampleDurationSeconds}s sample` : 'Sample'}</span>
                      </div>

                      {/* Neural Sound Style & Acoustic Characteristics */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-800/50 flex items-center gap-1 shrink-0">
                          <Zap size={10} className="text-cyan-400" />
                          <span>{voice.soundStyle || 'Warm & Conversational'}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800 shrink-0">
                          {voice.pacingLabel || (voice.rate ? `Pacing ${voice.rate}` : 'Natural 1.0x')}
                        </span>
                        {voice.averagePitchHz && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 shrink-0">
                            {voice.averagePitchHz} Hz
                          </span>
                        )}
                        {voice.timbre && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900/60 border border-slate-800/70 truncate max-w-[200px]" title={voice.timbre}>
                            {voice.timbre}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteVoice(voice)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Delete voice model"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Audio Controls & Independent Speech Tester */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Volume2 size={13} />
                        <span>Speech Test</span>
                      </span>

                      {/* Card Original Sample Audio Preview Button */}
                      {voice.sampleUrl && (
                        <button
                          type="button"
                          onClick={() => handleTogglePlayCardSample(voice, voiceId)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Listen to original recorded sample"
                        >
                          {isThisPlayingSample ? <Pause size={11} /> : <Play size={11} />}
                          <span>{isThisPlayingSample ? 'Pause Sample' : 'Original Sample'}</span>
                        </button>
                      )}
                    </div>

                    {/* Isolated Speech Test Input for THIS card */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={currentCardText}
                        onChange={(e) =>
                          setVoiceTestTexts((prev) => ({
                            ...prev,
                            [voiceId]: e.target.value
                          }))
                        }
                        placeholder="Type test message..."
                        className="w-full flex-1 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-slate-600 placeholder-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestSynthesis(voice, voiceId)}
                        className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg font-medium text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                          isThisSpeaking
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-white hover:bg-slate-200 text-slate-950'
                        }`}
                      >
                        {isThisSpeaking ? (
                          <>
                            <Square size={11} className="fill-slate-950" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Send size={11} />
                            <span>Speak</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card Action: Set as Active Alert Voice */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetActiveAlertVoice(voice)}
                      disabled={isCurrentActive}
                      className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        isCurrentActive
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 cursor-default'
                          : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Check size={13} className={isCurrentActive ? 'text-emerald-400' : 'text-slate-500'} />
                      <span>{isCurrentActive ? 'Active for Alerts' : 'Use for Alertbox'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloneTtsManager;