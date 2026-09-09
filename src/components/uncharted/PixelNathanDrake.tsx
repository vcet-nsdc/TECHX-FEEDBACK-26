'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type NathanAnimationState = 'idle' | 'run' | 'survey' | 'cheer' | 'jump';

interface PixelNathanDrakeProps {
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

const QUIPS = [
  "Sic Parvis Magna!",
  "Greatness from small beginnings.",
  "Just a typical day in the field.",
  "Marco!... Polo.",
  "Hold on to your compass!",
  "One step closer to the treasure.",
  "I've got a good feeling about this!",
  "Always keep moving forward.",
];

/**
 * Pixel-art Nathan Drake Miniature Character
 * Handcrafted 24x34 pixel matrix depicting Nathan Drake with:
 * - Signature slate-blue henley shirt & v-neck
 * - Dual leather shoulder holster & side harness
 * - Khaki/tan cargo pants & rugged explorer boots
 * - Messy brown hair & weathered adventurer features
 */
export default function PixelNathanDrake({
  state = 'idle',
  facing = 'right',
  size = 52,
  showSpeechBubble = false,
  speechText,
  showDust = true,
  className = '',
  onClick,
  tooltipText = 'Nathan Drake • Field Recon',
}: PixelNathanDrakeProps) {
  const [frame, setFrame] = useState(0);
  const [internalQuip, setInternalQuip] = useState<string | null>(null);
  const [quipTimer, setQuipTimer] = useState<NodeJS.Timeout | null>(null);

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
    // Trigger fun random quip bubble
    const randomQuip = QUIPS[Math.floor(Math.random() * QUIPS.length)];
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

      // Find bounding boundary
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

      // Check vertical clearance (if character is too close to top of container)
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

  // Calculate run bounce offset based on frame
  const runYOffset = state === 'run' ? (frame % 2 === 0 ? -2 : 0) : 0;
  const idleYOffset = state === 'idle' ? (frame % 2 === 0 ? -0.5 : 0.5) : 0;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative inline-flex flex-col items-center select-none cursor-pointer group ${className}`}
      style={{
        width: size * 0.75,
        height: size,
      }}
      title={tooltipText}
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
              {/* Bubble Pointer Arrow dynamically anchored to Drake */}
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
        <NathanPixelSvg state={state} frame={frame} />
      </div>
    </div>
  );
}

/**
 * Procedural Pixel-Art SVG Matrix for Nathan Drake
 * Coordinates mapped to a 24 x 32 pixel grid.
 */
function NathanPixelSvg({ state, frame }: { state: NathanAnimationState; frame: number }) {
  // Palettes tailored to Nathan Drake's outfit
  const C = {
    // Solid All-Black Explorer Hat
    hatBlackDeep: '#08080a',
    hatBlackMain: '#141419',
    hatBlackShade: '#22222a',
    hatBlackHighlight: '#3c3c47',
    // Hair & Beard
    hairDark: '#2a160b',
    hairMid: '#4e2d17',
    hairLight: '#734423',
    stubble: '#3f2210',
    // Skin & Battle Scars
    skinBase: '#e8b88a',
    skinShadow: '#c89264',
    skinHighlight: '#f7d3b0',
    scratchRed: '#dc2626',
    // Expedition Scarf / Bandana Accent
    scarfRed: '#991b1b',
    scarfLight: '#b91c1c',
    // Slate-Khaki Field Explorer Henley
    shirtBase: '#43586f',
    shirtShadow: '#2c3b4a',
    shirtHighlight: '#5a7594',
    buttons: '#f1f5f9',
    // Leather Expedition Harness & Gear
    holsterDark: '#221209',
    holsterMid: '#432613',
    holsterLight: '#683d1e',
    buckleGold: '#ffd700',
    canteenGreen: '#3f4c38',
    canteenCap: '#d4af37',
    gunMetal: '#333b47',
    // Rugged Khaki Cargo Field Pants & Knee Reinforcements
    pantsBase: '#9c7352',
    pantsShadow: '#765236',
    pantsHighlight: '#b88f6c',
    pantsKnee: '#5e3f28',
    pantsPocket: '#6b482f',
    // Heavy Explorer Trekking Boots
    bootBase: '#2a160b',
    bootSole: '#100602',
    bootLaces: '#d4af37',
    // Relic / Journal / Compass (for cheer or survey)
    gold: '#ffd700',
    parchment: '#dfc086',
  };

  // State-specific leg & arm frame animations
  // Run cycle has 6 frames
  const runLegFrame = frame % 6;
  const isRun = state === 'run';
  const isCheer = state === 'cheer';
  const isSurvey = state === 'survey';

  return (
    <svg
      viewBox="0 0 24 32"
      className="w-full h-full"
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* ======================================================== */}
      {/* 1. SOLID ALL-BLACK ADVENTURER HAT & HEAD                 */}
      {/* ======================================================== */}
      {/* Hat Crown Top & Indent/Pinch */}
      <rect x="9" y="0" width="6" height="1" fill={C.hatBlackHighlight} />
      <rect x="8" y="1" width="8" height="1" fill={C.hatBlackShade} />
      <rect x="11" y="0" width="2" height="1" fill={C.hatBlackDeep} />

      {/* Hat Crown Body */}
      <rect x="7" y="2" width="10" height="2" fill={C.hatBlackMain} />
      <rect x="8" y="2" width="2" height="2" fill={C.hatBlackShade} />
      
      {/* Hat Band (Deep Black) */}
      <rect x="7" y="3" width="10" height="1" fill={C.hatBlackDeep} />

      {/* Wide Black Hat Brim */}
      <rect x="3" y="4" width="18" height="1" fill={C.hatBlackMain} />
      <rect x="2" y="4" width="2" height="1" fill={C.hatBlackHighlight} />
      <rect x="20" y="4" width="2" height="1" fill={C.hatBlackHighlight} />
      <rect x="4" y="4" width="16" height="1" fill={C.hatBlackDeep} />
      <rect x="5" y="4" width="14" height="1" fill={C.hatBlackMain} />

      {/* Hair peeking beneath brim on sides */}
      <rect x="5" y="5" width="2" height="2" fill={C.hairDark} />
      <rect x="17" y="5" width="2" height="2" fill={C.hairDark} />

      {/* Forehead & Face */}
      <rect x="7" y="5" width="10" height="5" fill={C.skinBase} />
      <rect x="8" y="5" width="8" height="1" fill={C.skinHighlight} />

      {/* Eyebrows & Eyes */}
      <rect x="8" y="6" width="3" height="1" fill={C.hairDark} />
      <rect x="13" y="6" width="3" height="1" fill={C.hairDark} />
      <rect x="9" y="7" width="1" height="1" fill="#1b120c" />
      <rect x="14" y="7" width="1" height="1" fill="#1b120c" />

      {/* Nose & Explorer Ears */}
      <rect x="11" y="7" width="2" height="2" fill={C.skinShadow} />
      <rect x="6" y="6" width="1" height="3" fill={C.skinShadow} />
      <rect x="17" y="6" width="1" height="3" fill={C.skinShadow} />

      {/* Stubble Jawline & Determined Mouth */}
      <rect x="9" y="9" width="6" height="1" fill={C.skinShadow} />
      <rect x="8" y="10" width="8" height="1" fill={C.stubble} />
      <rect x="10" y="9" width="3" height="1" fill="#693c28" />

      {/* Neck & Expedition Scarf Bandana Accent */}
      <rect x="10" y="10" width="4" height="2" fill={C.skinBase} />
      <rect x="9" y="11" width="6" height="1" fill={C.scarfRed} />
      <rect x="11" y="11" width="2" height="1" fill={C.scarfLight} />

      {/* ======================================================== */}
      {/* 2. TORSO & FIELD EXPEDITION HENLEY SHIRT                 */}
      {/* ======================================================== */}
      {/* Main Shirt Body */}
      <rect x="8" y="11" width="8" height="6" fill={C.shirtBase} />
      <rect x="7" y="12" width="1" height="4" fill={C.shirtShadow} />
      <rect x="16" y="12" width="1" height="4" fill={C.shirtShadow} />
      <rect x="8" y="16" width="8" height="1" fill={C.shirtShadow} />

      {/* Henley V-Neck opening & Buttons */}
      <rect x="11" y="11" width="2" height="3" fill={C.skinBase} />
      <rect x="11" y="12" width="1" height="1" fill={C.buttons} />
      <rect x="11" y="14" width="1" height="1" fill={C.buttons} />
      <rect x="12" y="11" width="1" height="3" fill={C.shirtHighlight} />

      {/* ======================================================== */}
      {/* 3. SHOULDER HARNESS, FIELD COMPASS & GEAR               */}
      {/* ======================================================== */}
      {/* Dual shoulder leather straps */}
      <rect x="8" y="11" width="2" height="5" fill={C.holsterMid} />
      <rect x="14" y="11" width="2" height="5" fill={C.holsterMid} />
      <rect x="9" y="11" width="1" height="5" fill={C.holsterLight} />
      <rect x="14" y="11" width="1" height="5" fill={C.holsterDark} />

      {/* Cross-chest strap & Brass Buckle */}
      <rect x="10" y="13" width="4" height="1" fill={C.holsterMid} />
      <rect x="11" y="13" width="1" height="1" fill={C.buckleGold} />

      {/* Field Compass / Telemetry Dial on Left Chest Strap */}
      <rect x="8" y="14" width="2" height="2" fill={C.holsterDark} />
      <rect x="8" y="14" width="1" height="1" fill={C.gold} />

      {/* Underarm Holster Pouch */}
      <rect x="6" y="14" width="2" height="3" fill={C.holsterDark} />
      <rect x="6" y="14" width="1" height="1" fill={C.gunMetal} />

      {/* ======================================================== */}
      {/* 4. EXPEDITION UTILITY BELT, CANTEEN & FLASK              */}
      {/* ======================================================== */}
      <rect x="8" y="17" width="8" height="2" fill={C.bootBase} />
      {/* Heavy Explorer Brass Buckle */}
      <rect x="11" y="17" width="2" height="2" fill={C.buckleGold} />
      <rect x="11" y="17" width="1" height="1" fill="#fff" />
      {/* Field Canteen / Relic Pouch on Hip */}
      <rect x="6" y="16" width="2" height="3" fill={C.canteenGreen} />
      <rect x="6" y="15" width="1" height="1" fill={C.canteenCap} />
      <rect x="15" y="17" width="2" height="2" fill={C.holsterLight} />

      {/* ======================================================== */}
      {/* 5. ARMS & HANDS (ANIMATED)                               */}
      {/* ======================================================== */}
      {isCheer ? (
        // VICTORY POSE: Drake holding golden relic high in air
        <>
          {/* Left Arm raised holding Golden Relic */}
          <rect x="6" y="8" width="2" height="4" fill={C.shirtBase} />
          <rect x="5" y="6" width="2" height="3" fill={C.skinBase} />
          <rect x="4" y="4" width="3" height="3" fill={C.gold} />
          <rect x="5" y="3" width="1" height="1" fill="#ffffff" />

          {/* Right Arm fist pump */}
          <rect x="16" y="8" width="2" height="4" fill={C.shirtBase} />
          <rect x="17" y="6" width="2" height="3" fill={C.skinBase} />
        </>
      ) : isSurvey ? (
        // SURVEYING POSE: Drake holding ancient parchment journal & compass
        <>
          <rect x="6" y="12" width="2" height="3" fill={C.shirtBase} />
          <rect x="6" y="14" width="2" height="3" fill={C.skinBase} />
          {/* Open Journal */}
          <rect x="4" y="14" width="4" height="4" fill={C.parchment} />
          <rect x="5" y="15" width="2" height="2" fill="#8c6d23" />

          <rect x="16" y="12" width="2" height="4" fill={C.shirtBase} />
          <rect x="16" y="15" width="2" height="2" fill={C.skinBase} />
        </>
      ) : isRun ? (
        // RUNNING CYCLE ARMS: Dynamic swinging arms
        runLegFrame === 0 || runLegFrame === 1 ? (
          // Right arm back, left arm forward
          <>
            <rect x="5" y="12" width="2" height="3" fill={C.shirtBase} />
            <rect x="4" y="14" width="2" height="3" fill={C.skinBase} />
            <rect x="16" y="11" width="2" height="3" fill={C.shirtBase} />
            <rect x="17" y="13" width="2" height="3" fill={C.skinBase} />
          </>
        ) : runLegFrame === 2 || runLegFrame === 3 ? (
          // Neutral transition
          <>
            <rect x="6" y="12" width="2" height="3" fill={C.shirtBase} />
            <rect x="6" y="15" width="2" height="2" fill={C.skinBase} />
            <rect x="16" y="12" width="2" height="3" fill={C.shirtBase} />
            <rect x="16" y="15" width="2" height="2" fill={C.skinBase} />
          </>
        ) : (
          // Right arm forward, left arm back
          <>
            <rect x="6" y="11" width="2" height="3" fill={C.shirtBase} />
            <rect x="6" y="13" width="2" height="3" fill={C.skinBase} />
            <rect x="16" y="13" width="2" height="3" fill={C.shirtBase} />
            <rect x="18" y="15" width="2" height="3" fill={C.skinBase} />
          </>
        )
      ) : (
        // IDLE ARMS: Drake relaxed with thumbs hooked near belt/holster
        <>
          <rect x="6" y="12" width="2" height="4" fill={C.shirtBase} />
          <rect x="6" y="15" width="2" height="3" fill={C.skinBase} />
          <rect x="16" y="12" width="2" height="4" fill={C.shirtBase} />
          <rect x="16" y="15" width="2" height="3" fill={C.skinBase} />
        </>
      )}

      {/* ======================================================== */}
      {/* 6. CARGO PANTS & LEGS (ANIMATED)                         */}
      {/* ======================================================== */}
      {isRun ? (
        // RUNNING STRIDE FRAMES
        runLegFrame === 0 ? (
          // Frame 0: Left leg kicking forward, Right leg pushing back
          <>
            {/* Left Leg Forward */}
            <rect x="8" y="19" width="3" height="4" fill={C.pantsBase} />
            <rect x="7" y="23" width="3" height="4" fill={C.pantsHighlight} />
            <rect x="6" y="27" width="4" height="2" fill={C.bootBase} />
            <rect x="5" y="29" width="4" height="1" fill={C.bootSole} />

            {/* Right Leg Trailing */}
            <rect x="13" y="19" width="3" height="4" fill={C.pantsShadow} />
            <rect x="15" y="22" width="3" height="4" fill={C.pantsBase} />
            <rect x="17" y="25" width="3" height="3" fill={C.bootBase} />
            <rect x="18" y="28" width="3" height="1" fill={C.bootSole} />
          </>
        ) : runLegFrame === 1 ? (
          // Frame 1: Full sprint stride
          <>
            {/* Front Leg Extended */}
            <rect x="7" y="19" width="4" height="4" fill={C.pantsBase} />
            <rect x="6" y="23" width="3" height="4" fill={C.pantsBase} />
            <rect x="5" y="27" width="4" height="2" fill={C.bootBase} />
            <rect x="4" y="29" width="4" height="1" fill={C.bootSole} />

            {/* Back Leg Extended */}
            <rect x="13" y="19" width="3" height="4" fill={C.pantsShadow} />
            <rect x="16" y="22" width="3" height="3" fill={C.pantsShadow} />
            <rect x="18" y="24" width="3" height="3" fill={C.bootBase} />
            <rect x="19" y="27" width="3" height="1" fill={C.bootSole} />
          </>
        ) : runLegFrame === 2 ? (
          // Frame 2: Passing stride (legs crossover)
          <>
            <rect x="9" y="19" width="3" height="5" fill={C.pantsBase} />
            <rect x="8" y="24" width="3" height="4" fill={C.pantsHighlight} />
            <rect x="8" y="28" width="4" height="2" fill={C.bootBase} />
            <rect x="8" y="30" width="4" height="1" fill={C.bootSole} />

            <rect x="12" y="19" width="3" height="5" fill={C.pantsShadow} />
            <rect x="13" y="23" width="3" height="4" fill={C.pantsBase} />
            <rect x="14" y="26" width="3" height="3" fill={C.bootBase} />
            <rect x="15" y="29" width="3" height="1" fill={C.bootSole} />
          </>
        ) : runLegFrame === 3 ? (
          // Frame 3: Right leg kicking forward, Left leg pushing back
          <>
            {/* Right Leg Forward */}
            <rect x="12" y="19" width="3" height="4" fill={C.pantsBase} />
            <rect x="13" y="23" width="3" height="4" fill={C.pantsHighlight} />
            <rect x="14" y="27" width="4" height="2" fill={C.bootBase} />
            <rect x="14" y="29" width="4" height="1" fill={C.bootSole} />

            {/* Left Leg Trailing */}
            <rect x="8" y="19" width="3" height="4" fill={C.pantsShadow} />
            <rect x="6" y="22" width="3" height="4" fill={C.pantsBase} />
            <rect x="4" y="25" width="3" height="3" fill={C.bootBase} />
            <rect x="3" y="28" width="3" height="1" fill={C.bootSole} />
          </>
        ) : runLegFrame === 4 ? (
          // Frame 4: Right leg extended full stride
          <>
            <rect x="12" y="19" width="4" height="4" fill={C.pantsBase} />
            <rect x="14" y="23" width="3" height="4" fill={C.pantsBase} />
            <rect x="15" y="27" width="4" height="2" fill={C.bootBase} />
            <rect x="15" y="29" width="4" height="1" fill={C.bootSole} />

            <rect x="7" y="19" width="3" height="4" fill={C.pantsShadow} />
            <rect x="5" y="22" width="3" height="3" fill={C.pantsShadow} />
            <rect x="3" y="24" width="3" height="3" fill={C.bootBase} />
            <rect x="2" y="27" width="3" height="1" fill={C.bootSole} />
          </>
        ) : (
          // Frame 5: Second passing stride
          <>
            <rect x="11" y="19" width="3" height="5" fill={C.pantsBase} />
            <rect x="12" y="24" width="3" height="4" fill={C.pantsHighlight} />
            <rect x="12" y="28" width="4" height="2" fill={C.bootBase} />
            <rect x="12" y="30" width="4" height="1" fill={C.bootSole} />

            <rect x="8" y="19" width="3" height="5" fill={C.pantsShadow} />
            <rect x="7" y="23" width="3" height="4" fill={C.pantsBase} />
            <rect x="6" y="26" width="3" height="3" fill={C.bootBase} />
            <rect x="5" y="29" width="3" height="1" fill={C.bootSole} />
          </>
        )
      ) : (
        // IDLE / STANDING LEGS
        <>
          {/* Left Leg */}
          <rect x="8" y="19" width="3" height="6" fill={C.pantsBase} />
          <rect x="8" y="20" width="1" height="3" fill={C.pantsPocket} />
          <rect x="8" y="25" width="3" height="3" fill={C.pantsHighlight} />
          <rect x="7" y="28" width="4" height="2" fill={C.bootBase} />
          <rect x="7" y="30" width="4" height="1" fill={C.bootSole} />

          {/* Right Leg */}
          <rect x="13" y="19" width="3" height="6" fill={C.pantsBase} />
          <rect x="15" y="20" width="1" height="3" fill={C.pantsPocket} />
          <rect x="13" y="25" width="3" height="3" fill={C.pantsShadow} />
          <rect x="13" y="28" width="4" height="2" fill={C.bootBase} />
          <rect x="13" y="30" width="4" height="1" fill={C.bootSole} />

          {/* Crotch/Pants seam */}
          <rect x="11" y="19" width="2" height="2" fill={C.pantsShadow} />
        </>
      )}
    </svg>
  );
}
