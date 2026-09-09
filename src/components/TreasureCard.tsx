'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AntiqueCompassIcon,
  TreasureKeyIcon,
  RelicCoinIcon,
  MapScrollIcon,
  NauticalShipIcon,
  IslandMountainIcon,
} from './RusticIcons';
import { appendTreasure } from '@/lib/expedition-storage';
import {
  baseExpeditionLabs,
  isLabCompleted,
  getSubmittedFeedbackForUser,
  CheckpointNode,
} from '@/lib/expeditionData';
import PixelNathanDrake, { NathanAnimationState } from './uncharted/PixelNathanDrake';

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
  globalIndex: number;
}

export interface ProductClues {
  clue1: string; // Unlocked when user completes Lab 1
  clue2: string; // Unlocked when user completes Lab 2
  clue3: string; // Unlocked when user completes Lab 3
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
    id: 'relic-avery-cross',
    name: 'Saint Dismas Golden Reliquary',
    rarity: 'Mythic',
    origin: "Captain Henry Avery's Private Stash (1694)",
    inscription: 'Hodie mecum eris in paradiso — Today you shall be with me in paradise.',
    lore: "Forged from solid Andean gold and inlaid with uncut sapphires, this reliquary guarded Avery's secret navigational coordinates to Libertalia.",
    type: 'key',
  },
  {
    id: 'relic-drake-astrolabe',
    name: "Sir Francis Drake's Mariner Astrolabe",
    rarity: 'Legendary',
    origin: 'Golden Hind Flagship (1579)',
    inscription: 'Sic Parvis Magna — Greatness from small beginnings.',
    lore: "An intricately calibrated brass navigational instrument used to circumnavigate uncharted archipelagoes under Queen Elizabeth's royal charter.",
    type: 'astrolabe',
  },
  {
    id: 'relic-libertalia-seal',
    name: 'Libertalia Founders Council Seal',
    rarity: 'Artifact',
    origin: 'Colony of Kings Sanctuary (1701)',
    inscription: 'Pro Deo et Libertate — For God and Liberty.',
    lore: 'The official heavy wax-and-bronze seal authorizing sovereign passage across all three uncharted trial sectors.',
    type: 'coin',
  },
];

