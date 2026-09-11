'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { DEPARTMENT_OPTIONS } from '@/lib/mock-data';
import { getSubmittedFeedbackForUser } from '@/lib/expeditionData';
import { TechXLogoText } from '@/components/uncharted/TechXTypography';
import { getNetworkTier, getDeviceTier, isSaveDataEnabled } from '@/lib/network-tier';

// Cap frames to 65: scrubs right up to avatar/showcase appearance, saving 50% extra frames
const TOTAL_SOURCE_FRAMES = 65;
const FRAME_PREFIX = '/frames/frame_';
// WebP frames downscaled for smooth mobile & desktop scrub
const FRAME_SUFFIX = '_delay-0.016s.webp';

function frameSrc(i: number, suffix: string = FRAME_SUFFIX) {
  return `${FRAME_PREFIX}${String(i).padStart(3, '0')}${suffix}`;
}

// Sample every 2nd frame (33 frames total) — silky smooth scrub, cuts network payload in half
const FRAME_STRIDE = 2;
const SAMPLED_INDICES: number[] = [];
for (let i = 0; i < TOTAL_SOURCE_FRAMES; i += FRAME_STRIDE) {
  SAMPLED_INDICES.push(i);
}
if (SAMPLED_INDICES[SAMPLED_INDICES.length - 1] !== TOTAL_SOURCE_FRAMES - 1) {
  SAMPLED_INDICES.push(TOTAL_SOURCE_FRAMES - 1);
}

export interface AvatarOption {
  id: string;
  name: string;
  displayName: string;
  subName?: string;
  image: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'nathan',
    name: 'Nathan Drake',
    displayName: 'Nathan Drake',
    image: '/avatar/nathan.webp',
  },
  {
    id: 'victor',
    name: 'Victor Sullivan (Sully)',
    displayName: 'Victor Sullivan',
    subName: '(Sully)',
    image: '/avatar/victor.webp',
  },
  {
    id: 'elena',
    name: 'Elena Fisher',
    displayName: 'Elena Fisher',
    image: '/avatar/elena.webp',
  },
  {
    id: 'chloe',
    name: 'Chloe Frazer',
    displayName: 'Chloe Frazer',
    image: '/avatar/chloe.webp',
  },
];

