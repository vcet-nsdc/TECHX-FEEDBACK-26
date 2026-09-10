'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AntiqueCompassIcon,
  TreasureKeyIcon,
  RelicCoinIcon,
} from './RusticIcons';
import { appendTreasure } from '@/lib/expedition-storage';
import {
  baseExpeditionLabs,
  isLabCompleted,
  getSubmittedFeedbackForUser,
  CheckpointNode,
} from '@/lib/expeditionData';
import { useLabs } from '@/context/LabsContext';
import PixelNathanDrake, { NathanAnimationState } from './uncharted/PixelNathanDrake';
import ProductIcon from './ProductIcon';

// Cubic bezier evaluation along map dotted trail
function sampleCubicBezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): [number, number] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  const x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0];
  const y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1];
  return [x, y];
}

// Calculate exact percentage position strictly along the map dotted line for any progress [0..1]
export function getTrailPoint(progress: number): { x: number; y: number } {
  const p = Math.max(0, Math.min(1, progress));
  let ptX = 82;
  let ptY = 590;

  if (p <= 0.25) {
    const t = p / 0.25;
    [ptX, ptY] = sampleCubicBezier([82, 590], [65, 505], [115, 363], [212, 363], t);
  } else if (p <= 0.50) {
    const t = (p - 0.25) / 0.25;
    [ptX, ptY] = sampleCubicBezier([212, 363], [295, 363], [345, 488], [435, 488], t);
  } else if (p <= 0.75) {
    const t = (p - 0.50) / 0.25;
    [ptX, ptY] = sampleCubicBezier([435, 488], [520, 488], [570, 390], [569, 305], t);
  } else {
    const t = (p - 0.75) / 0.25;
    [ptX, ptY] = sampleCubicBezier([569, 305], [567, 195], [440, 172], [342, 205], t);
  }

  return {
    x: Number(((ptX / 1000) * 100).toFixed(2)),
    y: Number(((ptY / 625) * 100).toFixed(2)),
  };
}

interface TreasureCardProps {
  completedCount?: number;
  targetCount?: number;
  userEmail: string;
  currentLabId?: string;
  lab1Completed?: boolean;
  lab2Completed?: boolean;
  lab3Completed?: boolean;
  completedLabIds?: string[];
}

export interface ProductWithLab extends CheckpointNode {
  labId: string;
  labName: string;
  labTitle: string;
  themeType?: string;
  category?: string;
  globalIndex: number;
}

export interface ProductClues {
  clue1: string; // Unlocked when user completes Lab 1 (Mission & About)
  clue2: string; // Unlocked when user completes Lab 2 (Logo & Visual Insignia)
  clue3: string; // Unlocked when user completes Lab 3 (Company / Project Name Cipher)
  aboutText?: string;
  icon?: string;
  iconLabel?: string;
  cipherPattern?: string;
  nameHint?: string;
  labNum?: string;
}

export interface RelicReward {
  id: string;
  name: string;
  rarity: 'Legendary' | 'Mythic' | 'Artifact';
  origin: string;
  inscription: string;
  lore: string;
  type: 'astrolabe' | 'key' | 'coin';
}

const SECRET_RELICS: RelicReward[] = [
  {
    id: 'relic-key',
    name: 'TechX Golden Key',
    rarity: 'Legendary',
    origin: 'TechX 2026',
    inscription: 'Excellence in Research & Innovation',
    lore: 'Awarded for completing all labs and solving the mystery project.',
    type: 'key',
  },
  {
    id: 'relic-compass',
    name: 'TechX Navigator Compass',
    rarity: 'Legendary',
    origin: 'TechX 2026',
    inscription: 'Guiding Future Explorers',
    lore: 'Awarded for completing all labs and solving the mystery project.',
    type: 'astrolabe',
  },
  {
    id: 'relic-coin',
    name: 'TechX Gold Medal',
    rarity: 'Legendary',
    origin: 'TechX 2026',
    inscription: 'TechX Feedback Challenge',
    lore: 'Awarded for completing all labs and solving the mystery project.',
    type: 'coin',
  },
];

// Generates an authentic Uncharted-style letter cipher pattern
export function generateCipherPattern(name: string): string {
  if (!name) return 'A _ _ Z';
  const words = name.trim().split(/\s+/);
  return words
    .map((word) => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '');
      if (!clean) return word;
      if (clean.length === 1) return clean.toUpperCase();
      if (clean.length === 2) return `${clean[0].toUpperCase()} _`;
      if (clean.length <= 4) {
        return `${clean[0].toUpperCase()} _ ${clean[clean.length - 1].toUpperCase()}`;
      }
      const mid = Math.floor(clean.length / 2);
      return clean
        .split('')
        .map((ch, idx) => {
          if (idx === 0 || idx === clean.length - 1 || idx === mid) {
            return ch.toUpperCase();
          }
          return '_';
        })
        .join(' ');
    })
    .join('    ');
}