// Rich bespoke 3-stage atmospheric clues (without emojis)
export const PRODUCT_CLUES_MAP: Record<string, ProductClues> = {
  // --- Sector 01 (Jungle) Products ---
  'c1-p1': {
    clue1: 'Expedition logs record a coastal staging point where ancient mossy temple pillars meet the ocean surf.',
    clue2: 'Field records show telemetry verification beacons standing guard over initial maritime departure lanes.',
    clue3: 'Direct Navigational Cipher: "Where every jungle expedition commences — Port of Departure (Temple Ruins)."',
  },
  'c1-p2': {
    clue1: 'A hidden saltwater cove sheltered behind dense tangles of ancient coastal mangrove roots.',
    clue2: 'Navigators used this tranquil inlet to calibrate compass needles and map mid-Atlantic coastal currents.',
    clue3: 'Direct Navigational Cipher: "The secret coastal inlet shielded by tangled roots — Hidden Mangrove Cove."',
  },
  'c1-p3': {
    clue1: 'A soaring sanctuary perched atop mist-draped emerald crags high above the tropical canopy.',
    clue2: 'High-altitude signal relays beam telemetry across the peaks to maintain atmospheric links.',
    clue3: 'Direct Navigational Cipher: "The mist-shrouded green peak relay station — Emerald Mountain Sanctuary."',
  },
  'c1-p4': {
    clue1: 'A roaring freshwater gorge carved out by torrential river falls and rising mountain vapor.',
    clue2: 'Hydro-telemetry equipment monitors thermal dissipation and water current dynamics in the basin.',
    clue3: 'Direct Navigational Cipher: "The torrential waterfall monitoring point — Cascade Basin Waypoint."',
  },
  'c1-p5': {
    clue1: 'A sacred stepped stone altar situated on high plateaus aligned with the first rays of dawn.',
    clue2: 'Ancient astrolabe instruments were calibrated here for issuing final passage clearance across the sector.',
    clue3: 'Direct Navigational Cipher: "The high stone terrace facing the sunrise — Sun Altar Highlands."',
  },

  // --- Sector 02 (Frost) Products ---
  'c2-p1': {
    clue1: 'A sub-zero polar outpost nestled along sheer blue glacial cliffs bordering frozen waters.',
    clue2: 'Perimeter acoustic radar instruments sweep the shelf to detect deep submarine ice fractures.',
    clue3: 'Direct Navigational Cipher: "The coastal staging base in the frozen sea — Glacial Fjord Staging Post."',
  },
  'c2-p2': {
    clue1: 'A navigation beacon anchored amidst treacherous, ice-covered shallow reefs and frozen shoals.',
    clue2: 'Subterranean signal relays broadcast guidance pulses directly through dense pack ice acoustics.',
    clue3: 'Direct Navigational Cipher: "The warning beacon amidst the frozen shallows — Frozen Shoals Beacon."',
  },
  'c2-p3': {
    clue1: 'A razor-sharp needle of blue glacial ice rising high into the howling blizzard.',
    clue2: 'Automated optical telemetry lenses maintain panoramic watch over sub-zero weather anomalies.',
    clue3: 'Direct Navigational Cipher: "The towering needle of ice observation post — Frost Spire Lookout."',
  },
  'c2-p4': {
    clue1: 'A massive horizontal shelf of ancient permafrost holding deep cryogenic containment vaults.',
    clue2: 'Biometric latency sensors maintain sub-zero benchmarks to safeguard dormant expedition relics.',
    clue3: 'Direct Navigational Cipher: "The sub-zero horizontal frozen plateau — Sub-Zero Ice Shelf."',
  },
  'c2-p5': {
    clue1: 'The highest magnetic pole terminus where shimmering aurora curtains illuminate the snow.',
    clue2: 'Acts as the central synchronization nexus routing multi-node network matrices across the polar cap.',
    clue3: 'Direct Navigational Cipher: "The luminous terminal matrix beneath the polar lights — Aurora Terminal Matrix."',
  },

  // --- Sector 03 (Volcano) Products ---
  'c3-p1': {
    clue1: 'A fortified surveillance outpost forged from glossy black volcanic glass upon the caldera rim.',
    clue2: 'Thermal pressure sensors measure extreme barometric spikes directly above active magma vents.',
    clue3: 'Direct Navigational Cipher: "The black glass outpost overlooking the crater — Obsidian Caldera Outpost."',
  },
  'c3-p2': {
    clue1: 'A scorched wasteland of sulfur steam vents and glowing rivers of yellow and molten basalt.',
    clue2: 'Geothermal sweeps map sub-surface convection currents flowing beneath the brittle lava crust.',
    clue3: 'Direct Navigational Cipher: "The sulfurous glowing molten ponds — Brimstone Lava Pools."',
  },
  'c3-p3': {
    clue1: 'The fiery summit of the central super-volcano where incandescent ash billows day and night.',
    clue2: 'Equipped with heavy titanium heatsinks to monitor core tectonic dissipation at the volcano apex.',
    clue3: 'Direct Navigational Cipher: "The crowning point of the great volcano — The Great Eruption Apex."',
  },
  'c3-p4': {
    clue1: 'A massive vertical chimney formed by hexagonal basalt columns acting as a natural smelting furnace.',
    clue2: 'High-frequency acoustic sensors record resonance from surging subterranean magma flues.',
    clue3: 'Direct Navigational Cipher: "The hexagonal basalt column furnace — Basalt Spire Furnace."',
  },
  'c3-p5': {
    clue1: 'The deepest geothermal chamber at the heart of the world where all tectonic currents converge.',
    clue2: 'The ultimate master uplink terminus that synchronizes signals across all three expedition sectors.',
    clue3: 'Direct Navigational Cipher: "The final global uplink core — Molten Core Terminus."',
  },
};