export default function LandingReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [showFormOverlay, setShowFormOverlay] = useState(false);

  const router = useRouter();
  const { user, login } = useUser();

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [departmentError, setDepartmentError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption>(AVATAR_OPTIONS[0]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_avatar');
      if (stored) {
        const found = AVATAR_OPTIONS.find((a) => a.name === stored || a.id === stored);
        if (found) setSelectedAvatar(found);
      }
    }
  }, []);

  const handleSelectAvatar = useCallback(
    (avatar: AvatarOption) => {
      setSelectedAvatar(avatar);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user_avatar', avatar.name);
          localStorage.setItem('user_avatar_image', avatar.image);
        } catch {}
      }
      setShowFormOverlay(true);
    },
    []
  );

  // Lock window and body scroll completely so no blank space or viewport jumping occurs
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origTouchAction = document.body.style.touchAction;
    const origOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouchAction;
      document.body.style.overscrollBehavior = origOverscroll;
    };
  }, []);

  useEffect(() => {
    if (user) {
      if (!name) setName(user.name);
      if (!department) setDepartment(user.department);
      if (!email) setEmail(user.email);
    }
  }, [user]);

  // Virtual progress scrubber: 0 (initial logo) to 1 (full showcase + avatars)
  const virtualProgress = useMotionValue(0);

  // Smooth spring interpolation for silky 60fps frame scrubbing
  const smoothProgress = useSpring(virtualProgress, {
    stiffness: 260,
    damping: 30,
    mass: 0.1,
    restDelta: 0.001,
  });

  // Attach non-passive gesture scrubber to drive frames without moving the browser window
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (showFormOverlay) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      const step = delta / 850;
      const current = virtualProgress.get();
      const next = Math.max(0, Math.min(1, current + step));
      virtualProgress.set(next);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY;
      touchStartY = currentY;
      const step = deltaY / (window.innerHeight * 0.75);
      const current = virtualProgress.get();
      const next = Math.max(0, Math.min(1, current + step));
      virtualProgress.set(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFormOverlay) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        virtualProgress.set(Math.min(1, virtualProgress.get() + 0.12));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        virtualProgress.set(Math.max(0, virtualProgress.get() - 0.12));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFormOverlay, virtualProgress]);

  // Scroll 1: Logo — fully visible at top, fades out cleanly
  const logoOpacity = useTransform(smoothProgress, [0, 0.12, 0.35], [1, 1, 0]);
  const logoScale = useTransform(smoothProgress, [0, 0.35], [1, 0.90]);

  // Scroll 2: Product Showcase + treasure + CTA — appears smoothly at 38%..54%, perfectly stationary
  const midOpacity = useTransform(smoothProgress, [0.38, 0.54], [0, 1]);

  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.08], [1, 0]);

  const drawFrame = useCallback((sourceIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let img = framesRef.current[sourceIndex];
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Find closest loaded frame
      for (let offset = 1; offset < TOTAL_SOURCE_FRAMES; offset++) {
        const prev = framesRef.current[sourceIndex - offset];
        if (prev && prev.complete && prev.naturalWidth > 0) {
          img = prev;
          break;
        }
        const next = framesRef.current[sourceIndex + offset];
        if (next && next.complete && next.naturalWidth > 0) {
          img = next;
          break;
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;

    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }, []);

  // Frame preloader — loads frame 0 immediately, batches sampled frames in parallel
  useEffect(() => {
    let isCancelled = false;
    const images: (HTMLImageElement | null)[] = new Array(TOTAL_SOURCE_FRAMES).fill(null);
    framesRef.current = images as HTMLImageElement[];

    // 1. Immediately load frame 0 so the canvas paints within 50ms
    const firstImg = new window.Image();
    firstImg.decoding = 'async';
    const onFirstLoad = () => {
      if (isCancelled) return;
      images[0] = firstImg;
      setReady(true);
      drawFrame(0);
    };
    firstImg.onload = onFirstLoad;
    firstImg.onerror = () => {
      if (isCancelled) return;
      setReady(true);
    };
    firstImg.src = frameSrc(0);
    if (firstImg.complete) {
      onFirstLoad();
    }

    // Safety fallback: ensure ready is set even if image callbacks delay
    const fallbackTimer = setTimeout(() => {
      if (!isCancelled) setReady(true);
    }, 250);

    // 2. Concurrently load sampled frames in batches of 6
    const CONCURRENCY = 6;
    let indexCursor = 0;
    let activeWorkers = 0;

    const loadNext = () => {
      if (isCancelled) return;
      while (activeWorkers < CONCURRENCY && indexCursor < SAMPLED_INDICES.length) {
        const frameIdx = SAMPLED_INDICES[indexCursor++];
        activeWorkers++;

        const img = new window.Image();
        img.decoding = 'async';
        const onFinish = () => {
          activeWorkers--;
          if (!isCancelled) {
            images[frameIdx] = img;
            if (frameIdx === currentFrameRef.current) {
              drawFrame(frameIdx);
            }
            loadNext();
          }
        };
        img.onload = onFinish;
        img.onerror = onFinish;
        img.src = frameSrc(frameIdx);
      }
    };

    loadNext();

    return () => {
      isCancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [drawFrame]);

  // Drive the canvas frame smoothly on scroll change (0% CPU when stationary)
  useEffect(() => {
    if (!ready) return;

    // Draw frame matching initial scroll position
    const initialProgress = Math.max(0, Math.min(1, smoothProgress.get()));
    const initialIdx = Math.min(Math.floor(initialProgress * TOTAL_SOURCE_FRAMES), TOTAL_SOURCE_FRAMES - 1);
    currentFrameRef.current = initialIdx;
    drawFrame(initialIdx);

    let rafId: number | null = null;
    let lastDrawn = initialIdx;

    const unsub = smoothProgress.on('change', (rawVal) => {
      const v = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal)) || 0;
      const clamped = Math.max(0, Math.min(1, v));
      const idx = Math.min(Math.floor(clamped * TOTAL_SOURCE_FRAMES), TOTAL_SOURCE_FRAMES - 1);

      if (idx !== lastDrawn) {
        lastDrawn = idx;
        currentFrameRef.current = idx;
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            drawFrame(idx);
            rafId = null;
          });
        }
      }
    });

    return () => {
      unsub();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ready, smoothProgress, drawFrame]);

  // Toggle whether the mid-section (Showcase + button) can capture pointer input
  const [showMid, setShowMid] = useState(false);
  useEffect(() => {
    const unsub = smoothProgress.on('change', (rawVal) => {
      const v = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal)) || 0;
      setShowMid(v > 0.38);
    });
    return () => unsub();
  }, [smoothProgress]);

  // Canvas resize with DPR clamp & address-bar debounce to prevent black frame flashes on mobile
  useEffect(() => {
    let prevWidth = 0;
    let prevHeight = 0;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Ignore small vertical resizes caused by mobile address bar collapsing/expanding
      if (prevWidth === w && Math.abs(prevHeight - h) < 160) {
        return;
      }

      prevWidth = w;
      prevHeight = h;

      // Limit canvas resolution to max 1.5x DPR on high-density displays for silky mobile GPU performance
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (ready) drawFrame(currentFrameRef.current);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [ready, drawFrame]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailValid = email.includes('@') && email.includes('.');
    const hasName = name.trim().length > 0;
    const hasDepartment = department.trim().length > 0;

    if (!hasName) setNameError(true);
    if (!hasDepartment) setDepartmentError(true);
    if (!email || !emailValid) setEmailError(true);

    if (!hasName || !hasDepartment || !email || !emailValid) return;

    setSubmitting(true);
    login({ name: name.trim(), department, email: email.trim(), avatar: selectedAvatar.image });
    const emailKey = email.trim().toLowerCase();
    const isConcluded =
      typeof window !== 'undefined' &&
      (localStorage.getItem('techx_certificate_downloaded_global') === 'true' ||
        localStorage.getItem('techx_expedition_concluded_global') === 'true' ||
        localStorage.getItem(`techx_certificate_downloaded_${emailKey}`) === 'true' ||
        localStorage.getItem(`techx_expedition_concluded_${emailKey}`) === 'true');

    setTimeout(() => {
      router.push(isConcluded ? '/finish' : '/labs');
    }, 250);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-black select-none touch-none transform-gpu"
      style={{ touchAction: 'none' }}
    >
        {/* Instant static underlay while frame 0 decodes */}
        <div
          className={`absolute inset-0 h-full w-full pointer-events-none select-none transform-gpu transition-opacity duration-500 ${
            ready ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Desktop static underlay */}
          <Image
            src="/assets/images/scroll-static-desktop.webp"
            alt="TechX Expedition Camp"
            fill
            priority
            className="hidden md:block object-cover object-center"
            sizes="100vw"
          />
          {/* Mobile static underlay */}
          <Image
            src="/assets/images/scroll-static-mobile.webp"
            alt="TechX Expedition Camp"
            fill
            priority
            className="block md:hidden object-cover object-center"
            sizes="100vw"
          />
        </div>

        {/* Frame sequence canvas scrubbed by scroll — ALWAYS MOUNTED & GPU ACCELERATED */}
        <canvas
          ref={canvasRef}
          className={`pointer-events-none select-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 transform-gpu ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Centered logo, visible at the very top of the page */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4"
          style={{ opacity: logoOpacity, scale: logoScale, willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          <TechXLogoText size="hero" animated={true} />
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          onClick={() => virtualProgress.set(0.6)}
          className="cursor-pointer pointer-events-auto absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center text-white/90 font-cinzel select-none"
          style={{ opacity: scrollHintOpacity, willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              Scroll to venture forth
            </p>
            <span className="inline-block h-4 w-px bg-gradient-to-b from-white to-transparent animate-pulse" />
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 text-center px-4"
          style={{ opacity: midOpacity, willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          {/* Hidden treasure hint — clean, crisp, visible Cinzel font */}
          <p
            style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif", letterSpacing: '0.24em' }}
            className="text-xs sm:text-sm uppercase font-bold text-[#ffd700] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
          >
            ✦ A Hidden Treasure Awaits ✦
          </p>

          {/* Product Showcase — Title font kept intact as requested */}
          <h2
            style={{ fontFamily: "var(--font-base02), 'Base02', serif" }}
            className="text-5xl sm:text-7xl md:text-8xl font-extrabold text-white tracking-wider leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
          >
            Product Showcase
          </h2>

          {/* Expedition Lab Sectors — Authentic Uncharted expedition badge styling */}
          <div className="flex items-center gap-2 sm:gap-3 my-1">
            {['Lab 502', 'Lab 508', 'Lab 509', 'Lab 510'].map((lab, index) => (
              <div key={lab} className="flex items-center gap-2 sm:gap-3">
                <span
                  style={{
                    fontFamily: "var(--font-cinzel), 'Cinzel', serif",
                    letterSpacing: '0.14em',
                  }}
                  className="text-xs sm:text-sm font-bold uppercase px-3 py-1 rounded-md bg-[#16100a]/85 border border-[#8c6d23]/60 text-[#f5e6cc] shadow-[0_2px_8px_rgba(0,0,0,0.85)] tracking-wider"
                >
                  {lab}
                </span>
                {index < 3 && (
                  <span className="text-[#8c6d23] text-xs select-none">✦</span>
                )}
              </div>
            ))}
          </div>

          {/* Circular Avatar Choosing Menu instead of Enter button */}
          <div className={`flex flex-col items-center mt-1 sm:mt-2 ${showMid ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className="flex items-start justify-center gap-3 sm:gap-6 md:gap-8">
              {AVATAR_OPTIONS.map((avatar, idx) => {
                const isSelected = selectedAvatar.id === avatar.id;
                return (
                  <motion.button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleSelectAvatar(avatar)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.08, duration: 0.4 }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none touch-manipulation pointer-events-auto"
                    aria-label={`Select ${avatar.name}`}
                  >
                    {/* Circular Avatar Medallion — Clean, historic adventurer coin */}
                    <div
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full transition-all duration-200 ${
                        isSelected
                          ? 'border-2 sm:border-[3px] border-[#d4af37] shadow-[0_6px_16px_rgba(0,0,0,0.85)]'
                          : 'border-2 sm:border-[2.5px] border-[#8c6d23]/75 group-hover:border-[#d4af37] shadow-[0_6px_16px_rgba(0,0,0,0.85)]'
                      }`}
                    >
                      {/* Avatar Image */}
                      <div className="relative w-full h-full rounded-full overflow-hidden bg-[#1c0f05]">
                        <Image
                          src={avatar.image}
                          alt={avatar.name}
                          fill
                          sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
                          className="object-cover object-center transition-transform duration-300 group-hover:scale-110"
                          priority
                        />
                      </div>
                    </div>

                    {/* Character Name Tag — Crisp, sharp, legible Cinzel font */}
                    <div className="mt-2 flex flex-col items-center max-w-[76px] sm:max-w-[100px] md:max-w-[120px]">
                      <span
                        style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                        className={`text-[11px] sm:text-xs md:text-sm font-bold tracking-wide leading-tight text-center transition-colors ${
                          isSelected
                            ? 'text-[#ffd700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                            : 'text-[#f5e6cc] group-hover:text-[#ffd700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                        }`}
                      >
                        {avatar.displayName}
                      </span>
                      {avatar.subName && (
                        <span
                          style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                          className="text-[9.5px] sm:text-[11px] text-[#e5c386] font-bold leading-none mt-0.5 tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                        >
                          {avatar.subName}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Instruction Text below avatars — Crisp, high-contrast, ultra-visible */}
            <motion.div
              animate={{ opacity: [0.9, 1, 0.9], y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className={`mt-4 sm:mt-5 flex flex-col items-center gap-1.5 cursor-pointer select-none ${showMid ? 'pointer-events-auto' : 'pointer-events-none'}`}
              onClick={() => handleSelectAvatar(selectedAvatar)}
            >
              <p
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif", letterSpacing: '0.14em' }}
                className="text-xs sm:text-sm md:text-base uppercase text-[#ffd700] drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] font-black flex items-center justify-center gap-2"
              >
                <span className="text-amber-400 text-sm">✦</span>
                <span>Choose your avatar to start exploration</span>
                <span className="text-amber-400 text-sm">✦</span>
              </p>
              <span
                style={{ fontFamily: "var(--font-geist-sans), sans-serif", letterSpacing: '0.18em' }}
                className="text-[10px] sm:text-xs font-bold text-[#f5e6cc]/90 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              >
                Tap an explorer to begin expedition ➔
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Registration form overlay — appears ONLY when Begin Exploration is clicked */}
        <AnimatePresence>
          {showFormOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 pointer-events-auto"
              onClick={(e) => { if (e.target === e.currentTarget) setShowFormOverlay(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 30 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
                className="relative w-full max-w-3xl select-none"
              >
                {/* Map + compass, pinned to the top-left corner of the tablet */}
                <div className="pointer-events-none absolute -left-8 top-12 z-20 hidden -rotate-6 flex-col items-start sm:-left-20 sm:top-24 sm:flex">
                  <Image
                    src="/tablet/map.webp"
                    alt=""
                    width={192}
                    height={192}
                    style={{ height: 'auto' }}
                    className="w-24 drop-shadow-[0_5px_10px_rgba(0,0,0,0.6)] sm:w-48"
                  />
                  <Image
                    src="/tablet/compass.webp"
                    alt=""
                    width={112}
                    height={112}
                    style={{ height: 'auto' }}
                    className="z-30 ml-4 mt-[-2rem] w-16 drop-shadow-xl sm:ml-8 sm:mt-[-4rem] sm:w-28"
                  />
                </div>

                {/* Photo + coins, pinned to the bottom-right corner */}
                <Image
                  src="/tablet/photo.webp"
                  alt=""
                  width={160}
                  height={160}
                  style={{ height: 'auto' }}
                  className="pointer-events-none absolute -right-6 bottom-10 z-20 hidden w-24 rotate-[15deg] drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)] sm:-right-4 sm:bottom-24 sm:block sm:w-40"
                />
                <Image
                  src="/tablet/coins.webp"
                  alt=""
                  width={128}
                  height={128}
                  style={{ height: 'auto' }}
                  className="pointer-events-none absolute bottom-4 right-2 z-30 hidden w-20 drop-shadow-md sm:bottom-10 sm:right-0 sm:block sm:w-32"
                />

                {/* Stone tablet card */}
                <div className="relative z-10 flex w-full flex-col items-center justify-start px-6 pb-12 pt-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] sm:px-16 sm:pb-16 sm:pt-16">
                  <Image
                    src="/tablet/stone-tablet.webp"
                    alt=""
                    fill
                    sizes="(max-width: 768px) 90vw, 700px"
                    className="-z-10 object-fill"
                    priority
                  />
                  <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center">
                    <Image
                      src="/tablet/techx-feedback-header.webp"
                      alt="Welcome to TechX Feedback"
                      width={900}
                      height={483}
                      priority
                      style={{ height: 'auto' }}
                      className="w-full max-w-[85%] drop-shadow-md sm:max-w-[90%] md:max-w-[95%] lg:max-w-full"
                    />
                    <p className="tablet-subtitle -mt-2 text-center text-base sm:mt-0 sm:text-xl">
                      Please enter your details to continue
                    </p>

                    {/* Selected Explorer Indicator */}
                    {selectedAvatar && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c0f05]/80 border border-[#d4af37]/60 text-[#fde047] text-xs font-mono my-1.5 shadow-inner">
                        <div className="relative w-5 h-5 rounded-full overflow-hidden border border-[#ffd700] shrink-0">
                          <Image src={selectedAvatar.image} alt={selectedAvatar.name} fill className="object-cover" />
                        </div>
                        <span className="truncate">Explorer: <strong>{selectedAvatar.name}</strong></span>
                      </div>
                    )}

                    <form
                      onSubmit={handleSubmit}
                      noValidate
                      className="-ml-2 mt-2 flex w-[85%] flex-col gap-3.5 sm:ml-0 sm:mt-8 sm:w-full sm:gap-6"
                    >
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name..."
                        required
                        className={`tablet-input h-12 w-full px-5 text-base font-bold sm:h-16 sm:px-7 sm:text-2xl ${nameError ? 'error-shake' : ''
                          }`}
                        onAnimationEnd={() => setNameError(false)}
                      />

                      <div className="relative">
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                          className={`tablet-input h-12 w-full appearance-none px-5 text-base font-bold sm:h-16 sm:px-7 sm:text-xl ${departmentError ? 'error-shake' : ''
                            }`}
                          onAnimationEnd={() => setDepartmentError(false)}
                        >
                          <option value="" disabled hidden>
                            Select Department...
                          </option>
                          {DEPARTMENT_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email..."
                          required
                          className={`tablet-input h-12 w-full px-5 text-base font-bold sm:h-16 sm:px-7 sm:text-2xl ${emailError ? 'error-shake' : ''
                            }`}
                          onAnimationEnd={() => setEmailError(false)}
                        />
                        {emailError && (
                          <p className="tablet-subtitle mt-2 ml-2 text-sm sm:text-lg">
                            Please include &apos;@&apos; and &apos;.&apos; in your email address.
                          </p>
                        )}
                      </div>

                      <div className="mt-2 flex w-full justify-center">
                        <button
                          type="submit"
                          disabled={submitting}
                          className={`relative h-14 w-48 bg-contain bg-center bg-no-repeat transition-transform duration-150 active:scale-95 disabled:opacity-75 sm:h-20 sm:w-64 flex items-center justify-center cursor-pointer touch-manipulation ${submitting ? 'brightness-125 animate-pulse' : ''
                            }`}
                          style={{ backgroundImage: "url('/tablet/portal-button.webp')" }}
                        >
                          <span className="sr-only">
                            {submitting ? 'Entering…' : 'Enter Portal'}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
