'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Cpu
} from 'lucide-react';
import { Button } from '../common/Button';

interface VoiceClonerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloned: (clonedVoice: { id: string; name: string; sampleUrl: string }) => void;
}

export const VoiceClonerModal: React.FC<VoiceClonerModalProps> = ({
  isOpen,
  onClose,
  onCloned
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneStep, setCloneStep] = useState<string>('');
  const [voiceName, setVoiceName] = useState('My Streamer AI Voice');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const startRecording = async () => {
    setErrorMessage(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Microphone access denied. Please allow microphone permissions to record your voice.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (recordingDuration < 10) {
        setErrorMessage(
          `You recorded ${recordingDuration.toFixed(1)}s. AI Voice Cloning requires at least 10 seconds of speech for accurate timbre and pitch modeling. Please record again.`
        );
      }
    }
  };

  const playRecordedAudio = () => {
    if (!audioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    } else {
      audioPlayerRef.current.src = audioUrl;
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleCloneVoice = async () => {
    if (!audioUrl || recordingDuration < 10) {
      setErrorMessage('Please record at least 10 seconds of speech first.');
      return;
    }

    setCloning(true);
    setErrorMessage(null);

    try {
      setCloneStep('Extracting speaker voice embeddings...');
      await new Promise((r) => setTimeout(r, 900));

      setCloneStep('Training neural timbre and phonetic profile...');
      await new Promise((r) => setTimeout(r, 1100));

      setCloneStep('Generating Kiri-Neural acoustic checkpoints...');
      await new Promise((r) => setTimeout(r, 900));

      const res = await fetch('/api/voice-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName: voiceName.trim() || 'My Streamer AI Voice',
          sampleUrl: audioUrl,
          sampleDurationSeconds: recordingDuration
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save cloned voice');
      }

      setCloneStep('AI Voice Model Ready!');
      await new Promise((r) => setTimeout(r, 600));

      onCloned({
        id: data.voice._id,
        name: data.voice.voiceName,
        sampleUrl: audioUrl
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating voice clone.');
    } finally {
      setCloning(false);
    }
  };

  const hasMetMinTime = recordingDuration >= 10;
  const progressPercent = Math.min(100, (recordingDuration / 10) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#090D18] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-5 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
                AI Voice Cloner (Streamer TTS)
              </h3>
              <p className="text-xs text-slate-400">Record 10+ seconds to clone your voice for donation TTS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cloning || isRecording}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Voice Model Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold text-slate-300 block">Voice Model Label</label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="e.g. Piseth Gaming Voice"
            disabled={cloning || isRecording}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Recording Deck */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
          <div className="space-y-1">
            <div className="text-3xl font-extrabold font-mono text-white tracking-wider">
              {recordingDuration.toFixed(1)}s
            </div>
            <div className="text-xs font-mono">
              {isRecording ? (
                <span className="text-red-400 flex items-center justify-center gap-1.5 animate-pulse font-bold">
                  <Radio size={12} />
                  RECORDING IN PROGRESS...
                </span>
              ) : hasMetMinTime ? (
                <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                  <Check size={12} />
                  Qualified for AI Cloning (&ge;10s)
                </span>
              ) : (
                <span className="text-slate-500">Record at least 10 seconds of clear speech</span>
              )}
            </div>
          </div>

          {/* 10 Seconds Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-100 ${
                hasMetMinTime ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Equalizer animation when recording */}
          {isRecording && (
            <div className="flex items-center justify-center gap-1.5 py-2">
              {[40, 75, 90, 60, 85, 45, 95, 70, 50, 80, 65].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full animate-pulse"
                  style={{
                    height: `${h * 0.25}px`,
                    animationDelay: `${i * 90}ms`
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
                className="bg-cyan-400 text-slate-950 font-bold px-5"
              >
                {audioUrl ? 'Re-Record Voice' : 'Start Recording'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={stopRecording}
                icon={<Square size={14} className="fill-current" />}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                Stop Recording
              </Button>
            )}

            {audioUrl && !isRecording && (
              <button
                type="button"
                onClick={playRecordedAudio}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
              >
                <Play size={13} className={isPlaying ? 'animate-spin' : ''} />
                <span>{isPlaying ? 'Playing...' : 'Play Sample'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Cloning status steps */}
        {cloning && (
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-center space-y-2 animate-pulse">
            <div className="text-xs font-mono text-cyan-300 font-bold flex items-center justify-center gap-2">
              <Sparkles size={14} className="animate-spin" />
              <span>{cloneStep}</span>
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
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCloneVoice}
            disabled={!audioUrl || !hasMetMinTime || cloning || isRecording}
            loading={cloning}
            icon={<Sparkles size={14} />}
            className="bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-slate-950 font-bold px-5 text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          >
            Train & Clone Voice
          </Button>
        </div>
      </div>
    </div>
  );
};