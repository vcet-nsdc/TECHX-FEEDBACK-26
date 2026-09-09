'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type NathanAnimationState = 'idle' | 'run' | 'survey' | 'cheer' | 'jump';
export type CharacterType = 'nathan' | 'victor' | 'elena' | 'chloe';

interface PixelNathanDrakeProps {
  character?: CharacterType | string;
  state?: NathanAnimationState;
  facing?: 'right' | 'left';
  size?: number; // Height in px (e.g. 48, 56, 64)
  showSpeechBubble?: boolean;
  speechText?: string;
  showDust?: boolean;
  className?: string;
  onClick?: () => void;
  tooltipText?: string;
}

const CHARACTER_QUIPS: Record<CharacterType, string[]> = {
  nathan: [
    "Sic Parvis Magna!",
    "Greatness from small beginnings.",
    "Just a typical day in the field.",
    "Marco!... Polo.",
    "Hold on to your compass!",
    "One step closer to the treasure.",
  ],
  victor: [
    "I'm gettin' too old for this!",
    "Follow the money, kid.",
    "Trust me on this one.",
    "Never lost a treasure yet.",
    "Keep your eyes sharp!",
  ],
  elena: [
    "Documenting history in real time!",
    "Hold still, let me get this shot.",
    "Watch your step!",
    "This belongs in the story.",
    "Found another relic!",
  ],
  chloe: [
    "Admit it, you missed me.",
    "Leave the tough relics to me.",
    "Eyes on the prize, darling.",
    "I always play to win.",
    "Right behind you!",
  ],
};

const CHARACTER_NAMES: Record<CharacterType, string> = {
  nathan: 'Nathan Drake',
  victor: 'Victor Sullivan',
  elena: 'Elena Fisher',
  chloe: 'Chloe Frazer',
};

function resolveCharacter(raw?: string | null): CharacterType {
  if (!raw) return 'nathan';
  const lower = raw.toLowerCase();
  if (lower.includes('elena')) return 'elena';
  if (lower.includes('chloe')) return 'chloe';
  if (lower.includes('victor') || lower.includes('sully')) return 'victor';
  return 'nathan';
}

/**
 * Pixel-art Multi-Character Miniature Explorer
 * Dynamically switches appearance based on the chosen explorer:
 * - Nathan Drake (Black adventurer hat, slate-blue henley, dual holster, cargo pants)
 * - Victor Sullivan (Silver-grey hair & mustache, tropical safari shirt, slacks)
 * - Elena Fisher (Blonde ponytail, explorer utility top, camera strap, cargo pants)
 * - Chloe Frazer (Dark braided ponytail, ruby red henley, tactical harness, combat boots)
 */
