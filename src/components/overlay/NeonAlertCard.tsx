'use client';

import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { LiveAlertPayload } from '../../types/alert';
import { VideoPlayerWithProgressBar } from '../common/VideoPlayerWithProgressBar';

interface NeonAlertCardProps {
  alert: LiveAlertPayload;
  onEnded?: () => void;
}

export const getGradientOrColorStyle = (colorStr?: string): React.CSSProperties => {
  if (!colorStr) return {};
  if (colorStr.includes('gradient')) {
    return {
      backgroundImage: colorStr,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    };
  }
  return { color: colorStr };
};

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
    textColor = '#FFFFFF',
    donorColor,
    amountColor
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
  const rawMsg = donorMessage || (alert as any).donor_message || (alert as any).message || '';
  const cleanDonorMessage = typeof rawMsg === 'string' ? rawMsg.trim() : '';

  // Determine if a real, meaningful donor message exists (not empty, not "None", not "(None)")
  const hasMeaningfulMessage = Boolean(
    cleanDonorMessage &&
    cleanDonorMessage.toLowerCase() !== 'none' &&
    cleanDonorMessage.toLowerCase() !== '(none)' &&
    cleanDonorMessage.toLowerCase() !== 'null' &&
    cleanDonorMessage.toLowerCase() !== 'undefined'
  );

  let formattedHeadline = headlineTemplate
    .replace(/\{donator\}/gi, donorName)
    .replace(/\{name\}/gi, donorName)
    .replace(/\{amount\}/gi, formattedAmount)
    .replace(/\{currency\}/gi, currency || 'USD')
    .replace(/\{message\}/gi, hasMeaningfulMessage ? `"${cleanDonorMessage}"` : '')
    .replace(/\{donor_message\}/gi, hasMeaningfulMessage ? `"${cleanDonorMessage}"` : '')
    .replace(/\{context\}/gi, hasMeaningfulMessage ? `"${cleanDonorMessage}"` : '');

  // If there is no message value, clean up any trailing punctuation/quotes in headline so only the title displays
  if (!hasMeaningfulMessage) {
    formattedHeadline = formattedHeadline
      .replace(/\s*[:\-–|]\s*$/, '')
      .replace(/\s*""\s*$/, '')
      .trim();
  }

  // If {context} is embedded in headline template
  const hasContextInHeadline =
    headlineTemplate.includes('{context}') ||
    headlineTemplate.includes('{message}') ||
    headlineTemplate.includes('{donor_message}');

  // Dynamic token parsing with gradient & custom color support
  const renderHeadlineElements = () => {
    if (!donorColor && !amountColor) {
      return <span style={getGradientOrColorStyle(textColor || '#FFFFFF')}>{formattedHeadline}</span>;
    }

    const tokenRegex = /(\{(?:donator|name|amount|currency|message|donor_message|context)\})/gi;
    const tokens = headlineTemplate.split(tokenRegex);

    return tokens.map((part, idx) => {
      const lower = part.toLowerCase();
      if (lower === '{donator}' || lower === '{name}') {
        return (
          <span
            key={idx}
            className="font-extrabold"
            style={getGradientOrColorStyle(donorColor || textColor || '#00F0FF')}
          >
            {donorName}
          </span>
        );
      }
      if (lower === '{amount}') {
        return (
          <span
            key={idx}
            className="font-black"
            style={getGradientOrColorStyle(amountColor || textColor || '#FFE600')}
          >
            {formattedAmount}
          </span>
        );
      }
      if (lower === '{currency}') {
        return (
          <span
            key={idx}
            style={getGradientOrColorStyle(amountColor || textColor || '#FFE600')}
          >
            {currency || 'USD'}
          </span>
        );
      }
      if (lower === '{message}' || lower === '{donor_message}' || lower === '{context}') {
        return hasMeaningfulMessage ? (
          <span key={idx} className="italic" style={getGradientOrColorStyle(textColor)}>
            "{cleanDonorMessage}"
          </span>
        ) : null;
      }
      return (
        <span key={idx} style={getGradientOrColorStyle(textColor)}>
          {part}
        </span>
      );
    });
  };

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
              textShadow: glowColor
                ? `0 0 20px ${glowColor}aa, 0 2px 4px rgba(0,0,0,0.95)`
                : '0 2px 4px rgba(0,0,0,0.95)'
            }}
          >
            {renderHeadlineElements()}
          </h1>

          {/* Sub H2 for {context} where the donator said (only rendered if donor message exists, is non-empty, and meaningful) */}
          {hasMeaningfulMessage && !hasContextInHeadline && (
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
