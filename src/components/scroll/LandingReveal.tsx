'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { DEPARTMENT_OPTIONS } from '@/lib/mock-data';
import { getSubmittedFeedbackForUser } from '@/lib/expeditionData';
import { TechXLogoText } from '@/components/uncharted/TechXTypography';
import { getNetworkTier, getDeviceTier, isSaveDataEnabled } from '@/lib/network-tier';

const TOTAL_FRAMES = 120;
const FRAME_PREFIX = '/frames/frame_';
// WebP frames downscaled for smooth mobile & desktop scrub
const FRAME_SUFFIX = '_delay-0.016s.webp';
// Scroll distance the frame sequence plays out over, in viewport heights.
// Reduced to 200 for a 2-scroll experience: Logo → Showcase + Begin button.
const SCROLL_HEIGHT_VH = 200;

function frameSrc(i: number, suffix: string = FRAME_SUFFIX) {
  // Internal frame index is 0-based (0..TOTAL_FRAMES-1); filenames on disk
  // are 1-based (frame_000.webp .. frame_119.webp).
  return `${FRAME_PREFIX}${String(i).padStart(3, '0')}${suffix}`;
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
    image: '/avatar/nathan.png',
  },
  {
    id: 'victor',
    name: 'Victor Sullivan (Sully)',
    displayName: 'Victor Sullivan',
    subName: '(Sully)',
    image: '/avatar/victor.png',
  },
  {
    id: 'elena',
    name: 'Elena Fisher',
    displayName: 'Elena Fisher',
    image: '/avatar/elena.png',
  },
  {
    id: 'chloe',
    name: 'Chloe Frazer',
    displayName: 'Chloe Frazer',
    image: '/avatar/chloe.png',
  },
];

function checkIsLowEnd(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Manual query param override for testing (?lowend=true or ?perf=low or ?lowend=false)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lowend') === 'true' || params.get('perf') === 'low') return true;
    if (params.get('lowend') === 'false' || params.get('perf') === 'high') return false;
  } catch { }

  // 2. Network constraints apply to ALL devices (desktop, laptop, mobile alike)
  const netTier = getNetworkTier();
  if (netTier === 'slow' || isSaveDataEnabled()) {
    return true;
  }

  // 3. Hardware constraints (low memory / limited cores)
  const deviceTier = getDeviceTier();
  if (deviceTier === 'low') {
    return true;
  }

  return false;
}