export default function PixelNathanDrake({
  character,
  state = 'idle',
  facing = 'right',
  size = 52,
  showSpeechBubble = false,
  speechText,
  showDust = true,
  className = '',
  onClick,
  tooltipText,
}: PixelNathanDrakeProps) {
  const [frame, setFrame] = useState(0);
  const [internalQuip, setInternalQuip] = useState<string | null>(null);
  const [quipTimer, setQuipTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeChar, setActiveChar] = useState<CharacterType>('nathan');

  useEffect(() => {
    if (character) {
      setActiveChar(resolveCharacter(character));
      return;
    }

    if (typeof window !== 'undefined') {
      const checkStored = () => {
        const stored = localStorage.getItem('user_avatar');
        if (stored) {
          setActiveChar(resolveCharacter(stored));
          return;
        }
        try {
          const session = localStorage.getItem('user_session');
          if (session) {
            const parsed = JSON.parse(session);
            if (parsed?.avatar) {
              setActiveChar(resolveCharacter(parsed.avatar));
              return;
            }
          }
        } catch {
          // ignore
        }
        setActiveChar('nathan');
      };
      checkStored();
      window.addEventListener('storage', checkStored);
      return () => window.removeEventListener('storage', checkStored);
    }
  }, [character]);

  // Run cycle frame ticker
  useEffect(() => {
    let intervalTime = 125; // 8 fps for energetic retro pixel run
    if (state === 'idle') intervalTime = 420; // subtle breathing/sway
    if (state === 'survey') intervalTime = 600;
    if (state === 'cheer') intervalTime = 200;

    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 6);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [state]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
    // Trigger fun random quip bubble for the active character
    const quipPool = CHARACTER_QUIPS[activeChar] || CHARACTER_QUIPS.nathan;
    const randomQuip = quipPool[Math.floor(Math.random() * quipPool.length)];
    setInternalQuip(randomQuip);

    if (quipTimer) clearTimeout(quipTimer);
    const timer = setTimeout(() => {
      setInternalQuip(null);
    }, 2800);
    setQuipTimer(timer);
  };

  const activeSpeech = speechText || internalQuip;
  const isFlipped = facing === 'left';

  const containerRef = React.useRef<HTMLDivElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const [bubbleOffset, setBubbleOffset] = useState({ shiftX: 0, isBelow: false });

  // Auto-clamp speech bubble to stay inside container/screen boundaries without cutting off
  useEffect(() => {
    if (!activeSpeech && !showSpeechBubble) return;

    const updateOffset = () => {
      if (!containerRef.current || !bubbleRef.current) return;

      const container = containerRef.current;
      const bubble = bubbleRef.current;
      const drakeRect = container.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();

      const boundaryEl =
        (container.closest('[data-nathan-container="true"]') as HTMLElement | null) ||
        (container.closest('.relative') as HTMLElement | null) ||
        null;

      const boundaryRect = boundaryEl
        ? boundaryEl.getBoundingClientRect()
        : {
            left: 0,
            right: window.innerWidth,
            top: 0,
            bottom: window.innerHeight,
          };

      const padding = 10;
      const drakeCenterX = drakeRect.left + drakeRect.width / 2;
      const idealBubbleLeft = drakeCenterX - bubbleRect.width / 2;
      const idealBubbleRight = drakeCenterX + bubbleRect.width / 2;

      let shift = 0;
      if (idealBubbleLeft < boundaryRect.left + padding) {
        shift = boundaryRect.left + padding - idealBubbleLeft;
      } else if (idealBubbleRight > boundaryRect.right - padding) {
        shift = boundaryRect.right - padding - idealBubbleRight;
      }

      const isBelow = drakeRect.top - bubbleRect.height - 14 < boundaryRect.top;
      setBubbleOffset({ shiftX: shift, isBelow });
    };

    updateOffset();
    const raf = requestAnimationFrame(updateOffset);
    window.addEventListener('resize', updateOffset);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateOffset);
    };
  }, [activeSpeech, showSpeechBubble]);

  const runYOffset = state === 'run' ? (frame % 2 === 0 ? -2 : 0) : 0;
  const idleYOffset = state === 'idle' ? (frame % 2 === 0 ? -0.5 : 0.5) : 0;
  const charLabel = CHARACTER_NAMES[activeChar] || 'Explorer';
  const resolvedTooltip = tooltipText || `${charLabel} • Field Recon`;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative inline-flex flex-col items-center select-none cursor-pointer group ${className}`}
      style={{
        width: size * 0.75,
        height: size,
      }}
      title={resolvedTooltip}
    >
      {/* Dynamic Quip Speech Bubble - Boundary Clamped */}
      <AnimatePresence>
        {(showSpeechBubble || activeSpeech) && (
          <motion.div
            ref={bubbleRef}
            initial={{ opacity: 0, y: bubbleOffset.isBelow ? -6 : 6, scale: 0.8 }}
            animate={{ opacity: 1, y: bubbleOffset.isBelow ? 8 : -8, scale: 1 }}
            exit={{ opacity: 0, y: bubbleOffset.isBelow ? -2 : 2, scale: 0.8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`absolute left-1/2 z-50 pointer-events-none whitespace-nowrap ${
              bubbleOffset.isBelow ? 'top-full' : '-top-7'
            }`}
            style={{
              transform: `translateX(calc(-50% + ${bubbleOffset.shiftX}px))`,
            }}
          >
            <div className="relative px-2.5 py-1 rounded-md bg-[#180d06]/95 border border-[#d4af37] text-[#ffd700] text-[8.5px] sm:text-[9.5px] font-mono font-bold shadow-[0_4px_16px_rgba(0,0,0,0.9)] flex items-center gap-1.5 backdrop-blur-sm">
              <span className="text-[8px] opacity-85">💬</span>
              <span>{activeSpeech || "Let's find the lost sector!"}</span>
              {bubbleOffset.isBelow ? (
                <div
                  className="absolute -top-1 w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-l-transparent border-r-transparent border-b-[4px] border-b-[#d4af37]"
                  style={{
                    left: `clamp(12px, calc(50% - ${bubbleOffset.shiftX}px), calc(100% - 12px))`,
                    transform: 'translateX(-50%)',
                  }}
                />
              ) : (
                <div
                  className="absolute -bottom-1 w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-l-transparent border-r-transparent border-t-[4px] border-t-[#d4af37]"
                  style={{
                    left: `clamp(12px, calc(50% - ${bubbleOffset.shiftX}px), calc(100% - 12px))`,
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dust Puff Particles when running */}
      {showDust && state === 'run' && (
        <div className="absolute bottom-0 inset-x-0 flex justify-center pointer-events-none overflow-visible">
          <motion.div
            key={`dust-${frame}`}
            initial={{ opacity: 0.8, scale: 0.4, x: isFlipped ? 8 : -8, y: 0 }}
            animate={{ opacity: 0, scale: 1.3, x: isFlipped ? 16 : -16, y: -4 }}
            transition={{ duration: 0.35 }}
            className="w-1.5 h-1.5 rounded-full bg-[#cca462]/60 blur-[0.4px]"
          />
          <motion.div
            key={`dust2-${frame}`}
            initial={{ opacity: 0.6, scale: 0.3, x: isFlipped ? 4 : -4, y: 1 }}
            animate={{ opacity: 0, scale: 1.1, x: isFlipped ? 10 : -10, y: -2 }}
            transition={{ duration: 0.28, delay: 0.05 }}
            className="w-1 h-1 rounded-full bg-[#8c6d23]/50 blur-[0.3px]"
          />
        </div>
      )}

      {/* Ambient Ground Shadow */}
      <div
        className="absolute bottom-0 w-3/4 h-1.5 rounded-[100%] bg-[#080402]/60 blur-[0.8px] -z-10"
        style={{
          transform: `scale(${state === 'run' ? 0.85 : 1})`,
          transition: 'transform 0.15s ease',
        }}
      />

      {/* Main Pixel Sprite Canvas */}
      <div
        style={{
          transform: `scaleX(${isFlipped ? -1 : 1}) translateY(${runYOffset + idleYOffset}px)`,
          transformOrigin: 'bottom center',
          imageRendering: 'pixelated',
          transition: 'transform 0.08s linear',
        }}
        className="w-full h-full relative flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
      >
        <ExplorerPixelSvg state={state} frame={frame} character={activeChar} />
      </div>
    </div>
  );
}

/**
 * Procedural Pixel-Art SVG Matrix supporting all 4 Uncharted Explorers
 */
function ExplorerPixelSvg({
  state,
  frame,
  character,
}: {
  state: NathanAnimationState;
  frame: number;
  character: CharacterType;
}) {
  const isRun = state === 'run';
  const isCheer = state === 'cheer';
  const isSurvey = state === 'survey';
  const runLegFrame = frame % 6;

  // Custom palettes per character
  const isElena = character === 'elena';
  const isChloe = character === 'chloe';
  const isVictor = character === 'victor';
  const isNathan = character === 'nathan';

  const shirtColor = isChloe
    ? '#dc2626' // Chloe: Ruby red henley
    : isElena
      ? '#65a30d' // Elena: Olive explorer tank
      : isVictor
        ? '#ca8a04' // Sully: Safari gold/tan shirt
        : '#43586f'; // Nathan: Slate-blue henley

  const shirtShadow = isChloe
    ? '#991b1b'
    : isElena
      ? '#4d7c0f'
      : isVictor
        ? '#854d0e'
        : '#2c3b4a';

  const pantsColor = isChloe
    ? '#1e293b' // Chloe: Tactical charcoal pants
    : isElena
      ? '#78716c' // Elena: Field khaki/grey pants
      : isVictor
        ? '#57534e' // Sully: Classic brown trousers
        : '#9c7352'; // Nathan: Rugged khaki cargo

  const pantsHighlight = isChloe ? '#334155' : isElena ? '#a8a29e' : isVictor ? '#78716c' : '#b88f6c';
  const pantsShadow = isChloe ? '#0f172a' : isElena ? '#57534e' : isVictor ? '#44403c' : '#765236';

  const skinBase = isElena ? '#fce7d2' : isChloe ? '#f1cbb0' : '#e8b88a';
  const skinShadow = isElena ? '#e2bc9d' : isChloe ? '#d49f7b' : '#c89264';
  const skinHighlight = '#fef3c7';

  return (
    <svg viewBox="0 0 24 32" className="w-full h-full" style={{ shapeRendering: 'crispEdges' }}>
      {/* ======================================================== */}
      {/* 1. HEAD / HAIR / HAT PER EXPLORER                        */}
      {/* ======================================================== */}
      {isNathan && (
        // Nathan Drake: Classic Explorer Fedora Hat & Messy Hair
        <>
          <rect x="9" y="0" width="6" height="1" fill="#3c3c47" />
          <rect x="8" y="1" width="8" height="1" fill="#22222a" />
          <rect x="11" y="0" width="2" height="1" fill="#08080a" />
          <rect x="7" y="2" width="10" height="2" fill="#141419" />
          <rect x="7" y="3" width="10" height="1" fill="#08080a" />
          <rect x="3" y="4" width="18" height="1" fill="#141419" />
          <rect x="5" y="5" width="2" height="2" fill="#2a160b" />
          <rect x="17" y="5" width="2" height="2" fill="#2a160b" />
        </>
      )}

      {isVictor && (
        // Victor Sullivan (Sully): Distinguished Silver/Grey Hair
        <>
          <rect x="8" y="1" width="8" height="2" fill="#cbd5e1" />
          <rect x="7" y="2" width="10" height="3" fill="#e2e8f0" />
          <rect x="6" y="3" width="2" height="3" fill="#94a3b8" />
          <rect x="16" y="3" width="2" height="3" fill="#94a3b8" />
          <rect x="9" y="1" width="6" height="1" fill="#f8fafc" />
        </>
      )}

      {isElena && (
        // Elena Fisher: Blonde Ponytail Hair flowing behind
        <>
          {/* Flowing Blonde Ponytail on left/back */}
          <rect x="3" y="4" width="3" height="4" fill="#fde047" />
          <rect x="2" y="7" width="3" height="4" fill="#eab308" />
          <rect x="3" y="10" width="2" height="2" fill="#ca8a04" />
          {/* Hairtie */}
          <rect x="5" y="5" width="1" height="2" fill="#0284c7" />
          {/* Blonde Crown */}
          <rect x="7" y="1" width="10" height="4" fill="#fde047" />
          <rect x="8" y="0" width="8" height="1" fill="#fef08a" />
          <rect x="6" y="3" width="2" height="3" fill="#eab308" />
          <rect x="16" y="3" width="2" height="3" fill="#eab308" />
          <rect x="7" y="4" width="10" height="1" fill="#fde047" />
        </>
      )}

      {isChloe && (
        // Chloe Frazer: Dark Braided Ponytail flowing behind
        <>
          {/* Dark Ponytail on left/back */}
          <rect x="3" y="4" width="3" height="5" fill="#171717" />
          <rect x="2" y="8" width="3" height="5" fill="#262626" />
          <rect x="3" y="12" width="2" height="2" fill="#0a0a0a" />
          {/* Hairtie */}
          <rect x="5" y="5" width="1" height="2" fill="#dc2626" />
          {/* Jet Black Crown */}
          <rect x="7" y="1" width="10" height="4" fill="#171717" />
          <rect x="8" y="0" width="8" height="1" fill="#262626" />
          <rect x="6" y="3" width="2" height="3" fill="#171717" />
          <rect x="16" y="3" width="2" height="3" fill="#171717" />
          <rect x="7" y="4" width="10" height="1" fill="#171717" />
        </>
      )}

      {/* Forehead & Face */}
      <rect x="7" y="5" width="10" height="5" fill={skinBase} />
      <rect x="8" y="5" width="8" height="1" fill={skinHighlight} />

      {/* Eyes & Brows */}
      {isElena ? (
        // Elena Blue Eyes
        <>
          <rect x="8" y="6" width="3" height="1" fill="#a16207" />
          <rect x="13" y="6" width="3" height="1" fill="#a16207" />
          <rect x="9" y="7" width="1" height="1" fill="#0284c7" />
          <rect x="14" y="7" width="1" height="1" fill="#0284c7" />
        </>
      ) : isChloe ? (
        // Chloe Dark Eyes
        <>
          <rect x="8" y="6" width="3" height="1" fill="#171717" />
          <rect x="13" y="6" width="3" height="1" fill="#171717" />
          <rect x="9" y="7" width="1" height="1" fill="#0a0a0a" />
          <rect x="14" y="7" width="1" height="1" fill="#0a0a0a" />
        </>
      ) : isVictor ? (
        // Sully Brows & Eyes
        <>
          <rect x="8" y="6" width="3" height="1" fill="#94a3b8" />
          <rect x="13" y="6" width="3" height="1" fill="#94a3b8" />
          <rect x="9" y="7" width="1" height="1" fill="#1b120c" />
          <rect x="14" y="7" width="1" height="1" fill="#1b120c" />
        </>
      ) : (
        // Nathan Brows & Eyes
        <>
          <rect x="8" y="6" width="3" height="1" fill="#2a160b" />
          <rect x="13" y="6" width="3" height="1" fill="#2a160b" />
          <rect x="9" y="7" width="1" height="1" fill="#1b120c" />
          <rect x="14" y="7" width="1" height="1" fill="#1b120c" />
        </>
      )}

      {/* Nose & Ears */}
      <rect x="11" y="7" width="2" height="2" fill={skinShadow} />
      <rect x="6" y="6" width="1" height="3" fill={skinShadow} />
      <rect x="17" y="6" width="1" height="3" fill={skinShadow} />

      {/* Mouth / Facial Hair */}
      {isVictor ? (
        // Sully's Signature Silver Mustache
        <>
          <rect x="8" y="9" width="8" height="1" fill="#e2e8f0" />
          <rect x="9" y="10" width="6" height="1" fill="#cbd5e1" />
        </>
      ) : isElena ? (
        // Elena Soft Rose Smile
        <rect x="10" y="9" width="4" height="1" fill="#f43f5e" />
      ) : isChloe ? (
        // Chloe Ruby Lips
        <rect x="10" y="9" width="4" height="1" fill="#e11d48" />
      ) : (
        // Nathan Stubble Jawline
        <>
          <rect x="9" y="9" width="6" height="1" fill={skinShadow} />
          <rect x="8" y="10" width="8" height="1" fill="#3f2210" />
          <rect x="10" y="9" width="3" height="1" fill="#693c28" />
        </>
      )}

      {/* Neck Accent */}
      <rect x="10" y="10" width="4" height="2" fill={skinBase} />
      {isNathan && (
        <>
          <rect x="9" y="11" width="6" height="1" fill="#991b1b" />
          <rect x="11" y="11" width="2" height="1" fill="#b91c1c" />
        </>
      )}

      {/* ======================================================== */}
      {/* 2. TORSO & SHIRT                                         */}
      {/* ======================================================== */}
      <rect x="8" y="11" width="8" height="6" fill={shirtColor} />
      <rect x="7" y="12" width="1" height="4" fill={shirtShadow} />
      <rect x="16" y="12" width="1" height="4" fill={shirtShadow} />
      <rect x="8" y="16" width="8" height="1" fill={shirtShadow} />

      {/* V-Neck / Undershirt */}
      <rect x="11" y="11" width="2" height="3" fill={isVictor ? '#f8fafc' : skinBase} />
      {!isElena && <rect x="11" y="12" width="1" height="1" fill="#f1f5f9" />}

      {/* Harness / Holster straps */}
      <rect x="8" y="11" width="2" height="5" fill="#432613" />
      <rect x="14" y="11" width="2" height="5" fill="#432613" />
      <rect x="10" y="13" width="4" height="1" fill="#432613" />
      <rect x="11" y="13" width="1" height="1" fill="#ffd700" />

      {/* Utility Belt & Buckle */}
      <rect x="8" y="17" width="8" height="2" fill="#2a160b" />
      <rect x="11" y="17" width="2" height="2" fill="#ffd700" />
      <rect x="11" y="17" width="1" height="1" fill="#ffffff" />

      {/* ======================================================== */}
      {/* 3. ARMS & HANDS (ANIMATED)                               */}
      {/* ======================================================== */}
      {isCheer ? (
        <>
          <rect x="6" y="8" width="2" height="4" fill={shirtColor} />
          <rect x="5" y="6" width="2" height="3" fill={skinBase} />
          <rect x="4" y="4" width="3" height="3" fill="#ffd700" />
          <rect x="5" y="3" width="1" height="1" fill="#ffffff" />
          <rect x="16" y="8" width="2" height="4" fill={shirtColor} />
          <rect x="17" y="6" width="2" height="3" fill={skinBase} />
        </>
      ) : isSurvey ? (
        <>
          <rect x="6" y="12" width="2" height="3" fill={shirtColor} />
          <rect x="6" y="14" width="2" height="3" fill={skinBase} />
          <rect x="4" y="14" width="4" height="4" fill="#dfc086" />
          <rect x="5" y="15" width="2" height="2" fill="#8c6d23" />
          <rect x="16" y="12" width="2" height="4" fill={shirtColor} />
          <rect x="16" y="15" width="2" height="2" fill={skinBase} />
        </>
      ) : isRun ? (
        runLegFrame === 0 || runLegFrame === 1 ? (
          <>
            <rect x="5" y="12" width="2" height="3" fill={shirtColor} />
            <rect x="4" y="14" width="2" height="3" fill={skinBase} />
            <rect x="16" y="11" width="2" height="3" fill={shirtColor} />
            <rect x="17" y="13" width="2" height="3" fill={skinBase} />
          </>
        ) : runLegFrame === 2 || runLegFrame === 3 ? (
          <>
            <rect x="6" y="12" width="2" height="3" fill={shirtColor} />
            <rect x="6" y="15" width="2" height="2" fill={skinBase} />
            <rect x="16" y="12" width="2" height="3" fill={shirtColor} />
            <rect x="16" y="15" width="2" height="2" fill={skinBase} />
          </>
        ) : (
          <>
            <rect x="6" y="11" width="2" height="3" fill={shirtColor} />
            <rect x="6" y="13" width="2" height="3" fill={skinBase} />
            <rect x="16" y="13" width="2" height="3" fill={shirtColor} />
            <rect x="18" y="15" width="2" height="3" fill={skinBase} />
          </>
        )
      ) : (
        <>
          <rect x="6" y="12" width="2" height="4" fill={shirtColor} />
          <rect x="6" y="15" width="2" height="3" fill={skinBase} />
          <rect x="16" y="12" width="2" height="4" fill={shirtColor} />
          <rect x="16" y="15" width="2" height="3" fill={skinBase} />
        </>
      )}

      {/* ======================================================== */}
      {/* 4. LEGS & BOOTS (ANIMATED 6-FRAME RUN CYCLE)             */}
      {/* ======================================================== */}
      {isRun ? (
        runLegFrame === 0 ? (
          <>
            <rect x="8" y="19" width="3" height="4" fill={pantsColor} />
            <rect x="7" y="23" width="3" height="4" fill={pantsHighlight} />
            <rect x="6" y="27" width="4" height="2" fill="#2a160b" />
            <rect x="5" y="29" width="4" height="1" fill="#100602" />
            <rect x="13" y="19" width="3" height="4" fill={pantsShadow} />
            <rect x="15" y="22" width="3" height="4" fill={pantsColor} />
            <rect x="17" y="25" width="3" height="3" fill="#2a160b" />
            <rect x="18" y="28" width="3" height="1" fill="#100602" />
          </>
        ) : runLegFrame === 1 ? (
          <>
            <rect x="7" y="19" width="4" height="4" fill={pantsColor} />
            <rect x="6" y="23" width="3" height="4" fill={pantsColor} />
            <rect x="5" y="27" width="4" height="2" fill="#2a160b" />
            <rect x="4" y="29" width="4" height="1" fill="#100602" />
            <rect x="13" y="19" width="3" height="4" fill={pantsShadow} />
            <rect x="16" y="22" width="3" height="3" fill={pantsShadow} />
            <rect x="18" y="24" width="3" height="3" fill="#2a160b" />
            <rect x="19" y="27" width="3" height="1" fill="#100602" />
          </>
        ) : runLegFrame === 2 ? (
          <>
            <rect x="9" y="19" width="3" height="5" fill={pantsColor} />
            <rect x="8" y="24" width="3" height="4" fill={pantsHighlight} />
            <rect x="8" y="28" width="4" height="2" fill="#2a160b" />
            <rect x="8" y="30" width="4" height="1" fill="#100602" />
            <rect x="12" y="19" width="3" height="5" fill={pantsShadow} />
            <rect x="13" y="23" width="3" height="4" fill={pantsColor} />
            <rect x="14" y="26" width="3" height="3" fill="#2a160b" />
            <rect x="15" y="29" width="3" height="1" fill="#100602" />
          </>
        ) : runLegFrame === 3 ? (
          <>
            <rect x="12" y="19" width="3" height="4" fill={pantsColor} />
            <rect x="13" y="23" width="3" height="4" fill={pantsHighlight} />
            <rect x="14" y="27" width="4" height="2" fill="#2a160b" />
            <rect x="14" y="29" width="4" height="1" fill="#100602" />
            <rect x="8" y="19" width="3" height="4" fill={pantsShadow} />
            <rect x="6" y="22" width="3" height="4" fill={pantsColor} />
            <rect x="4" y="25" width="3" height="3" fill="#2a160b" />
            <rect x="3" y="28" width="3" height="1" fill="#100602" />
          </>
        ) : runLegFrame === 4 ? (
          <>
            <rect x="12" y="19" width="4" height="4" fill={pantsColor} />
            <rect x="14" y="23" width="3" height="4" fill={pantsColor} />
            <rect x="15" y="27" width="4" height="2" fill="#2a160b" />
            <rect x="15" y="29" width="4" height="1" fill="#100602" />
            <rect x="7" y="19" width="3" height="4" fill={pantsShadow} />
            <rect x="5" y="22" width="3" height="3" fill={pantsShadow} />
            <rect x="3" y="24" width="3" height="3" fill="#2a160b" />
            <rect x="2" y="27" width="3" height="1" fill="#100602" />
          </>
        ) : (
          <>
            <rect x="11" y="19" width="3" height="5" fill={pantsColor} />
            <rect x="12" y="24" width="3" height="4" fill={pantsHighlight} />
            <rect x="12" y="28" width="4" height="2" fill="#2a160b" />
            <rect x="12" y="30" width="4" height="1" fill="#100602" />
            <rect x="8" y="19" width="3" height="5" fill={pantsShadow} />
            <rect x="7" y="23" width="3" height="4" fill={pantsColor} />
            <rect x="6" y="26" width="3" height="3" fill="#2a160b" />
            <rect x="5" y="29" width="3" height="1" fill="#100602" />
          </>
        )
      ) : (
        <>
          <rect x="8" y="19" width="3" height="6" fill={pantsColor} />
          <rect x="8" y="25" width="3" height="3" fill={pantsHighlight} />
          <rect x="7" y="28" width="4" height="2" fill="#2a160b" />
          <rect x="7" y="30" width="4" height="1" fill="#100602" />

          <rect x="13" y="19" width="3" height="6" fill={pantsColor} />
          <rect x="13" y="25" width="3" height="3" fill={pantsShadow} />
          <rect x="13" y="28" width="4" height="2" fill="#2a160b" />
          <rect x="13" y="30" width="4" height="1" fill="#100602" />

          <rect x="11" y="19" width="2" height="2" fill={pantsShadow} />
        </>
      )}
    </svg>
  );
}
