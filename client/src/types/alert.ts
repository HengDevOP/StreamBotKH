export interface AlertSettings {
  streamer_id: string;
  template_style: 'neon-box' | 'cyber-glitch' | 'glass-banner' | 'arcade';
  glow_color: string;
  sound_url: string;
  sound_volume: number;
  min_amount_alert: number;
  duration_seconds: number;
  tts_enabled: number;
  tts_min_amount: number;
  tts_voice: string;
  custom_gif_url?: string;
  text_template: string;
}

export interface LiveAlertPayload {
  donationId: string;
  donorName: string;
  donorMessage?: string;
  amount: number;
  currency: string;
  bankingName?: string;
  templateStyle?: string;
  glowColor?: string;
  soundUrl?: string;
  soundVolume?: number;
  durationSeconds?: number;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  customGifUrl?: string;
  isTest?: boolean;
}