// Clean dynamic clue generator for projects from DB
export function getProductClues(product: ProductWithLab): ProductClues {
  const labNum =
    (product.labName + ' ' + (product.labTitle || '')).match(/\b(5\d{2}|\d{3})\b/)?.[1] ||
    (product.labId === '1' ? '502' : product.labId === '2' ? '508' : '509');

  const desc = product.description?.trim() || 'Software and technology project.';
  const icon = product.icon || '📦';

  const emojiNames: Record<string, string> = {
    '🪐': 'planet with rings',
    '☀️': 'sun',
    '💻': 'laptop',
    '🤖': 'robot',
    '👓': 'glasses',
    '🌐': 'globe',
    '🚀': 'rocket',
    '🤝': 'handshake',
    '🔬': 'microscope',
    '📝': 'notepad',
    '💡': 'lightbulb',
    '🖥️': 'desktop computer',
    '📊': 'bar chart',
    '📈': 'growth graph',
    '📱': 'mobile phone',
    '🍏': 'green apple',
    '🛡️': 'shield',
    '🦾': 'robotic arm',
    '🪑': 'office desk',
    '🩹': 'bandage',
  };
  const emojiLabel = emojiNames[icon] || 'symbol';

  const words = product.name.trim().split(/\s+/);
  const cleanLetters = product.name.replace(/[^a-zA-Z0-9]/g, '');
  const firstChar = cleanLetters[0]?.toUpperCase() || 'A';
  const lastChar = cleanLetters[cleanLetters.length - 1]?.toUpperCase() || 'Z';
  const cipherPattern = generateCipherPattern(product.name);

  // Clue 1: What it is & where
  const clue1 = `Located in Lab ${labNum}. ${desc}`;

  // Clue 2: The logo / emoji
  const clue2 = `The project logo is the ${icon} (${emojiLabel}) emoji.`;

  // Clue 3: The project name & fill-in-the-blank letters
  const wordCountStr = words.length === 1 ? '1 word' : `${words.length} words`;
  const clue3 = `The name has ${wordCountStr} (${cleanLetters.length} letters), starts with '${firstChar}' and ends with '${lastChar}':`;

  return {
    clue1,
    clue2,
    clue3,
    aboutText: desc,
    icon,
    iconLabel: emojiLabel,
    cipherPattern,
    nameHint: `Starts with '${firstChar}' • Ends with '${lastChar}'`,
    labNum,
  };
}