export default function LandingReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [showFormOverlay, setShowFormOverlay] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);



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

  useEffect(() => {
    if (user) {
      if (!name) setName(user.name);
      if (!department) setDepartment(user.department);
      if (!email) setEmail(user.email);
    }
  }, [user]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Fast, silky smooth spring interpolation tuned to eliminate mobile micro-jitter
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 34,
    mass: 0.1,
    restDelta: 0.001,
  });

  // Ratchet that resets when the user is back at the very top of the page.
  const maxProgress = useMotionValue(0);
  useEffect(() => {
    const unsub = smoothProgress.on('change', (v) => {
      if (v <= 0.01) {
        maxProgress.set(v);
      } else if (v > maxProgress.get()) {
        maxProgress.set(v);
      }
    });
    return () => unsub();
  }, [smoothProgress, maxProgress]);

  // ─── 2-scroll layout ───────────────────────────────────────────
  // Scroll 1 (0–40%):  TechX Logo — visible at top, fades out
  // Scroll 2 (40–100%): Product Showcase + treasure + Begin Exploration (stays)
  // Registration form: overlay triggered by button click only
  // ────────────────────────────────────────────────────────────────

  // Scroll 1: Logo — fully visible at top, fades out by ~40%
  const logoOpacity = useTransform(maxProgress, [0, 0.15, 0.40], [1, 1, 0]);
  const logoScale = useTransform(maxProgress, [0, 0.40], [1, 0.88]);

  // Scroll 2: Product Showcase + treasure + CTA — appears at 40%, stays visible
  const midOpacity = useTransform(smoothProgress, [0.38, 0.52], [0, 1]);
  const midY = useTransform(smoothProgress, [0.38, 0.52], [20, 0]);

  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.08], [1, 0]);

  // Subtle, GPU-accelerated parallax for low-end static background on scroll
  const staticScale = useTransform(smoothProgress, [0, 1], [1, 1.06]);
  const staticY = useTransform(smoothProgress, [0, 1], ['0%', '-3%']);

  // Resilient 3-tier preloader:
  // - slow / low-end: 0 frames, preloads static hero, readies immediately upon image load (no fake timers)
  // - moderate: progressive batching with concurrency 2, readies after 6 frames, loads rest in background
  // - fast: full sequence with concurrency 6, readies after 15 frames, loads rest in background
  // Frame preloader — loads frames immediately, no loading screen delay
  useEffect(() => {
    const isLowEndDevice = checkIsLowEnd();
    setIsLowEnd(isLowEndDevice);
    const netTier = getNetworkTier();

    if (isLowEndDevice) {
      // LOW-END: preload static hero only, ready immediately on load
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      const staticSrc = isMobile
        ? '/assets/images/scroll-static-mobile.webp'
        : '/assets/images/scroll-static-desktop.webp';

      const img = new window.Image();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setReady(true);
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = staticSrc;

      // Failsafe
      const failsafe = setTimeout(finish, 1500);
      return () => clearTimeout(failsafe);
    }

    // MODERATE / FAST TIER: load frames, ready as soon as enough are decoded
    const PRELOAD_CONCURRENCY = netTier === 'moderate' ? 2 : 6;
    const TARGET_INITIAL_FRAMES = netTier === 'moderate' ? 6 : 15;

    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let loadedCount = 0;
    let cursor = 0;
    let isTransitioning = false;

    const checkReady = () => {
      if (isTransitioning) return;
      if (loadedCount >= TARGET_INITIAL_FRAMES || loadedCount >= 1) {
        isTransitioning = true;
        setReady(true);
      }
    };

    const resolve = () => {
      loadedCount++;
      checkReady();
      pump();
    };

    const loadImage = (i: number) => {
      const img = new window.Image();
      img.decoding = 'async';
      img.fetchPriority = i < TARGET_INITIAL_FRAMES ? 'high' : 'low';
      img.onload = () => {
        if ('decode' in img) {
          img.decode().then(() => resolve()).catch(() => resolve());
        } else {
          resolve();
        }
      };
      img.onerror = resolve;
      img.src = frameSrc(i);
      images[i] = img;
    };

    const pump = () => {
      while (cursor < TOTAL_FRAMES && cursor - loadedCount < PRELOAD_CONCURRENCY) {
        loadImage(cursor);
        cursor++;
      }
    };

    pump();
    framesRef.current = images;

    // Failsafe: if frames stall, force ready
    const failsafe = setTimeout(() => {
      if (!isTransitioning) {
        isTransitioning = true;
        setReady(true);
      }
    }, 5500);

    return () => clearTimeout(failsafe);
  }, []);

  const drawFrame = useCallback((index: number) => {
    if (isLowEnd) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find requested frame or closest loaded frame fallback to prevent blank flashes during fast scrub
    let img = framesRef.current[index];
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = framesRef.current[index - offset];
        if (prev && prev.complete && prev.naturalWidth > 0) {
          img = prev;
          break;
        }
        const next = framesRef.current[index + offset];
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
  }, [isLowEnd]);

  // Drive the canvas frame smoothly on scroll change (0% CPU when stationary)
  useEffect(() => {
    if (!ready || isLowEnd) return;
    drawFrame(currentFrameRef.current);

    let rafId: number | null = null;
    let lastDrawn = currentFrameRef.current;

    const unsub = smoothProgress.on('change', (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      const idx = Math.min(Math.floor(clamped * TOTAL_FRAMES), TOTAL_FRAMES - 1);

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
  }, [ready, isLowEnd, smoothProgress, drawFrame]);

  // Toggle whether the mid-section (Showcase + button) can capture pointer input
  const [showMid, setShowMid] = useState(false);
  useEffect(() => {
    const unsub = smoothProgress.on('change', (v) => {
      setShowMid(v > 0.40);
    });
    return () => unsub();
  }, [smoothProgress]);

  // Canvas resize with DPR clamp & address-bar debounce to prevent black frame flashes on mobile
  useEffect(() => {
    if (isLowEnd) return;
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
  }, [ready, isLowEnd, drawFrame]);

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
    const submitted = getSubmittedFeedbackForUser(email);
    const complete = submitted.length >= 25 || (typeof window !== 'undefined' && localStorage.getItem(`completion_${email}`) === 'true');
    setTimeout(() => {
      router.push(complete ? '/finish' : '/labs');
    }, 250);
  };

  return (
    <section ref={containerRef} className="relative bg-black" style={{ height: `${SCROLL_HEIGHT_VH}vh` }}>
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-black transform-gpu">
        {/* Upscaled Static Scroll Background (serves low-end devices & instant 0ms underlay for high-end) */}
        <motion.div
          className={`absolute inset-0 h-full w-full pointer-events-none select-none transform-gpu transition-opacity duration-500 ${isLowEnd ? 'opacity-100' : ready ? 'opacity-0' : 'opacity-100'
            }`}
          style={isLowEnd ? { scale: staticScale, y: staticY } : undefined}
        >
          {/* Desktop upscaled static image */}
          <Image
            src="/assets/images/scroll-static-desktop.webp"
            alt="TechX Expedition Camp"
            fill
            priority={isLowEnd}
            className="hidden md:block object-cover object-center"
            sizes="100vw"
          />
          {/* Mobile upscaled static image */}
          <Image
            src="/assets/images/scroll-static-mobile.webp"
            alt="TechX Expedition Camp"
            fill
            priority={isLowEnd}
            className="block md:hidden object-cover object-center"
            sizes="100vw"
          />
        </motion.div>

        {/* Frame sequence canvas, scrubbed by scroll (completely omitted on low-end devices to save >400MB GPU texture memory) */}
        {!isLowEnd && (
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 transform-gpu ${ready ? 'opacity-100' : 'opacity-0'
              }`}
          />
        )}



        {/* Centered logo, visible at the very top of the page */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4"
          style={{ opacity: logoOpacity, scale: logoScale, willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          <TechXLogoText size="hero" animated={true} />
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center text-white/90 font-cinzel"
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
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 text-center px-4"
          style={{ opacity: midOpacity, y: midY, pointerEvents: showMid ? 'auto' : 'none', willChange: 'transform, opacity', transform: 'translateZ(0)' }}
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

          {/* Lab 1, 2, 3 indicator — Clear, bold, high-contrast badges */}
          <div className="flex items-center gap-2 sm:gap-4 my-1">
            <span
              style={{ fontFamily: "var(--font-oswald), var(--font-geist-sans), sans-serif", letterSpacing: '0.12em' }}
              className="text-xs sm:text-sm font-bold uppercase px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-400/60 text-emerald-300 drop-shadow-[0_2px_8px_rgba(16,185,129,0.6)] shadow-md"
            >
              Lab 502
            </span>
            <span className="text-amber-400/80 font-bold">•</span>
            <span
              style={{ fontFamily: "var(--font-oswald), var(--font-geist-sans), sans-serif", letterSpacing: '0.12em' }}
              className="text-xs sm:text-sm font-bold uppercase px-3 py-1 rounded-full bg-sky-950/70 border border-sky-400/60 text-sky-300 drop-shadow-[0_2px_8px_rgba(56,189,248,0.6)] shadow-md"
            >
              Lab 508
            </span>
            <span className="text-amber-400/80 font-bold">•</span>
            <span
              style={{ fontFamily: "var(--font-oswald), var(--font-geist-sans), sans-serif", letterSpacing: '0.12em' }}
              className="text-xs sm:text-sm font-bold uppercase px-3 py-1 rounded-full bg-orange-950/70 border border-orange-400/60 text-orange-300 drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)] shadow-md"
            >
              Lab 509
            </span>
            <span className="text-amber-400/80 font-bold">•</span>
            <span
              style={{ fontFamily: "var(--font-oswald), var(--font-geist-sans), sans-serif", letterSpacing: '0.12em' }}
              className="text-xs sm:text-sm font-bold uppercase px-3 py-1 rounded-full bg-amber-950/70 border border-amber-400/60 text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)] shadow-md"
            >
              Lab 510
            </span>
          </div>

          {/* Circular Avatar Choosing Menu instead of Enter button */}
          <div className="flex flex-col items-center mt-1 sm:mt-2">
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
                    className="flex flex-col items-center group cursor-pointer focus:outline-none touch-manipulation"
                    aria-label={`Select ${avatar.name}`}
                  >
                    {/* Circular Avatar Medallion */}
                    <div
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full transition-all duration-200 ${
                        isSelected
                          ? 'border-[3px] border-[#ffd700] ring-4 ring-[#d4af37]/60 shadow-[0_0_24px_rgba(255,215,0,0.85)] scale-105'
                          : 'border-2 sm:border-[3px] border-[#8c6d23] group-hover:border-[#ffd700] shadow-[0_6px_18px_rgba(0,0,0,0.9)] group-hover:shadow-[0_0_18px_rgba(212,175,55,0.7)]'
                      }`}
                    >
                      {/* Rotating Celestial Dashed Ring on Selected */}
                      {isSelected && (
                        <span className="absolute -inset-1.5 rounded-full border border-dashed border-[#ffd700] animate-[spin_12s_linear_infinite] pointer-events-none" />
                      )}

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
                        className={`text-[11px] sm:text-xs md:text-sm font-black tracking-wide leading-tight text-center transition-colors ${
                          isSelected
                            ? 'text-[#ffd700] drop-shadow-[0_2px_6px_rgba(212,175,55,1)]'
                            : 'text-[#f5e6cc] group-hover:text-[#ffd700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
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
              className="mt-4 sm:mt-5 flex flex-col items-center gap-1.5 cursor-pointer select-none"
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
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
    </section>
  );
}