// Procedural fallback generator for custom/dynamic products
export function getProductClues(product: ProductWithLab): ProductClues {
  if (PRODUCT_CLUES_MAP[product.id]) {
    return PRODUCT_CLUES_MAP[product.id];
  }
  const theme =
    product.themeType ||
    (product.labId === '2' ? 'frost' : product.labId === '3' ? 'volcano' : 'jungle');

  const envText =
    theme === 'frost'
      ? 'Located in the sub-zero glacial spires of Sector 02'
      : theme === 'volcano'
        ? 'Stationed in the volcanic caldera ridgelines of Sector 03'
        : 'Situated within the ancient jungle ruins of Sector 01';

  return {
    clue1: `Expedition reconnaissance places this discovery within ${product.labName || 'Sector ' + product.labId}: ${envText}.`,
    clue2: `Survey logs record distinctive telemetry operations: "${product.description}".`,
    clue3: `Direct Navigational Cipher: "${product.name} — Sector waypoint verified."`,
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
  currentLabId = '1',
  lab1Completed: propLab1Completed,
  lab2Completed: propLab2Completed,
  lab3Completed: propLab3Completed,
  completedLabIds,
}: TreasureCardProps) {
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

  // Product pool from all 3 base labs
  const allProducts: ProductWithLab[] = useMemo(() => {
    const labs = [
      baseExpeditionLabs['1'],
      baseExpeditionLabs['2'],
      baseExpeditionLabs['3'],
    ].filter(Boolean);

    const pool: ProductWithLab[] = [];
    let globalCounter = 0;
    labs.forEach((l) => {
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
  }, []);

  // Total products completed across all expedition sectors
  const completedProductsCount = useMemo(() => {
    return Math.max(completedCount || 0, submittedProductIds.length);
  }, [completedCount, submittedProductIds]);

  const totalProductsCount = useMemo(() => {
    return allProducts.length > 0 ? allProducts.length : (targetCount || 15);
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
    return 0; // Starts right at the starting Black Circle!
  }, [targetProgressOverride, isVerified, unlockedClues]);

  // Exact continuous percentage position along the map dotted line
  const currentPosition = useMemo(() => {
    return getTrailPoint(productProgressFraction);
  }, [productProgressFraction]);

  // 3 Waypoints strictly aligned along the authentic map image trail (Waypoints I & II Black Rings, Cross III Vault X)
  // Circles turn into stamped crosses ONLY after the character reaches the waypoint (unlockedClues)
  const mapWaypoints = useMemo(() => [
    {
      id: 'sector1',
      label: 'Waypoint I',
      title: 'Waypoint I • Expedition Stage 01',
      roman: 'I',
      x: 21.2,
      y: 58.1,
      isDone: unlockedClues[1],
      isCross: false,
      clueNum: 1,
    },
    {
      id: 'sector2',
      label: 'Waypoint II',
      title: 'Waypoint II • Expedition Stage 02',
      roman: 'II',
      x: 56.9,
      y: 48.8,
      isDone: unlockedClues[2],
      isCross: false,
      clueNum: 2,
    },
    {
      id: 'sector3',
      label: 'Vault X (Cross III)',
      title: 'Final Treasure Vault • Vault X',
      roman: 'III',
      x: 34.2,
      y: 32.8,
      isDone: unlockedClues[3],
      isCross: true,
      isFinalX: true,
      clueNum: 3,
    },
  ], [unlockedClues]);

  // Keep Nathan Drake in standing / running position along the trail
  const [nathanState, setNathanState] = useState<NathanAnimationState>('idle');
  const [activeCrossClue, setActiveCrossClue] = useState<number | null>(null);
  const [journeyKeyframes, setJourneyKeyframes] = useState<{ x: string[]; y: string[] } | null>(null);

  // Direction along the map S-curve: rightwards during bottom/middle loops, turns left heading to Red X
  const facing = useMemo<'right' | 'left'>(() => {
    return productProgressFraction >= 0.70 ? 'left' : 'right';
  }, [productProgressFraction]);

  // Dispatch Nathan Drake running strictly along the curved trail upon clicking "Get Clue"
  const handleGetClue = (clueNum: 1 | 2 | 3, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDispatching !== null) return;

    setIsDispatching(clueNum);
    setNathanState('run');

    const startP = productProgressFraction;
    const endP = clueNum === 1 ? 0.25 : clueNum === 2 ? 0.75 : 1.0;

    // Sample 36 intermediate points along the cubic Bezier trail curves
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

    // Brisk, energetic 1.85-second expedition sprint along the trail
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
        setStatusMessage('DISCOVERY VERIFIED • ARCHIVE UNSEALED');
      } else {
        setIsVerified(false);
        setStatusMessage(null);
      }
    } catch {
      // ignore
    }
  }, [normalizedEmail, userEmail, localFeedbackVersion]);

  // Handle User Guess / Verification
  const handleVerifyGuess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetProduct || isVerified) return;

    const cleanInput = normalizeName(guessInput);
    if (!cleanInput) {
      setStatusMessage('Enter target discovery name to decipher.');
      return;
    }

    const cleanTargetName = normalizeName(targetProduct.name);

    // Exact match or contains main name keywords
    const isCorrect =
      cleanInput === cleanTargetName ||
      (cleanInput.length >= 4 && cleanTargetName.includes(cleanInput)) ||
      (cleanTargetName.length >= 4 && cleanInput.includes(cleanTargetName));

    if (isCorrect) {
      setIsVerified(true);
      setStatusMessage('DISCOVERY VERIFIED • ARCHIVE UNSEALED');

      // Persist relic reward and verified state permanently
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
      setStatusMessage('CIPHER MISMATCH • CONSULT UNLOCKED LEDGERS');
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
          className="relative w-full bg-[length:100%_100%] bg-no-repeat bg-center px-8 sm:px-12 pt-7 sm:pt-9 pb-8 sm:pb-10 flex flex-col justify-between text-[#241308]"
        >
          {/* Top Right Corner Wax Seal Badge */}
          <div className="absolute top-4 right-5 sm:top-5 sm:right-8 w-12 h-12 pointer-events-none opacity-90 z-20">
            {isVerified ? (
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#8b261d] flex items-center justify-center rotate-12 bg-[#8b261d]/15 shadow-sm">
                <span className="text-[8px] font-mono font-black text-[#8b261d] uppercase tracking-tighter">
                  VERIFIED
                </span>
              </div>
            ) : completedLabsCount === 0 ? (
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#8b6943]/60 flex items-center justify-center -rotate-6 bg-[#241308]/10 shadow-sm">
                <span className="text-[8px] font-mono font-black text-[#6b4516] uppercase tracking-tighter">
                  SEALED
                </span>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#8b6943] flex items-center justify-center rotate-12 bg-[#8b6943]/15 shadow-sm">
                <span className="text-[8px] font-mono font-black text-[#6b4516] uppercase tracking-tighter">
                  ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Main Title: Positioned cleanly inside the card frame */}
          <div className="mb-2 px-1">
            <h2 className="text-xl sm:text-2xl font-bold font-['EB_Garamond',_serif] text-[#1c0f05] tracking-tight leading-snug drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
              Treasure Hunt
            </h2>
          </div>

          {/* ========================================================================= */}
          {/* AUTHENTIC VINTAGE TREASURE MAP WITH 3 CROSSES & NATHAN DRAKE TRAIL         */}
          {/* ========================================================================= */}
          <div className="my-1.5 select-none">
            {/* Authentic Map Image Canvas Area */}
            <div
              style={{
                backgroundImage: `url('/assets/images/pirate_trail_map.png')`,
              }}
              data-nathan-container="true"
              className="relative w-full aspect-[16/9.2] bg-[length:100%_100%] bg-center bg-no-repeat rounded-lg overflow-visible select-none border border-[#8b6943]/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
            >
              {/* Dynamic Dotted Trail Highlight Overlay - Strictly follows the dotted path with heavy lineweight glow */}
              <svg
                viewBox="0 0 1000 625"
                className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Heavy Gold Glow Filter */}
                  <filter id="goldBarGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Radiant Metallic Gold Gradient */}
                  <linearGradient id="goldBarGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="25%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#fffbeb" />
                    <stop offset="75%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>

                  {/* Circular Waypoint Hole Mask to prevent golden trail from showing inside incomplete rings */}
                  <mask id="trailHoleMask">
                    <rect x="0" y="0" width="1000" height="625" fill="#ffffff" />
                    <circle cx="82" cy="590" r="14" fill="#000000" />
                    {!unlockedClues[1] && (
                      <circle cx="212" cy="363" r="14" fill="#000000" />
                    )}
                    {!unlockedClues[2] && (
                      <circle cx="569" cy="305" r="14" fill="#000000" />
                    )}
                  </mask>
                </defs>

                {/* Base Inked Dotted Trail rendered onto the clean parchment */}
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

                {/* Layer 1: Ambient High-Intensity Gold Glow Aura */}
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
                    animate={{
                      pathLength: productProgressFraction,
                    }}
                    transition={{ duration: 1.85, ease: 'linear' }}
                  />
                )}

                {/* Layer 2: Heavy-Lineweight Glowing Dotted Line strictly over the dots */}
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
                    animate={{
                      pathLength: productProgressFraction,
                    }}
                    transition={{ duration: 1.85, ease: 'linear' }}
                  />
                )}

                {/* Layer 3: High-Luminance Brilliant White-Gold Core on each Dot */}
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
                    animate={{
                      pathLength: productProgressFraction,
                    }}
                    transition={{ duration: 1.85, ease: 'linear' }}
                  />
                )}
              </svg>

              {/* Trailhead Starting Point: Inked Black Ring throughout the expedition */}
              <div
                style={{ left: '8.2%', top: '94.4%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-auto cursor-pointer group"
                title="Trailhead • Expedition Starting Point"
              >
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-transparent border-[2.5px] border-[#0a0502] shadow-[0_1px_4px_rgba(0,0,0,0.45)] flex items-center justify-center group-hover:scale-110 transition-transform" />
              </div>

              {/* 3 Waypoints Positioned Along the Trail (Black Rings while incomplete, Stamped Crosses when completed) */}
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
                      // Cross III / Grand Crimson Vault X directly over the printed X
                      <div
                        className={`relative flex items-center justify-center transition-all duration-300 ${wp.isDone
                          ? 'scale-125 drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]'
                          : isSelectedClue
                            ? 'scale-120 drop-shadow-[0_0_10px_rgba(212,175,55,0.95)]'
                            : 'opacity-90 group-hover:scale-110'
                          }`}
                      >
                        <span
                          className={`font-serif font-black text-3xl sm:text-4xl leading-none select-none ${wp.isDone
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
                      // Completed Sector Waypoint: Turns into a Stamped Inked Cross
                      <div
                        className="relative flex items-center justify-center transition-all duration-300 scale-120 drop-shadow-[0_0_8px_rgba(212,175,55,0.95)]"
                      >
                        <span className="font-mono font-black text-xl sm:text-2xl leading-none select-none text-[#8b261d]">
                          ✕
                        </span>
                      </div>
                    ) : (
                      // Incomplete Sector Waypoint: Inked Black Ring with Natural Map Background
                      <div
                        className={`relative flex items-center justify-center transition-all duration-300 ${isSelectedClue
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

              {/* Miniature Nathan Drake Explorer running directly along the curved map trail */}
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
                  tooltipText={`Nathan Drake • Expedition Progress: ${completedProductsCount}/${totalProductsCount} Products Cleared`}
                />
                {/* Luminous Gold Trail Contact Badge */}
                <div className="relative flex items-center justify-center -mt-0.5">
                  <div className="w-3.5 h-1 rounded-full bg-[#1b0e06]/70 blur-[0.5px]" />
                  <div className="absolute w-2.5 h-2.5 rounded-full bg-[#fbbf24]/35 blur-[1.5px] animate-pulse" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3 SEQUENTIAL CIPHER LEDGERS (ASSIGNED TO WAYPOINT I, II, & VAULT X)        */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-1.5 my-1.5">
            {/* Clue I (Assigned to Waypoint I / Stage 01) */}
            <div
              onClick={() => setActiveCrossClue(activeCrossClue === 1 ? null : 1)}
              className={`p-2.5 rounded border transition-all cursor-pointer ${activeCrossClue === 1 ? 'ring-2 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''
                } ${unlockedClues[1]
                  ? 'bg-[#241308]/[0.06] border-[#8b6943]/50 text-[#241308]'
                  : completedLabsCount >= 1
                    ? 'bg-[#d4af37]/10 border-[#d4af37]/60 text-[#241308]'
                    : 'bg-[#241308]/[0.02] border-[#8b6943]/20 text-[#664b32] opacity-70'
                }`}
            >
              <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-[#8b6943]/20">
                <div className="flex items-center gap-1.5">
                  <NauticalShipIcon size={11} color="#7a5214" />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#7a5214]">
                    CLUE I • UNSEALED AT WAYPOINT I (STAGE 01)
                  </span>
                </div>
                <span
                  className={`text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${unlockedClues[1]
                    ? 'bg-[#8b6943]/15 text-[#6b4516] border-[#8b6943]/40'
                    : completedLabsCount >= 1
                      ? 'bg-[#d4af37]/20 text-[#854d0e] border-[#d4af37]/50'
                      : 'bg-[#241308]/10 text-[#7a5a3a] border-[#8b6943]/20'
                    }`}
                >
                  {unlockedClues[1] ? 'DECIPHERED ✦' : completedLabsCount >= 1 ? 'UNSEAL READY' : 'WAYPOINT I LOCKED'}
                </span>
              </div>

              {unlockedClues[1] ? (
                <p className="text-xs sm:text-[13px] text-[#2b1704] font-[family-name:var(--font-handwriting)] font-bold italic leading-snug pt-0.5">
                  &quot;{targetClues?.clue1}&quot;
                </p>
              ) : completedLabsCount >= 1 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 pt-0.5">
                  <p className="text-[9.5px] sm:text-[10px] text-[#7a5214] font-serif italic">
                    Expedition Stage 01 cleared! Dispatch Nathan along the trail to Waypoint I to claim this clue.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleGetClue(1, e)}
                    disabled={isDispatching !== null}
                    className="w-full sm:w-auto px-3.5 py-1 rounded bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] text-[#1a0c04] font-mono font-black text-[9.5px] uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.45)] border border-[#fff3cc]/80 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer shrink-0 animate-pulse"
                  >
                    <span>{isDispatching === 1 ? '🏃 RUNNING TO WAYPOINT I...' : '✦ GET CLUE I'}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[9.5px] sm:text-[10px] text-[#7a5a3a] font-serif italic">
                  Complete any 1 expedition lab to unlock the &quot;Get Clue&quot; dispatch.
                </p>
              )}
            </div>

            {/* Clue II (Assigned to Waypoint II / Stage 02) */}
            <div
              onClick={() => setActiveCrossClue(activeCrossClue === 2 ? null : 2)}
              className={`p-2.5 rounded border transition-all cursor-pointer ${activeCrossClue === 2 ? 'ring-2 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''
                } ${unlockedClues[2]
                  ? 'bg-[#241308]/[0.06] border-[#8b6943]/50 text-[#241308]'
                  : completedLabsCount >= 2
                    ? 'bg-[#d4af37]/10 border-[#d4af37]/60 text-[#241308]'
                    : 'bg-[#241308]/[0.02] border-[#8b6943]/20 text-[#664b32] opacity-70'
                }`}
            >
              <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-[#8b6943]/20">
                <div className="flex items-center gap-1.5">
                  <IslandMountainIcon size={11} color="#7a5214" />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#7a5214]">
                    CLUE II • UNSEALED AT WAYPOINT II (STAGE 02)
                  </span>
                </div>
                <span
                  className={`text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${unlockedClues[2]
                    ? 'bg-[#8b6943]/15 text-[#6b4516] border-[#8b6943]/40'
                    : completedLabsCount >= 2
                      ? 'bg-[#d4af37]/20 text-[#854d0e] border-[#d4af37]/50'
                      : 'bg-[#241308]/10 text-[#7a5a3a] border-[#8b6943]/20'
                    }`}
                >
                  {unlockedClues[2] ? 'DECIPHERED ✦' : completedLabsCount >= 2 ? 'UNSEAL READY' : 'WAYPOINT II LOCKED'}
                </span>
              </div>

              {unlockedClues[2] ? (
                <p className="text-xs sm:text-[13px] text-[#2b1704] font-[family-name:var(--font-handwriting)] font-bold italic leading-snug pt-0.5">
                  &quot;{targetClues?.clue2}&quot;
                </p>
              ) : completedLabsCount >= 2 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 pt-0.5">
                  <p className="text-[9.5px] sm:text-[10px] text-[#7a5214] font-serif italic">
                    Expedition Stage 02 cleared! Dispatch Nathan along the trail to Waypoint II to claim this clue.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleGetClue(2, e)}
                    disabled={isDispatching !== null}
                    className="w-full sm:w-auto px-3.5 py-1 rounded bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] text-[#1a0c04] font-mono font-black text-[9.5px] uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.45)] border border-[#fff3cc]/80 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer shrink-0 animate-pulse"
                  >
                    <span>{isDispatching === 2 ? '🏃 RUNNING TO WAYPOINT II...' : '✦ GET CLUE II'}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[9.5px] sm:text-[10px] text-[#7a5a3a] font-serif italic">
                  Complete any 2 expedition labs to unlock the &quot;Get Clue&quot; dispatch.
                </p>
              )}
            </div>

            {/* Clue III (Assigned to Vault X / Stage 03) */}
            <div
              onClick={() => setActiveCrossClue(activeCrossClue === 3 ? null : 3)}
              className={`p-2.5 rounded border transition-all cursor-pointer ${activeCrossClue === 3 ? 'ring-2 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''
                } ${unlockedClues[3]
                  ? 'bg-[#241308]/[0.06] border-[#8b6943]/50 text-[#241308]'
                  : completedLabsCount >= 3
                    ? 'bg-[#d4af37]/10 border-[#d4af37]/60 text-[#241308]'
                    : 'bg-[#241308]/[0.02] border-[#8b6943]/20 text-[#664b32] opacity-70'
                }`}
            >
              <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-[#8b6943]/20">
                <div className="flex items-center gap-1.5">
                  <MapScrollIcon size={11} color="#7a5214" />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#7a5214]">
                    CLUE III • UNSEALED AT VAULT X (STAGE 03)
                  </span>
                </div>
                <span
                  className={`text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${unlockedClues[3]
                    ? 'bg-[#8b6943]/15 text-[#6b4516] border-[#8b6943]/40'
                    : completedLabsCount >= 3
                      ? 'bg-[#d4af37]/20 text-[#854d0e] border-[#d4af37]/50'
                      : 'bg-[#241308]/10 text-[#7a5a3a] border-[#8b6943]/20'
                    }`}
                >
                  {unlockedClues[3] ? 'DECIPHERED ✦' : completedLabsCount >= 3 ? 'UNSEAL READY' : 'VAULT X LOCKED'}
                </span>
              </div>

              {unlockedClues[3] ? (
                <p className="text-xs sm:text-[13px] text-[#2b1704] font-[family-name:var(--font-handwriting)] font-bold italic leading-snug pt-0.5">
                  &quot;{targetClues?.clue3}&quot;
                </p>
              ) : completedLabsCount >= 3 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 pt-0.5">
                  <p className="text-[9.5px] sm:text-[10px] text-[#7a5214] font-serif italic">
                    All 3 Expedition Stages cleared! Dispatch Nathan along the trail to Vault X to claim the final clue.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleGetClue(3, e)}
                    disabled={isDispatching !== null}
                    className="w-full sm:w-auto px-3.5 py-1 rounded bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] text-[#1a0c04] font-mono font-black text-[9.5px] uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.45)] border border-[#fff3cc]/80 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer shrink-0 animate-pulse"
                  >
                    <span>{isDispatching === 3 ? '🏃 RUNNING TO VAULT X...' : '✦ GET CLUE III'}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[9.5px] sm:text-[10px] text-[#7a5a3a] font-serif italic">
                  Complete all 3 expedition labs to unlock the final &quot;Get Clue&quot; dispatch.
                </p>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* USER ANSWER ENTRY INPUT BOX & VERIFICATION                                */}
          {/* ========================================================================= */}
          <div className="mt-1 pt-1.5 border-t border-[#8b6943]/35">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-[#6b4516]">
                INSCRIBE DISCOVERY DESIGNATION:
              </span>
              {isVerified && (
                <span className="px-2 py-0.5 rounded bg-[#8b261d]/15 text-[#8b261d] border border-[#8b261d]/40 font-mono text-[7.5px] font-bold uppercase tracking-wider">
                  VERIFIED
                </span>
              )}
            </div>

            {isVerified ? (
              <div className="p-2.5 rounded border border-[#8b6943]/60 bg-[#241308]/[0.07] flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#24140a] border border-[#d4af37] flex items-center justify-center text-[#d4af37] shrink-0 shadow-sm">
                    <TreasureKeyIcon size={14} color="#d4af37" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[8px] font-mono font-bold text-[#7a481c] uppercase tracking-wider">
                      CONFIRMED DISCOVERY
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-['EB_Garamond',_serif] text-[#1c0f05] truncate block">
                      {targetProduct?.name}
                    </span>
                  </div>
                </div>

                {claimedRelic && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    style={{
                      clipPath:
                        'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
                    }}
                    className="py-1 px-2.5 bg-gradient-to-r from-[#d4af37] to-[#b38920] text-[#1a0f05] font-black text-[9px] uppercase tracking-wider shadow font-['Cinzel',_serif] hover:brightness-110 cursor-pointer shrink-0"
                  >
                    Inspect Relic
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleVerifyGuess} className={`flex gap-1.5 ${isShaking ? 'animate-shake' : ''}`}>
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="Inscribe the secret discovery title..."
                  className="flex-1 px-3 py-1.5 rounded border border-[#8b6943]/50 bg-[#fff9ea]/85 text-[#241308] text-xs sm:text-sm font-['EB_Garamond',_serif] font-bold focus:outline-none focus:ring-1 focus:ring-[#8b6943] shadow-inner placeholder:font-serif placeholder:italic placeholder:text-xs placeholder:text-[#8b6943]/60"
                />
                <button
                  type="submit"
                  style={{
                    clipPath:
                      'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
                  }}
                  className="py-1.5 px-3.5 bg-gradient-to-b from-[#d4af37] via-[#b38920] to-[#7a5214] text-[#140802] font-black text-[10px] uppercase tracking-widest shadow-md transition hover:brightness-110 active:scale-[0.98] border-t border-[#fff3cc]/60 font-['Cinzel',_serif] cursor-pointer shrink-0"
                >
                  Verify
                </button>
              </form>
            )}

            {/* Status Feedback */}
            {statusMessage && !isVerified && (
              <div className="mt-1 py-0.5 px-2 rounded text-[7.5px] sm:text-[8px] font-mono font-bold uppercase tracking-wider text-center bg-[#8b261d]/15 text-[#8b261d] border border-[#8b261d]/30">
                {statusMessage}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Ancient Relic Inspection Modal */}
      <AnimatePresence>
        {modalOpen && claimedRelic && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 sm:backdrop-blur-sm backdrop-blur-none p-4"
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
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 text-[#fef08a] font-mono text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                  <span>DISCOVERY CIPHER VERIFIED</span>
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
                  <span className="px-2.5 py-0.5 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/20 text-[#fbbf24] font-mono text-[9px] font-bold uppercase tracking-wider">
                    {claimedRelic.rarity} Relic
                  </span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold font-['EB_Garamond',_serif] text-[#ffd700] tracking-tight leading-snug">
                  {claimedRelic.name}
                </h3>
                <p className="text-[10.5px] sm:text-xs font-mono uppercase tracking-wider text-[#a07246]">
                  {claimedRelic.origin}
                </p>

                <div className="my-3 p-3 rounded-lg border border-[#8c6d23]/40 bg-[#140a02]/60 text-left">
                  <p className="text-xs sm:text-sm text-[#e2d3be] font-[family-name:var(--font-handwriting)] font-bold italic leading-relaxed">
                    &quot;{claimedRelic.lore}&quot;
                  </p>
                </div>

                <div className="pt-1">
                  <p className="text-[10px] sm:text-[11px] font-mono italic text-[#d4af37]/90 bg-[#2b1708]/70 py-1.5 px-3 rounded border border-[#8c6d23]/30">
                    Inscription: {claimedRelic.inscription}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#8c6d23]/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#a07246]">
                  <RelicCoinIcon size={14} color="#d4af37" />
                  <span>Added to Explorer Dossier</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    clipPath:
                      'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
                  }}
                  className="py-1.5 px-4 bg-gradient-to-r from-[#d4af37] to-[#b38920] text-[#1a0f05] font-black text-[11px] uppercase tracking-wider shadow font-['Cinzel',_serif] hover:brightness-110 cursor-pointer"
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
