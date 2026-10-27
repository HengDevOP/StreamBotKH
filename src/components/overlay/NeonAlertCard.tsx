'use client';

import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { LiveAlertPayload } from '../../types/alert';
import { VideoPlayerWithProgressBar } from '../common/VideoPlayerWithProgressBar';

interface NeonAlertCardProps {
  alert: LiveAlertPayload;
  onEnded?: () => void;
}

export const NeonAlertCard: React.FC<NeonAlertCardProps> = ({ alert, onEnded }) => {
  const [isVideoFadingOut, setIsVideoFadingOut] = React.useState(false);

  const {
    donorName = 'Supporter',
    donorMessage,
    amount = 5,
    currency = 'USD',
    glowColor = '#00F0FF',
    customGifUrl,
    mediaUrl,
    videoUrl,
    videoTitle,
    videoStartTime = 0,
    videoEndTime,
    fontSize = 28,
    layoutMode = 'top',
    animationStyle = 'fade',
    textColor = '#FFFFFF'
  } = alert;

  const handleVideoEnded = () => {
    setIsVideoFadingOut(true);
    setTimeout(() => {
      if (onEnded) onEnded();
    }, 750);
  };

  const getYouTubeId = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const ytId = getYouTubeId(videoUrl);
  const isSecondStageVideo = (alert as any).isSecondStageVideo || false;
  const hasUpcomingVideo = (alert as any).upcomingVideo || false;

  const formattedAmount = currency === 'KHR'
    ? `${amount.toLocaleString()} ៛`
    : `$${Number(amount).toFixed(2)}`;

  const defaultGif = 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif';
  const displayGif = customGifUrl || mediaUrl || defaultGif;
  const shouldShowImage = alert.showImage !== false;
  const activeFont = alert.fontFamily || 'Chakra Petch';

  // Format default headline: {donator} donated {amount} through superchat!
  const headlineTemplate = alert.textTemplate || '{donator} donated {amount} through superchat!';
  const cleanDonorMessage = donorMessage ? donorMessage.trim() : '';
  let formattedHeadline = headlineTemplate
    .replace(/\{donator\}/gi, donorName)
    .replace(/\{name\}/gi, donorName)
    .replace(/\{amount\}/gi, formattedAmount)
    .replace(/\{currency\}/gi, currency || 'USD');

  // If {context} is embedded in headline template
  const hasContextInHeadline = headlineTemplate.includes('{context}');
  if (hasContextInHeadline) {
    formattedHeadline = formattedHeadline.replace(/\{context\}/gi, cleanDonorMessage ? `"${cleanDonorMessage}"` : '');
  }

  // Animation class mapping
  const animClass =
    animationStyle === 'pulse'
      ? 'animate-pulse'
      : 'animate-alert-fade';

  // Layout arrangement
  const isSideBySide = layoutMode === 'left' || layoutMode === 'right';
  const isRightLayout = layoutMode === 'right';

  // ==============================================================
  // 1. CINEMATIC VIDEO ALERT (MEDIA SHARE)
  // ==============================================================
  if (ytId && (isSecondStageVideo || Boolean(videoUrl))) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center p-4 text-center transition-all duration-700 ${
          isVideoFadingOut
            ? 'opacity-0 scale-95 pointer-events-none'
            : 'animate-fade-in opacity-100 scale-100'
        }`}
        style={{
          maxWidth: '740px',
          width: '100%',
          fontFamily: `"${activeFont}", sans-serif`
        }}
      >
        <div className="w-full relative flex flex-col items-center">
          {/* Video Player With Donor on Top and Custom Progress Duration Bar at Bottom Border */}
          <VideoPlayerWithProgressBar
            videoId={ytId}
            startTime={videoStartTime}
            endTime={videoEndTime}
            autoplay={true}
            muted={false}
            videoTitle={videoTitle}
            donorName={donorName}
            amount={amount}
            currency={currency}
            glowColor={glowColor}
            onEnded={handleVideoEnded}
          />
        </div>
      </div>
    );
  }

  // ==============================================================
  // 2. STAGE 1: STANDARD DONATION ALERT
  // ==============================================================
  return (
    <div
      className={`relative flex flex-col items-center justify-center p-4 text-center ${animClass}`}
      style={{
        maxWidth: isSideBySide ? '650px' : '560px',
        width: '100%',
        fontFamily: `"${activeFont}", sans-serif`
      }}
    >
      {/* 100% Transparent Backgroundless Outer Container */}
      <div
        className={`w-full relative p-4 bg-transparent ${
          isSideBySide
            ? `flex ${isRightLayout ? 'flex-row-reverse' : 'flex-row'} items-center gap-4 text-left`
            : 'flex flex-col items-center text-center space-y-2'
        }`}
      >
        {/* Reaction Mascot GIF */}
        {shouldShowImage && displayGif ? (
          <div className={`relative flex justify-center ${isSideBySide ? 'flex-shrink-0' : 'mb-3'}`}>
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden drop-shadow-2xl">
              <img
                src={displayGif}
                alt="Reaction Mascot"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
          </div>
        ) : null}

        {/* Text Content Block */}
        <div className={isSideBySide ? 'flex-1 min-w-0 space-y-1' : 'space-y-1.5 w-full'}>
          {/* Primary Headline: Raw text format {donator} donated {amount} through superchat! */}
          <h1
            className="font-extrabold tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
            style={{
              fontFamily: `"${activeFont}", sans-serif`,
              fontSize: fontSize ? `${fontSize}px` : '28px',
              color: textColor || '#FFFFFF',
              textShadow: glowColor
                ? `0 0 20px ${glowColor}aa, 0 2px 4px rgba(0,0,0,0.95)`
                : '0 2px 4px rgba(0,0,0,0.95)'
            }}
          >
            {formattedHeadline}
          </h1>

          {/* Sub H2 for {context} where the donator said (only rendered if donor message exists and is not empty) */}
          {cleanDonorMessage && !hasContextInHeadline && (
            <h2
              className="text-lg sm:text-xl font-bold tracking-normal leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-slate-100 italic mt-1.5"
              style={{ fontFamily: `"${activeFont}", sans-serif` }}
            >
              "{cleanDonorMessage}"
            </h2>
          )}
        </div>
      </div>
    </div>
  );
};