// Clean string for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function TreasureCard({
  completedCount = 0,
  targetCount = 7,
  userEmail = 'explorer@field.recon',
  currentLabId: _currentLabId = '1',
  lab1Completed: propLab1Completed,
  lab2Completed: propLab2Completed,
  lab3Completed: propLab3Completed,
  completedLabIds,
}: TreasureCardProps) {
  const { labs: dbLabs } = useLabs();
  const [guessInput, setGuessInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [claimedRelic, setClaimedRelic] = useState<RelicReward | null>(null);
  const [localFeedbackVersion, setLocalFeedbackVersion] = useState(0);

  // Listen for feedback updates across tabs or components
  useEffect(() => {
    const handleFeedbackUpdate = () => {
      setLocalFeedbackVersion((v) => v + 1);
    };
    window.addEventListener('feedbackSubmitted', handleFeedbackUpdate);
    window.addEventListener('storage', handleFeedbackUpdate);
    return () => {
      window.removeEventListener('feedbackSubmitted', handleFeedbackUpdate);
      window.removeEventListener('storage', handleFeedbackUpdate);
    };
  }, []);

  const normalizedEmail = useMemo(() => {
    return (userEmail || 'explorer@field.recon').toLowerCase().trim();
  }, [userEmail]);

  // Compute live lab completion status
  const isLab1Done = useMemo(() => {
    if (propLab1Completed !== undefined) return propLab1Completed;
    if (completedLabIds?.includes('1') || completedLabIds?.includes('a')) return true;
    return isLabCompleted('1', normalizedEmail);
  }, [propLab1Completed, completedLabIds, normalizedEmail, localFeedbackVersion]);

  const isLab2Done = useMemo(() => {
    if (propLab2Completed !== undefined) return propLab2Completed;
    if (completedLabIds?.includes('2') || completedLabIds?.includes('c')) return true;
    return isLabCompleted('2', normalizedEmail);
  }, [propLab2Completed, completedLabIds, normalizedEmail, localFeedbackVersion]);

  const isLab3Done = useMemo(() => {
    if (propLab3Completed !== undefined) return propLab3Completed;
    if (completedLabIds?.includes('3') || completedLabIds?.includes('d')) return true;
    return isLabCompleted('3', normalizedEmail);
  }, [propLab3Completed, completedLabIds, normalizedEmail, localFeedbackVersion]);

  const completedLabsCount = (isLab1Done ? 1 : 0) + (isLab2Done ? 1 : 0) + (isLab3Done ? 1 : 0);

  // User submitted product IDs across all labs
  const submittedProductIds = useMemo(() => {
    return getSubmittedFeedbackForUser(normalizedEmail);
  }, [normalizedEmail, localFeedbackVersion]);

  // Product pool from all 3 base labs (supports live database override from useLabs)
  const allProducts: ProductWithLab[] = useMemo(() => {
    const l1 = dbLabs['1'] || baseExpeditionLabs['1'];
    const l2 = dbLabs['2'] || baseExpeditionLabs['2'];
    const l3 = dbLabs['3'] || baseExpeditionLabs['3'];
    const labsList = [l1, l2, l3].filter(Boolean);

    const pool: ProductWithLab[] = [];
    let globalCounter = 0;
    labsList.forEach((l) => {
      if (l.checkpoints) {
        l.checkpoints.forEach((cp) => {
          pool.push({
            ...cp,
            labId: l.id,
            labName: l.name,
            labTitle: l.title,
            themeType: l.themeType,
            globalIndex: globalCounter++,
          });
        });
      }
    });
    return pool;
  }, [dbLabs]);

  // Total products completed across all expedition sectors
  const completedProductsCount = useMemo(() => {
    return Math.max(completedCount || 0, submittedProductIds.length);
  }, [completedCount, submittedProductIds]);

  const totalProductsCount = useMemo(() => {
    return allProducts.length > 0 ? allProducts.length : targetCount || 22;
  }, [allProducts, targetCount]);

  // Unlocked clues state (unlocked via "Get Clue" button click)
  const [unlockedClues, setUnlockedClues] = useState<{ 1: boolean; 2: boolean; 3: boolean }>({
    1: false,
    2: false,
    3: false,
  });
  const [isDispatching, setIsDispatching] = useState<number | null>(null);
  const [targetProgressOverride, setTargetProgressOverride] = useState<number | null>(null);

  // Load persistent unlocked clues
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const c1 = localStorage.getItem(`treasure_clue_unlocked_1_${normalizedEmail}`) === 'true';
      const c2 = localStorage.getItem(`treasure_clue_unlocked_2_${normalizedEmail}`) === 'true';
      const c3 = localStorage.getItem(`treasure_clue_unlocked_3_${normalizedEmail}`) === 'true';
      setUnlockedClues({ 1: c1, 2: c2, 3: c3 });
    } catch { }
  }, [normalizedEmail, localFeedbackVersion]);

  // Overall trail progress strictly driven by unlocked clues stage (Cross to Cross)
  const productProgressFraction = useMemo(() => {
    if (targetProgressOverride !== null) return targetProgressOverride;
    if (isVerified || unlockedClues[3]) return 1.0;
    if (unlockedClues[2]) return 0.75;
    if (unlockedClues[1]) return 0.25;
    return 0; // Starts right at Camp Trailhead
  }, [targetProgressOverride, isVerified, unlockedClues]);

  // Exact continuous percentage position along the map dotted line
  const currentPosition = useMemo(() => {
    return getTrailPoint(productProgressFraction);
  }, [productProgressFraction]);

  // 3 Waypoints strictly aligned along the authentic map image trail
  const mapWaypoints = useMemo(
    () => [
      {
        id: 'sector1',
        label: 'Lab 502',
        title: 'Lab 502 • Clue 1',
        roman: 'I',
        x: 21.2,
        y: 58.1,
        isDone: unlockedClues[1],
        isCross: false,
        clueNum: 1,
      },
      {
        id: 'sector2',
        label: 'Lab 508',
        title: 'Lab 508 • Clue 2',
        roman: 'II',
        x: 56.9,
        y: 48.8,
        isDone: unlockedClues[2],
        isCross: false,
        clueNum: 2,
      },
      {
        id: 'sector3',
        label: 'Lab 509',
        title: 'Lab 509 • Secret Vault',
        roman: 'III',
        x: 34.2,
        y: 32.8,
        isDone: unlockedClues[3],
        isCross: true,
        isFinalX: true,
        clueNum: 3,
      },
    ],
    [unlockedClues]
  );

  const [nathanState, setNathanState] = useState<NathanAnimationState>('idle');
  const [activeCrossClue, setActiveCrossClue] = useState<number | null>(null);
  const [journeyKeyframes, setJourneyKeyframes] = useState<{ x: string[]; y: string[] } | null>(null);

  const facing = useMemo<'right' | 'left'>(() => {
    return productProgressFraction >= 0.7 ? 'left' : 'right';
  }, [productProgressFraction]);

  // Dispatch explorer running along the trail upon clicking "Reveal Clue"
  const handleGetClue = (clueNum: 1 | 2 | 3, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDispatching !== null) return;

    setIsDispatching(clueNum);
    setNathanState('run');

    const startP = productProgressFraction;
    const endP = clueNum === 1 ? 0.25 : clueNum === 2 ? 0.75 : 1.0;

    const steps = 36;
    const kfX: string[] = [];
    const kfY: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = startP + (endP - startP) * (i / steps);
      const pt = getTrailPoint(t);
      kfX.push(`${pt.x}%`);
      kfY.push(`${pt.y}%`);
    }

    setJourneyKeyframes({ x: kfX, y: kfY });
    setTargetProgressOverride(endP);
    setActiveCrossClue(clueNum);

    setTimeout(() => {
      setUnlockedClues((prev) => ({ ...prev, [clueNum]: true }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(`treasure_clue_unlocked_${clueNum}_${normalizedEmail}`, 'true');
        localStorage.setItem(`treasure_clue_unlocked_${clueNum}_${userEmail}`, 'true');
      }
      setJourneyKeyframes(null);
      setIsDispatching(null);
      setNathanState('idle');
    }, 1850);
  };

  useEffect(() => {
    if (isDispatching === null) {
      setNathanState('idle');
    }
  }, [isDispatching]);

  const handleNathanAnimationComplete = () => {
    if (isDispatching === null) {
      setNathanState('idle');
    }
  };

  // Deterministically select & persist 1 target product for this user
  const targetProduct = useMemo(() => {
    if (allProducts.length === 0) return null;

    if (typeof window !== 'undefined') {
      const storedId =
        localStorage.getItem(`treasure_target_product_${normalizedEmail}`) ||
        localStorage.getItem(`treasure_target_product_${userEmail}`);
      if (storedId) {
        const found = allProducts.find((p) => p.id === storedId);
        if (found) return found;
      }
    }

    const hash = normalizedEmail
      .split('')
      .reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 19), 0);

    const chosen = allProducts[Math.abs(hash) % allProducts.length];
    if (typeof window !== 'undefined' && chosen) {
      localStorage.setItem(`treasure_target_product_${normalizedEmail}`, chosen.id);
    }
    return chosen;
  }, [allProducts, normalizedEmail, userEmail]);

  const targetClues = useMemo(() => {
    if (!targetProduct) return null;
    return getProductClues(targetProduct);
  }, [targetProduct]);

  // Load verified state & claimed relic from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedRelic =
        localStorage.getItem(`treasure_character_relic_${normalizedEmail}`) ||
        localStorage.getItem(`treasure_character_relic_${userEmail}`);
      if (storedRelic) {
        setClaimedRelic(JSON.parse(storedRelic));
      } else {
        setClaimedRelic(null);
      }

      const storedVerified =
        localStorage.getItem(`treasure_verified_${normalizedEmail}`) ||
        localStorage.getItem(`treasure_verified_${userEmail}`);
      if (storedVerified === 'true') {
        setIsVerified(true);
        setStatusMessage('Correct! Mystery project solved.');
      } else {
        setIsVerified(false);
        setStatusMessage(null);
      }
    } catch { }
  }, [normalizedEmail, userEmail, localFeedbackVersion]);

  // Handle User Guess / Verification
  const handleVerifyGuess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetProduct || isVerified) return;

    const cleanInput = normalizeName(guessInput);
    if (!cleanInput) {
      setStatusMessage('Please enter a project name.');
      return;
    }

    const cleanTargetName = normalizeName(targetProduct.name);
    const noSpaceInput = cleanInput.replace(/\s+/g, '');
    const noSpaceTarget = cleanTargetName.replace(/\s+/g, '');

    // Allow flexible matching:
    // 1. Exact match
    // 2. Space-agnostic match (e.g. 'asset orbit' vs 'assetorbit')
    // 3. Substring match for substantial names (>= 3 chars)
    // 4. Parentheses stripped match (e.g. 'led light' for 'led light (frequency)')
    const isCorrect =
      cleanInput === cleanTargetName ||
      noSpaceInput === noSpaceTarget ||
      cleanTargetName.startsWith(cleanInput) ||
      cleanInput.startsWith(cleanTargetName) ||
      (cleanInput.length >= 4 && cleanTargetName.includes(cleanInput)) ||
      (cleanTargetName.length >= 4 && cleanInput.includes(cleanTargetName));

    if (isCorrect) {
      setIsVerified(true);
      setStatusMessage('✦ Correct! Mystery project solved.');

      const charCodeSum = normalizedEmail.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const chosen = claimedRelic || SECRET_RELICS[charCodeSum % SECRET_RELICS.length];
      setClaimedRelic(chosen);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`treasure_character_relic_${normalizedEmail}`, JSON.stringify(chosen));
        localStorage.setItem(`treasure_verified_${normalizedEmail}`, 'true');
        localStorage.setItem(`treasure_verified_${userEmail}`, 'true');
        appendTreasure(normalizedEmail, chosen.id);
      }
    } else {
      setIsShaking(true);
      setStatusMessage('Not quite right. Check the 3 clues above and try again!');
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
        className="relative w-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.88)] select-none"
      >
        {/* Parchment Card Container */}
        <div
          style={{
            backgroundImage: `url('/assets/images/torn-card-bg.webp')`,
          }}
          className="relative w-full bg-[length:100%_100%] bg-no-repeat bg-center px-7 sm:px-11 pt-7 sm:pt-9 pb-8 sm:pb-10 flex flex-col justify-between text-[#241308]"
        >
          {/* Top Right Wax Seal Badge */}
          <div className="absolute top-4 right-5 sm:top-5 sm:right-8 w-12 h-12 pointer-events-none opacity-90 z-20">
            {isVerified ? (
              <div className="w-11 h-11 rounded-full border-2 border-dashed border-[#8b261d] flex items-center justify-center rotate-12 bg-[#8b261d]/20 shadow-md">
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className="text-[9px] font-black text-[#8b261d] uppercase tracking-wider"
                >
                  SOLVED
                </span>
              </div>
            ) : completedLabsCount === 0 ? (
              <div className="w-11 h-11 rounded-full border-2 border-dashed border-[#8b6943]/60 flex items-center justify-center -rotate-6 bg-[#241308]/10 shadow-sm">
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className="text-[9px] font-black text-[#6b4516] uppercase tracking-wider"
                >
                  LOCKED
                </span>
              </div>
            ) : (
              <div className="w-11 h-11 rounded-full border-2 border-dashed border-[#8b6943] flex items-center justify-center rotate-12 bg-[#8b6943]/15 shadow-sm">
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className="text-[9px] font-black text-[#6b4516] uppercase tracking-wider"
                >
                  ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Section Header with Proper Visible Fonts */}
          <div className="mb-3 px-1 flex flex-col items-start pr-14">
            <div className="flex items-center gap-2">
              <span className="text-[#b38920] text-lg sm:text-xl animate-pulse">✦</span>
              <h2
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                className="text-xl sm:text-2xl md:text-3xl font-black text-[#1c0f05] tracking-wide leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]"
              >
                EXPEDITION TREASURE MAP
              </h2>
            </div>
            <p
              style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
              className="text-xs sm:text-sm font-semibold text-[#5c3710] mt-0.5 tracking-normal leading-snug"
            >
              Solve the mystery project by uncovering 3 Sector Clues from the expedition labs.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* VINTAGE TREASURE MAP CANVAS WITH NATHAN DRAKE & WAYPOINTS                 */}
          {/* ========================================================================= */}
          <div className="my-2 select-none">
            <div
              style={{
                backgroundImage: `url('/assets/images/pirate_trail_map.png')`,
              }}
              data-nathan-container="true"
              className="relative w-full aspect-[16/9.2] bg-[length:100%_100%] bg-center bg-no-repeat rounded-lg overflow-visible select-none border border-[#8b6943]/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
            >
              {/* Dynamic Dotted Trail Highlight Overlay */}
              <svg
                viewBox="0 0 1000 625"
                className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="goldBarGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <linearGradient id="goldBarGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="25%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#fffbeb" />
                    <stop offset="75%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>

                  <mask id="trailHoleMask">
                    <rect x="0" y="0" width="1000" height="625" fill="#ffffff" />
                    <circle cx="82" cy="590" r="14" fill="#000000" />
                    {!unlockedClues[1] && <circle cx="212" cy="363" r="14" fill="#000000" />}
                    {!unlockedClues[2] && <circle cx="569" cy="305" r="14" fill="#000000" />}
                  </mask>
                </defs>

                {/* Base Inked Dotted Trail */}
                <path
                  d="M 82 590 C 65 505, 115 363, 212 363 C 295 363, 345 488, 435 488 C 520 488, 570 390, 569 305 C 567 195, 440 172, 342 205"
                  fill="none"
                  stroke="#3b2311"
                  strokeWidth="3"
                  strokeDasharray="6 8"
                  strokeLinecap="round"
                  opacity="0.7"
                  mask="url(#trailHoleMask)"
                />

                {/* Layer 1: Ambient Gold Glow Aura */}
                {productProgressFraction > 0 && (
                  <motion.path
                    d="M 82 590 C 65 505, 115 363, 212 363 C 295 363, 345 488, 435 488 C 520 488, 570 390, 569 305 C 567 195, 440 172, 342 205"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="11"
                    strokeLinecap="round"
                    opacity="0.6"
                    filter="url(#goldBarGlow)"
                    mask="url(#trailHoleMask)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: productProgressFraction }}
                    transition={{ duration: 1.85, ease: 'linear' }}
                  />
                )}

                {/* Layer 2: Glowing Dotted Line */}
                {productProgressFraction > 0 && (
                  <motion.path
                    d="M 82 590 C 65 505, 115 363, 212 363 C 295 363, 345 488, 435 488 C 520 488, 570 390, 569 305 C 567 195, 440 172, 342 205"
                    fill="none"
                    stroke="url(#goldBarGrad)"
                    strokeWidth="6.5"
                    strokeDasharray="8 10"
                    strokeLinecap="round"
                    filter="url(#goldBarGlow)"
                    mask="url(#trailHoleMask)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: productProgressFraction }}
                    transition={{ duration: 1.85, ease: 'linear' }}
                  />
                )}

                {/* Layer 3: Brilliant Core Dots */}
                {productProgressFraction > 0 && (
                  <motion.path
                    d="M 82 590 C 65 505, 115 363, 212 363 C 295 363, 345 488, 435 488 C 520 488, 570 390, 569 305 C 567 195, 440 172, 342 205"
                    fill="none"
                    stroke="#fffdf0"
                    strokeWidth="3.2"
                    strokeDasharray="8 10"
                    strokeLinecap="round"
                    mask="url(#trailHoleMask)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: productProgressFraction }}
                    transition={{ duration: 1.85, ease: 'linear' }}
                  />
                )}
              </svg>

              {/* Trailhead Camp Point */}
              <div
                style={{ left: '8.2%', top: '94.4%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-auto cursor-pointer group"
                title="Expedition Basecamp"
              >
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-transparent border-[2.5px] border-[#0a0502] shadow-[0_1px_4px_rgba(0,0,0,0.45)] flex items-center justify-center group-hover:scale-110 transition-transform" />
              </div>

              {/* Waypoints Along the Trail */}
              {mapWaypoints.map((wp) => {
                const isFinalX = wp.isFinalX;
                const isSelectedClue = activeCrossClue === wp.clueNum;

                return (
                  <div
                    key={wp.id}
                    style={{ left: `${wp.x}%`, top: `${wp.y}%` }}
                    onClick={() => {
                      if (wp.clueNum) {
                        setActiveCrossClue(activeCrossClue === wp.clueNum ? null : wp.clueNum);
                      }
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-auto cursor-pointer group"
                    title={`${wp.title}${wp.clueNum ? ` • Click to view Clue ${wp.clueNum}` : ''}`}
                  >
                    {isFinalX ? (
                      <div
                        className={`relative flex items-center justify-center transition-all duration-300 ${
                          wp.isDone
                            ? 'scale-125 drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]'
                            : isSelectedClue
                            ? 'scale-120 drop-shadow-[0_0_10px_rgba(212,175,55,0.95)]'
                            : 'opacity-90 group-hover:scale-110'
                        }`}
                      >
                        <span
                          className={`font-serif font-black text-3xl sm:text-4xl leading-none select-none ${
                            wp.isDone
                              ? 'text-[#ef4444] animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                              : isSelectedClue
                              ? 'text-[#ffd700]'
                              : 'text-[#851c1c]/90'
                          }`}
                        >
                          ✕
                        </span>
                      </div>
                    ) : wp.isDone ? (
                      <div className="relative flex items-center justify-center transition-all duration-300 scale-120 drop-shadow-[0_0_8px_rgba(212,175,55,0.95)]">
                        <span className="font-mono font-black text-xl sm:text-2xl leading-none select-none text-[#8b261d]">
                          ✕
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`relative flex items-center justify-center transition-all duration-300 ${
                          isSelectedClue
                            ? 'scale-115 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]'
                            : 'opacity-90 group-hover:scale-110 group-hover:opacity-100'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-transparent border-[2.5px] border-[#0a0502] shadow-[0_1px_4px_rgba(0,0,0,0.45)]" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Miniature Explorer Sprite running directly along the curved map trail */}
              <motion.div
                initial={{ left: `${currentPosition.x}%`, top: `${currentPosition.y}%` }}
                animate={
                  journeyKeyframes
                    ? { left: journeyKeyframes.x, top: journeyKeyframes.y }
                    : { left: `${currentPosition.x}%`, top: `${currentPosition.y}%` }
                }
                transition={
                  journeyKeyframes
                    ? { duration: 1.85, ease: 'linear' }
                    : { duration: 0.35, ease: 'easeOut' }
                }
                onAnimationStart={() => setNathanState('run')}
                onAnimationComplete={handleNathanAnimationComplete}
                className="absolute -translate-x-1/2 -translate-y-[88%] z-30 flex flex-col items-center pointer-events-auto cursor-pointer group"
              >
                <PixelNathanDrake
                  state={nathanState}
                  facing={facing}
                  size={44}
                  showDust={true}
                  tooltipText={`Progress: ${completedProductsCount}/${totalProductsCount} Checkpoints Completed`}
                />
                <div className="relative flex items-center justify-center -mt-0.5">
                  <div className="w-3.5 h-1 rounded-full bg-[#1b0e06]/70 blur-[0.5px]" />
                  <div className="absolute w-2.5 h-2.5 rounded-full bg-[#fbbf24]/35 blur-[1.5px] animate-pulse" />
                </div>
              </motion.div>
            </div>

            {/* Map Status Strip */}
            <div className="mt-2 w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-[#1f1006]/95 border border-[#8b6943]/60 text-[#f5ebd7] font-mono text-[10px] sm:text-xs shadow-inner">
              <span className="flex items-center gap-1.5 text-[#ffd700] font-bold">
                <span>🧭</span>
                <span>
                  Position:{' '}
                  <strong className="text-white">
                    {unlockedClues[3]
                      ? 'Secret Vault Reached (Lab 509)'
                      : unlockedClues[2]
                      ? 'En Route to Vault (Lab 509)'
                      : unlockedClues[1]
                      ? 'En Route to Lab 508'
                      : 'Expedition Camp (Lab 502)'}
                  </strong>
                </span>
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THREE CLUES SECTION                                                       */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-2.5 my-2">
            {/* Clues Header Bar with Count on Top */}
            <div className="flex items-center justify-between px-1 mb-0.5">
              <span
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3d1f05] flex items-center gap-1.5"
              >
                <span>📜</span>
                <span>Clues</span>
              </span>
              <span
                style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                className="text-xs sm:text-sm font-bold text-[#854d0e] bg-[#fef3c7] border border-[#d4af37]/60 px-3 py-0.5 rounded-full shadow-xs"
              >
                {(unlockedClues[1] ? 1 : 0) + (unlockedClues[2] ? 1 : 0) + (unlockedClues[3] ? 1 : 0)} / 3 Unlocked
              </span>
            </div>

            {/* Card 1: Clue 1 */}
            <div
              onClick={() => setActiveCrossClue(activeCrossClue === 1 ? null : 1)}
              className={`p-3 sm:p-3.5 rounded-lg border-2 transition-all cursor-pointer ${
                activeCrossClue === 1
                  ? 'ring-2 ring-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.4)]'
                  : ''
              } ${
                unlockedClues[1]
                  ? 'bg-[#fcf7ee]/90 border-[#8b6943]/60 text-[#1c0f05] shadow-sm'
                  : completedLabsCount >= 1
                  ? 'bg-[#d4af37]/15 border-[#d4af37]/80 text-[#1c0f05] shadow-sm'
                  : 'bg-[#241308]/[0.04] border-[#8b6943]/30 text-[#664b32] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#8b6943]/20">
                <span
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-sm sm:text-base font-black text-[#2c1405]"
                >
                  Clue 1
                </span>
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    unlockedClues[1]
                      ? 'bg-emerald-800/15 text-emerald-900 border-emerald-700/50'
                      : completedLabsCount >= 1
                      ? 'bg-amber-500/20 text-amber-900 border-amber-600/50 animate-pulse'
                      : 'bg-[#241308]/10 text-[#7a5a3a] border-[#8b6943]/30'
                  }`}
                >
                  {unlockedClues[1] ? 'Unlocked' : completedLabsCount >= 1 ? 'Ready' : 'Locked (Complete Lab 502)'}
                </span>
              </div>

              {unlockedClues[1] ? (
                <p
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  className="text-sm sm:text-[15px] font-semibold text-[#1c0f05] leading-relaxed pt-0.5"
                >
                  {targetClues?.clue1}
                </p>
              ) : completedLabsCount >= 1 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                  <p
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                    className="text-xs sm:text-sm font-semibold text-[#683f18]"
                  >
                    Lab 502 complete! Ready to view Clue 1.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleGetClue(1, e)}
                    disabled={isDispatching !== null}
                    style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-md bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] text-[#1a0c04] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.5)] border border-[#fff3cc] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
                  >
                    <span>{isDispatching === 1 ? 'Unlocking...' : '✦ View Clue 1'}</span>
                  </button>
                </div>
              ) : (
                <p
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  className="text-xs sm:text-sm text-[#7a5a3a] font-medium pt-0.5"
                >
                  Complete Lab 502 to unlock this clue.
                </p>
              )}
            </div>

            {/* Card 2: Clue 2 */}
            <div
              onClick={() => setActiveCrossClue(activeCrossClue === 2 ? null : 2)}
              className={`p-3 sm:p-3.5 rounded-lg border-2 transition-all cursor-pointer ${
                activeCrossClue === 2
                  ? 'ring-2 ring-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.4)]'
                  : ''
              } ${
                unlockedClues[2]
                  ? 'bg-[#fcf7ee]/90 border-[#8b6943]/60 text-[#1c0f05] shadow-sm'
                  : completedLabsCount >= 2
                  ? 'bg-[#d4af37]/15 border-[#d4af37]/80 text-[#1c0f05] shadow-sm'
                  : 'bg-[#241308]/[0.04] border-[#8b6943]/30 text-[#664b32] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#8b6943]/20">
                <span
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-sm sm:text-base font-black text-[#2c1405]"
                >
                  Clue 2
                </span>
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    unlockedClues[2]
                      ? 'bg-emerald-800/15 text-emerald-900 border-emerald-700/50'
                      : completedLabsCount >= 2
                      ? 'bg-amber-500/20 text-amber-900 border-amber-600/50 animate-pulse'
                      : 'bg-[#241308]/10 text-[#7a5a3a] border-[#8b6943]/30'
                  }`}
                >
                  {unlockedClues[2] ? 'Unlocked' : completedLabsCount >= 2 ? 'Ready' : 'Locked (Complete Lab 508)'}
                </span>
              </div>

              {unlockedClues[2] ? (
                <div className="flex items-center gap-3 pt-0.5">
                  <div className="w-10 h-10 rounded-full bg-[#fef3c7] border border-[#d4af37] flex items-center justify-center text-2xl shrink-0 shadow-xs overflow-hidden">
                    <ProductIcon icon={targetClues?.icon || targetProduct?.icon} fallback="📦" imgClassName="w-7 h-7" />
                  </div>
                  <p
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                    className="text-sm sm:text-[15px] font-semibold text-[#1c0f05] leading-relaxed"
                  >
                    {targetClues?.clue2}
                  </p>
                </div>
              ) : completedLabsCount >= 2 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                  <p
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                    className="text-xs sm:text-sm font-semibold text-[#683f18]"
                  >
                    Lab 508 complete! Ready to view Clue 2.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleGetClue(2, e)}
                    disabled={isDispatching !== null}
                    style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-md bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] text-[#1a0c04] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.5)] border border-[#fff3cc] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
                  >
                    <span>{isDispatching === 2 ? 'Unlocking...' : '✦ View Clue 2'}</span>
                  </button>
                </div>
              ) : (
                <p
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  className="text-xs sm:text-sm text-[#7a5a3a] font-medium pt-0.5"
                >
                  Complete Lab 508 to unlock this clue.
                </p>
              )}
            </div>

            {/* Card 3: Clue 3 */}
            <div
              onClick={() => setActiveCrossClue(activeCrossClue === 3 ? null : 3)}
              className={`p-3 sm:p-3.5 rounded-lg border-2 transition-all cursor-pointer ${
                activeCrossClue === 3
                  ? 'ring-2 ring-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.4)]'
                  : ''
              } ${
                unlockedClues[3]
                  ? 'bg-[#fcf7ee]/90 border-[#8b6943]/60 text-[#1c0f05] shadow-sm'
                  : completedLabsCount >= 3
                  ? 'bg-[#d4af37]/15 border-[#d4af37]/80 text-[#1c0f05] shadow-sm'
                  : 'bg-[#241308]/[0.04] border-[#8b6943]/30 text-[#664b32] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#8b6943]/20">
                <span
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-sm sm:text-base font-black text-[#2c1405]"
                >
                  Clue 3
                </span>
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    unlockedClues[3]
                      ? 'bg-emerald-800/15 text-emerald-900 border-emerald-700/50'
                      : completedLabsCount >= 3
                      ? 'bg-amber-500/20 text-amber-900 border-amber-600/50 animate-pulse'
                      : 'bg-[#241308]/10 text-[#7a5a3a] border-[#8b6943]/30'
                  }`}
                >
                  {unlockedClues[3] ? 'Unlocked' : completedLabsCount >= 3 ? 'Ready' : 'Locked (Complete Lab 509)'}
                </span>
              </div>

              {unlockedClues[3] ? (
                <div className="flex flex-col gap-2 pt-0.5">
                  <p
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                    className="text-sm sm:text-[15px] font-semibold text-[#1c0f05] leading-relaxed"
                  >
                    {targetClues?.clue3}
                  </p>

                  {targetClues?.cipherPattern && (
                    <div className="flex flex-col items-center gap-1 my-1 p-2.5 rounded-lg bg-[#140a03] border-2 border-[#d4af37]/80 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                      <span className="font-mono text-base sm:text-lg md:text-xl font-black text-[#ffd700] tracking-[0.22em] text-center select-text">
                        {targetClues.cipherPattern}
                      </span>
                    </div>
                  )}
                </div>
              ) : completedLabsCount >= 3 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                  <p
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                    className="text-xs sm:text-sm font-semibold text-[#683f18]"
                  >
                    All 3 labs complete! Ready to view Clue 3.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleGetClue(3, e)}
                    disabled={isDispatching !== null}
                    style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-md bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] text-[#1a0c04] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.5)] border border-[#fff3cc] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
                  >
                    <span>{isDispatching === 3 ? 'Unlocking...' : '✦ View Clue 3'}</span>
                  </button>
                </div>
              ) : (
                <p
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  className="text-xs sm:text-sm text-[#7a5a3a] font-medium pt-0.5"
                >
                  Complete all 3 labs to unlock this clue.
                </p>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* USER ANSWER ENTRY INPUT BOX & VERIFICATION                                */}
          {/* ========================================================================= */}
          <div className="mt-2 pt-2.5 border-t-2 border-[#8b6943]/35">
            <div className="flex items-center justify-between mb-2">
              <span
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3d1f05] flex items-center gap-1.5"
              >
                <span>🗝️</span>
                <span>Guess the Secret Project</span>
              </span>
              {isVerified && (
                <span className="px-2.5 py-0.5 rounded bg-emerald-800/15 text-emerald-900 border border-emerald-800/40 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  ✦ Solved
                </span>
              )}
            </div>

            {isVerified ? (
              <div className="p-3.5 rounded-xl border-2 border-[#b38920] bg-gradient-to-r from-[#fef3c7]/80 to-[#fde68a]/60 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#1c0f05] to-[#3a1e08] border-2 border-[#ffd700] flex items-center justify-center text-2xl shrink-0 shadow-md overflow-hidden">
                    <ProductIcon icon={targetProduct?.icon} fallback="🪐" imgClassName="w-8 h-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#7a481c] uppercase tracking-wider">
                        SOLVED EXPEDITION TREASURE
                      </span>
                      <span className="text-emerald-700 text-xs font-bold">✓</span>
                    </div>
                    <span
                      style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                      className="text-base sm:text-lg font-black text-[#1c0f05] truncate block"
                    >
                      {targetProduct?.name}
                    </span>
                  </div>
                </div>

                {claimedRelic && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    style={{
                      fontFamily: "var(--font-cinzel), 'Cinzel', serif",
                      clipPath:
                        'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
                    }}
                    className="py-2 px-3.5 bg-gradient-to-r from-[#d4af37] to-[#b38920] text-[#1a0f05] font-black text-xs uppercase tracking-wider shadow font-bold hover:brightness-110 cursor-pointer shrink-0 animate-pulse"
                  >
                    View Reward ➔
                  </button>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleVerifyGuess}
                className={`flex flex-col gap-2 ${isShaking ? 'animate-shake' : ''}`}
              >
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="Type project or company name..."
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  className="flex-1 px-3.5 py-2.5 rounded-lg border-2 border-[#8b6943]/60 bg-[#fffbf2] text-[#1c0f05] text-sm sm:text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#b38920] shadow-inner placeholder:font-normal placeholder:italic placeholder:text-[#8b6943]/60 transition"
                />
                <button
                  type="submit"
                  style={{
                    fontFamily: "var(--font-cinzel), 'Cinzel', serif",
                    clipPath:
                      'polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)',
                  }}
                  className="py-2.5 px-6 bg-gradient-to-b from-[#ffd700] via-[#d4af37] to-[#996515] text-[#140802] font-black text-xs sm:text-sm uppercase tracking-widest shadow-md transition hover:brightness-110 active:scale-[0.98] border-t border-[#fff9d6] cursor-pointer shrink-0"
                >
                  Verify Solution
                </button>
              </form>
            )}

            {/* Status Feedback Banner */}
            {statusMessage && !isVerified && (
              <div className="mt-2 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold text-center bg-rose-100 border border-rose-400 text-rose-900 shadow-sm flex items-center justify-center gap-1.5">
                <span>⚠️</span>
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Relic Reward Inspection Modal */}
      <AnimatePresence>
        {modalOpen && claimedRelic && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1f1207] via-[#2c1a0e] to-[#120a03] p-6 sm:p-7 text-[#f5ebd7] shadow-[0_0_40px_rgba(212,175,55,0.45)] overflow-hidden font-['Georgia'] transform-gpu will-change-transform"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-3.5 right-3.5 text-[#d4af37]/70 hover:text-[#fffbeb] transition text-sm font-mono w-7 h-7 rounded-full border border-[#8c6d23]/40 flex items-center justify-center hover:bg-[#8c6d23]/20"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="text-center pb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 text-[#fef08a] font-mono text-[10px] sm:text-xs font-extrabold uppercase tracking-widest shadow-sm">
                  <span>✦ EXPEDITION CHALLENGE COMPLETED ✦</span>
                </div>
              </div>

              <div className="relative my-4 flex flex-col items-center justify-center">
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-[#451a03] to-[#1a0b02] border-2 border-[#d4af37] flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.55)]">
                  {claimedRelic.type === 'key' ? (
                    <TreasureKeyIcon size={32} color="#d4af37" />
                  ) : claimedRelic.type === 'astrolabe' ? (
                    <AntiqueCompassIcon size={32} color="#d4af37" />
                  ) : (
                    <RelicCoinIcon size={32} color="#d4af37" />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <span className="px-3 py-0.5 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/20 text-[#fbbf24] font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    {claimedRelic.name}
                  </span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-xl sm:text-2xl font-bold text-[#ffd700] tracking-tight leading-snug"
                >
                  {claimedRelic.name}
                </h3>
                <p className="text-xs font-mono uppercase tracking-wider text-[#a07246]">
                  {claimedRelic.origin}
                </p>

                <div className="my-3 p-3.5 rounded-lg border border-[#8c6d23]/40 bg-[#140a02]/60 text-left">
                  <p className="text-xs sm:text-sm text-[#e2d3be] font-mono leading-relaxed">
                    {claimedRelic.lore}
                  </p>
                </div>

                <div className="pt-1">
                  <p className="text-xs font-mono italic text-[#d4af37]/90 bg-[#2b1708]/70 py-2 px-3 rounded border border-[#8c6d23]/30">
                    &ldquo;{claimedRelic.inscription}&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#8c6d23]/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-[#a07246]">
                  <RelicCoinIcon size={14} color="#d4af37" />
                  <span>Relic Secured</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    fontFamily: "var(--font-cinzel), 'Cinzel', serif",
                    clipPath:
                      'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
                  }}
                  className="py-1.5 px-4 bg-gradient-to-r from-[#d4af37] to-[#b38920] text-[#1a0f05] font-black text-xs uppercase tracking-wider shadow hover:brightness-110 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
