'use client';

import React from 'react';
import { Play, Sparkles, Video } from 'lucide-react';
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
    : `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const defaultGif = '/sbkh/sbkh_hi.gif';
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

  const tierNameFromAlert = (alert as any).tierName || (alert as any).tier || 'VIP Member';

  let formattedHeadline = headlineTemplate
    .replace(/\{donator\}/gi, donorName)
    .replace(/\{name\}/gi, donorName)
    .replace(/\{tier\}/gi, tierNameFromAlert)
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
    const activeDonorColor = donorColor || '#FFE600';
    const activeAmountColor = amountColor || '#00F0FF';
    const activeTierColor = (alert as any).tierColor || activeAmountColor || '#F59E0B';
    const activeTextColor = textColor || '#FFFFFF';

    const tokenRegex = /(\{(?:donator|name|tier|amount|currency|message|donor_message|context)\})/gi;
    const tokens = headlineTemplate.split(tokenRegex);

    return tokens.map((part, idx) => {
      const lower = part.toLowerCase();
      if (lower === '{donator}' || lower === '{name}') {
        return (
          <span
            key={idx}
            className="font-extrabold"
            style={getGradientOrColorStyle(activeDonorColor)}
          >
            {donorName}
          </span>
        );
      }
      if (lower === '{tier}') {
        return (
          <span
            key={idx}
            className="font-extrabold"
            style={getGradientOrColorStyle(activeTierColor)}
          >
            {tierNameFromAlert}
          </span>
        );
      }
      if (lower === '{amount}') {
        return (
          <span
            key={idx}
            className="font-black"
            style={getGradientOrColorStyle(activeAmountColor)}
          >
            {formattedAmount}
          </span>
        );
      }
      if (lower === '{currency}') {
        return (
          <span
            key={idx}
            style={getGradientOrColorStyle(activeAmountColor)}
          >
            {currency || 'USD'}
          </span>
        );
      }
      if (lower === '{message}' || lower === '{donor_message}' || lower === '{context}') {
        return hasMeaningfulMessage ? (
          <span key={idx} className="italic" style={getGradientOrColorStyle(activeTextColor)}>
            "{cleanDonorMessage}"
          </span>
        ) : null;
      }
      return (
        <span key={idx} style={getGradientOrColorStyle(activeTextColor)}>
          {part}
        </span>
      );
    });
  };

  // Animation class mapping (supports classic + CapCut video editing animations)
  const resolveAnimationClass = () => {
    const anim = (alert as any).capcutAnimation || animationStyle;
    switch (anim) {
      case 'zoom':
      case 'zoom-in':
      case 'capcut-zoom-in':
        return 'animate-capcut-zoom-in';
      case 'zoom-out':
      case 'capcut-zoom-out':
        return 'animate-capcut-zoom-out';
      case 'shake':
      case 'capcut-shake':
        return 'animate-capcut-shake';
      case 'flip':
      case 'flip-x':
      case 'capcut-3d-flip-x':
        return 'animate-capcut-3d-flip-x';
      case 'flip-y':
      case 'capcut-3d-flip-y':
        return 'animate-capcut-3d-flip-y';
      case 'swing':
      case 'capcut-swing-down':
        return 'animate-capcut-swing-down';
      case 'bounce':
      case 'jello':
      case 'capcut-wobble-jello':
        return 'animate-capcut-wobble-jello';
      case 'roll':
      case 'capcut-roll-in':
        return 'animate-capcut-roll-in';
      case 'glitch':
      case 'capcut-glitch-split':
        return 'animate-capcut-glitch-split';
      case 'slide':
      case 'slide-up':
      case 'capcut-slide-up-bounce':
        return 'animate-capcut-slide-up-bounce';
      case 'slide-down':
      case 'capcut-slide-down-bounce':
        return 'animate-capcut-slide-down-bounce';
      case 'flash':
      case 'capcut-flash-burst':
        return 'animate-capcut-flash-burst';
      case 'origami':
      case 'capcut-origami-fold':
        return 'animate-capcut-origami-fold';
      case 'spiral':
      case 'capcut-spiral-zoom':
        return 'animate-capcut-spiral-zoom';
      case 'pulse':
      case 'heartbeat':
      case 'capcut-heartbeat-pulse':
        return 'animate-capcut-heartbeat-pulse';
      case 'pop':
      case 'capcut-pop-spring':
        return 'animate-capcut-pop-spring';
      case 'skew':
      case 'capcut-skew-dash':
        return 'animate-capcut-skew-dash';
      case 'shutter':
      case 'capcut-shutter-slice':
        return 'animate-capcut-shutter-slice';
      case 'whirlpool':
      case 'capcut-whirlpool':
        return 'animate-capcut-whirlpool';
      case 'fade':
        return 'animate-fadeIn';
      default:
        return 'animate-capcut-zoom-in';
    }
  };

  const animClass = resolveAnimationClass();

  // Layout arrangement
  const isSideBySide = layoutMode === 'left' || layoutMode === 'right';
  const isRightLayout = layoutMode === 'right';
  const isBottomLayout = layoutMode === 'bottom';

  // ==============================================================
  // 1. CINEMATIC VIDEO ALERT (MEDIA SHARE - STAGE 2)
  // ==============================================================
  if (ytId && isSecondStageVideo) {
    const videoHeaderColor = (alert as any).videoHeaderColor || donorColor || glowColor || '#00F0FF';
    const videoHeaderBgColor = (alert as any).videoHeaderBgColor || 'rgba(0, 0, 0, 0.85)';
    const videoFooterColor = (alert as any).videoFooterColor || textColor || '#FFFFFF';
    const videoFooterBgColor = (alert as any).videoFooterBgColor || 'rgba(0, 0, 0, 0.90)';
    const videoHeaderTextAlign = (alert as any).videoHeaderTextAlign || 'left';
    const videoFooterTextAlign = (alert as any).videoFooterTextAlign || 'left';
    const videoVolume = (alert as any).video?.volume !== undefined
      ? Number((alert as any).video.volume)
      : ((alert as any).videoVolume !== undefined ? Number((alert as any).videoVolume) : 85);

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
            volume={videoVolume}
            videoTitle={videoTitle}
            donorName={donorName}
            donorColor={donorColor}
            amount={amount}
            currency={currency}
            glowColor={glowColor}
            donorMessage={cleanDonorMessage}
            headerColor={videoHeaderColor}
            headerBgColor={videoHeaderBgColor}
            footerColor={videoFooterColor}
            footerBgColor={videoFooterBgColor}
            headerTextAlign={videoHeaderTextAlign}
            footerTextAlign={videoFooterTextAlign}
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
            ? `flex ${isRightLayout ? 'flex-row-reverse' : 'flex-row'} items-center gap-5 text-left`
            : isBottomLayout
            ? 'flex flex-col-reverse items-center text-center space-y-reverse space-y-3'
            : 'flex flex-col items-center text-center space-y-2'
        }`}
      >
        {/* Reaction Mascot GIF */}
        {shouldShowImage && displayGif ? (
          <div className={`relative flex justify-center ${isSideBySide ? 'flex-shrink-0' : isBottomLayout ? 'mt-3' : 'mb-3'}`}>
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
            className="font-extrabold tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] inline-flex items-center justify-center flex-wrap gap-x-2 gap-y-1"
            style={{
              fontFamily: `"${activeFont}", sans-serif`,
              fontSize: fontSize ? `${fontSize}px` : '28px',
              textShadow: glowColor
                ? `0 0 20px ${glowColor}aa, 0 2px 4px rgba(0,0,0,0.95)`
                : '0 2px 4px rgba(0,0,0,0.95)'
            }}
          >
            <span>{renderHeadlineElements()}</span>
            {(alert as any).badgeText && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider align-middle drop-shadow-md"
                style={{
                  color: (alert as any).badgeColor || '#00F0FF',
                  backgroundColor: (alert as any).badgeBg || 'rgba(0, 240, 255, 0.15)',
                  border: `1px solid ${(alert as any).badgeBorder || 'rgba(0, 240, 255, 0.35)'}`
                }}
              >
                [{(alert as any).badgeText}]
              </span>
            )}
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

          {/* Indicator: Media Share Video Queued Next */}
          {hasUpcomingVideo && (
            <div className="pt-2 flex justify-center">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse shadow-md"
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#22d3ee'
                }}
              >
                <Video size={13} className="text-cyan-400 animate-bounce" />
                <span>Media Share Video Queued Next</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
