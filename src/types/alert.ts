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

export interface AlertBox {
  _id: string;
  userId: string;
  name: string;
  minAmountCondition: number;
  isEnabled: boolean;
  templateStyle: 'neon-box' | 'glass-hologram' | 'cyber-glitch' | 'arcade' | 'minimal';
  showImage: boolean;
  mediaUrl?: string;
  soundUrl: string;
  soundVolume: number;
  durationSeconds: number;
  glowColor: string;
  fontFamily: string;
  fontSize?: number;
  ttsEnabled: boolean;
  ttsMinAmount: number;
  ttsType: 'google' | 'kiritts-male' | 'kiritts-female' | 'cloned';
  clonedVoiceName?: string;
  clonedVoiceSampleUrl?: string;
  textTemplate?: string;
  textColor?: string;
  messageTemplate?: string;
  layoutMode?: 'top' | 'left' | 'right' | 'banner';
  animationStyle?: 'bounce' | 'pulse' | 'glitch' | 'slide' | 'zoom';
  createdAt: string;
  updatedAt: string;
}

export interface LiveAlertPayload {
  donationId: string;
  boxId?: string;
  donorName: string;
  donorMessage?: string;
  amount: number;
  currency: string;
  bankingName?: string;
  textTemplate?: string;
  textColor?: string;
  templateStyle?: string;
  glowColor?: string;
  soundUrl?: string;
  soundVolume?: number;
  durationSeconds?: number;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsType?: 'google' | 'kiritts-male' | 'kiritts-female' | 'cloned';
  customGifUrl?: string;
  mediaUrl?: string;
  showImage?: boolean;
  fontFamily?: string;
  fontSize?: number;
  layoutMode?: 'top' | 'left' | 'right' | 'banner';
  animationStyle?: 'bounce' | 'fade' | 'pulse' | 'glitch' | 'slide' | 'zoom';
  overlayToken?: string;
  videoUrl?: string;
  videoTitle?: string;
  videoStartTime?: number;
  videoEndTime?: number;
  isSecondStageVideo?: boolean;
  upcomingVideo?: boolean;
  videoAlertEnabled?: boolean;
  videoMinTipAmount?: number;
  videoMaxDurationSeconds?: number;
  isTest?: boolean;
}
