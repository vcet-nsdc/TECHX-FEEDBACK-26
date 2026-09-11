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

export interface ExpeditionItemReward {
  id: string;
  name: string;
  image: string;
  rarity: 'Legendary' | 'Mythic' | 'Artifact' | 'Ancient Relic';
  origin: string;
  inscription: string;
  lore: string;
}

export const EXPEDITION_REWARD_ITEMS: ExpeditionItemReward[] = [
  {
    id: 'item-spyglass',
    name: "Explorer's Brass Spyglass",
    image: '/items/item1.png',
    rarity: 'Legendary',
    origin: 'Cartographer’s Quarters',
    inscription: 'Seek the horizons unseen.',
    lore: 'A collapsible marine brass spyglass with multi-coated crystal optics, once used to chart unknown archipelagoes.',
  },
  {
    id: 'item-chalice',
    name: 'Golden El Dorado Chalice',
    image: '/items/item2.png',
    rarity: 'Mythic',
    origin: 'Lost City of Gold',
    inscription: 'Rich beyond mortal measure.',
    lore: 'An exquisite pre-Columbian gold goblet hand-chiseled with solar deities and studded with polished emeralds.',
  },
  {
    id: 'item-compass',
    name: "Drake's Navigator Compass",
    image: '/items/item3.png',
    rarity: 'Artifact',
    origin: 'Sir Francis Drake Fleet',
    inscription: 'Sic Parvis Magna.',
    lore: 'An authentic brass gimballed pocket compass recovered from the flagship Golden Hind. Guided Drake around the globe.',
  },
  {
    id: 'item-phurba',
    name: 'Golden Phurba Dagger',
    image: '/items/item4.png',
    rarity: 'Ancient Relic',
    origin: 'Shambhala Sanctuary',
    inscription: 'The key to the hidden world.',
    lore: 'A three-edged ceremonial bronze and gold ritual blade depicting fierce guardian visages, unlocking sacred gates.',
  },
];

// Cryptic domain and silhouette definitions for all 30 projects
export interface CrypticClueDef {
  description: string;
  shape: string;
}

export const PRODUCT_CRYPTIC_CLUES: Record<string, CrypticClueDef> = {
  // Lab 502
  '502-01': {
    description: 'An observatory mechanism calibrated to peer beyond our atmosphere, mapping celestial wanderers and cosmic horizons.',
    shape: 'A cylindrical silhouette tilted diagonally upward, resting atop a slender tripod stand.',
  },
  '502-02': {
    description: 'A collective alliance initiative engineered to foster mutual solidarity, empathy, and shared companionship across diverse communities.',
    shape: 'Two angled limbs converging symmetrically at the center with interlaced fingers in mutual contact.',
  },
  '502-03': {
    description: 'A self-guided mechanical construct engineered to traverse unknown corridors with automated mobility and spatial obstacle avoidance.',
    shape: 'A square-jawed metallic head featuring twin circular visual receptors and an upright antenna stem.',
  },
  '502-04': {
    description: 'An instructional proving ground that transforms the pursuit of intellect into an interactive, gamified adventure for scholars.',
    shape: 'A horizontal tier of three rectangular blocks stacked evenly with visible spine ridges.',
  },
  '502-05': {
    description: 'An impregnable defensive bulwark operating silently along digital perimeters to repel covert cyber intrusions and malicious payloads.',
    shape: 'A heraldic crest with a flat horizontal upper rim and curved edges tapering down to a sharp lower tip.',
  },
  '502-06': {
    description: 'An expansive realm forged from pure code and spatial geometry, inviting voyagers to wander an alternate digital plane.',
    shape: 'A swirling celestial disc with concentric spiral arms curling inward toward a dense central nucleus.',
  },
  '502-07': {
    description: 'A specialized physical command station logging the arrival, ergonomics, posture, and departure of personnel at work.',
    shape: 'A four-legged angular frame supporting a flat horizontal tier accompanied by a raised vertical backrest.',
  },
  '502-08': {
    description: 'An experimental luminary instrument designed to oscillate at precise spectral intervals to analyze optical radiation.',
    shape: 'A rounded pear-shaped bulb tapering down to a grooved metallic base, ringed by subtle outward rays.',
  },
  '502-09': {
    description: 'A creative launchpad crafting bespoke digital portals and visual storefronts for expeditions across the world wide web.',
    shape: 'A tapered aerodynamic fuselage pointing diagonally upward with stabilizing triangular delta fins at its base.',
  },
  '502-10': {
    description: 'A rapid response triage mechanism engineered to swiftly bind ruptures, disinfect trauma, and stabilize wounded explorers.',
    shape: 'An oblong rectangular strip with curved safety ends, displaying a perforated square pad at its midpoint.',
  },

  // Lab 508
  '508-01': {
    description: 'An interconnected orchestration network that coordinates disparate heavy industrial apparatuses into seamless clockwork harmony.',
    shape: 'A circular mechanical wheel bordered with evenly spaced interlocking teeth encircling a central hollow axle.',
  },
  '508-02': {
    description: 'A vigilant guardian station continuously interpreting subtle physiological rhythms and biological vital signs to preserve human health.',
    shape: 'A flexible dual-stem tube looping downward and converging into a flat circular acoustic disc.',
  },
  '508-03': {
    description: 'A twin-panel visual interface engineered to duplicate perspective and double an operative\'s functional field of view.',
    shape: 'A sharp zigzag silhouette formed by acute diagonal angles snapping downward to an apex.',
  },
  '508-04': {
    description: 'A planetary relay infrastructure beaming rapid transmissions across oceans and continental divides through orbital paths.',
    shape: 'A curved dish-shaped reflector tilted diagonally upward, mounted to an angled lattice mast.',
  },
  '508-05': {
    description: 'A cryptographic sanctuary encoding valuable transactional ledgers within an unbreachable mathematical labyrinth.',
    shape: 'A solid rectangular base with an arched U-shaped curved shackle, accompanied by a notched metallic key.',
  },
  '508-06': {
    description: 'An enterprise powerhouse driving digital automatons to shoulder repetitive administrative duties without manual intervention.',
    shape: 'A high-voltage zigzag flash with crisp diagonal facets terminating in a pointed directional apex.',
  },

  // Lab 509
  '509-01': {
    description: 'A discerning literary companion that polishes academic treatises, rectifies prose, and elevates scholarly manuscripts for publication.',
    shape: 'A ruled rectangular parchment sheet flanked diagonally by a slender writing stylus along its margin.',
  },
  '509-02': {
    description: 'An intellectual compass surveying vast repositories of published literature to uncover cutting-edge scientific revelations.',
    shape: 'A curved vertical arm supporting an angled eyepiece directed down toward a flat specimen stage plate.',
  },
  '509-03': {
    description: 'A navigational tracking grid monitoring the path, coordinates, and operational lifecycle of vital mission equipment in motion.',
    shape: 'A spherical central body bisected diagonally by an encircling elliptical tilted ring.',
  },
  '509-04': {
    description: 'A silent synchronization conduit aligning scattered data repositories into an unbroken, harmonious current in real time.',
    shape: 'Two curved arrows forming a continuous circular loop, following each other\'s path in perpetual motion.',
  },
  '509-05': {
    description: 'A comprehensive architectural guild that designs, configures, and maintains the underlying digital framework of enterprises.',
    shape: 'A dual-tier clamshell silhouette showing a flat horizontal keypad plane hinged to an upright rectangular screen.',
  },
  '509-06': {
    description: 'A formidable computing monolith assembled with high-grade silicon processors to execute intense computational simulations.',
    shape: 'A broad widescreen monitor mounted upon a single vertical pedestal with a flat pedestal base.',
  },
  '509-07': {
    description: 'A strategic intelligence bureau translating raw operational figures into meaningful guidance and statistical dashboards.',
    shape: 'A series of three adjacent vertical rectangular pillars rising in ascending stair-step heights.',
  },
  '509-08': {
    description: 'A financial barometer recording the turbulent ebbs and surges of equity shares, commercial valuation, and market capital.',
    shape: 'An upward-trending diagonal line charting a jagged path toward the upper right corner, crowned with an arrow point.',
  },
  '509-09': {
    description: 'A synchronized constellation of portable electronics, wearables, and smart glass portals that communicate in total synergy.',
    shape: 'A sleek vertical handheld slate with rounded bezels and a single central flat glass facade.',
  },
  '509-10': {
    description: 'A celebrated proprietary mobile operating environment distinguished by fluid tactile gestures and unified design elegance.',
    shape: 'A rounded organic fruit silhouette crowned with a single curved leaf angled along the top.',
  },

  // Lab 510
  '510-01': {
    description: 'A venerable desktop repository organizing complex grids, relational queries, and operational records under one roof.',
    shape: 'A tall vertical rectangular unit stacked with multiple horizontal pull-out drawer compartments with handles.',
  },
  '510-02': {
    description: 'A neural algorithmic intelligence predicting consumer inclinations to deliver targeted commercial transmissions with precision.',
    shape: 'A geometric angular head silhouette with visor-like horizontal apertures and bilateral bolt features.',
  },
  '510-03': {
    description: 'A lightweight optical headset blending digital sensory overlays directly with the wearer\'s physical sight and spatial sound.',
    shape: 'Dual oval lenses joined across a center nose bridge, flanked by slender horizontal temple arms.',
  },
  '510-04': {
    description: 'An ultra-fast transmission channel directing pulses of pure concentrated light through optical fiber filaments spanning continents.',
    shape: 'A sphere crossed by curved latitude arcs and longitudinal meridian lines resembling a wireframe orb.',
  },
};

// Generates an authentic Uncharted-style letter cipher pattern:
// - Very short names (<= 3 letters, e.g. "AVG"): strictly 1 letter visible (first letter)
// - Short names (4 to 8 letters): strictly 2 letters visible (first & last)
// - 9+ letters: strictly 3 letters visible (first, middle/word initial, last)
export function generateCipherPattern(name: string): string {
  if (!name) return 'A _ _ Z';

  // Strip frequency tag if present for cipher display
  const cleanedTitle = name.replace(/\s*\([^)]*\)/g, '').trim();

  // Find all alphanumeric character positions
  const lettersOnly: number[] = [];
  for (let i = 0; i < cleanedTitle.length; i++) {
    if (/[a-zA-Z0-9]/.test(cleanedTitle[i])) {
      lettersOnly.push(i);
    }
  }

  const totalLetters = lettersOnly.length;
  const visibleIndices = new Set<number>();

  if (totalLetters <= 3) {
    // For very short names (<= 3 letters, e.g. "AVG"): exactly 1 letter visible (first letter)
    if (lettersOnly.length > 0) visibleIndices.add(lettersOnly[0]);
  } else if (totalLetters <= 8) {
    // For short names (4-8 letters): exactly 2 letters visible (first and last letter)
    visibleIndices.add(lettersOnly[0]);
    visibleIndices.add(lettersOnly[lettersOnly.length - 1]);
  } else {
    // For 9+ letters: exactly 3 letters visible (first letter, middle/word letter, last letter)
    visibleIndices.add(lettersOnly[0]);
    visibleIndices.add(lettersOnly[lettersOnly.length - 1]);

    // Choose 1 good middle index
    const words = cleanedTitle.split(/\s+/);
    if (words.length >= 2) {
      let runningIdx = 0;
      for (let w = 0; w < words.length; w++) {
        const wordStart = cleanedTitle.indexOf(words[w], runningIdx);
        if (w === 1) {
          const match = words[w].search(/[a-zA-Z0-9]/);
          if (match !== -1) {
            visibleIndices.add(wordStart + match);
            break;
          }
        }
        runningIdx = wordStart + words[w].length;
      }
    }

    // If still less than 3, pick the true middle letter
    if (visibleIndices.size < 3) {
      const midLetterIdx = lettersOnly[Math.floor(lettersOnly.length / 2)];
      visibleIndices.add(midLetterIdx);
    }
  }

  // Format characters with 1 space between letters and 4 spaces between words
  return cleanedTitle
    .split(/\s+/)
    .map((word) => {
      const wordPos = cleanedTitle.indexOf(word);
      return word
        .split('')
        .map((ch, idx) => {
          const globalIdx = wordPos + idx;
          if (/[a-zA-Z0-9]/.test(ch)) {
            if (visibleIndices.has(globalIdx)) {
              return ch.toUpperCase();
            }
            return '_';
          }
          return ch; // keep hyphens and punctuation
        })
        .join(' ');
    })
    .join('    ');
}

// Clean dynamic clue generator with enigmatic clues and non-leaking shapes
export function getProductClues(product: ProductWithLab): ProductClues {
  const labNum =
    (product.labName + ' ' + (product.labTitle || '')).match(/\b(5\d{2}|\d{3})\b/)?.[1] ||
    (product.labId === '1' ? '502' : product.labId === '2' ? '508' : product.labId === '3' ? '509' : '510');

  // Look up cryptic info by product ID or normalized fallback
  const crypticInfo =
    PRODUCT_CRYPTIC_CLUES[product.id] || {
      description: 'An exploratory engineering venture deployed to pioneer digital operations in this sector.',
      shape: 'An intricate geometric sigil etched with balanced proportions and distinct perimeter angles.',
    };

  const cipherPattern = generateCipherPattern(product.name);
  const cleanTitle = product.name.replace(/\s*\([^)]*\)/g, '').trim();
  const cleanLetters = cleanTitle.replace(/[^a-zA-Z0-9]/g, '');
  const words = cleanTitle.split(/\s+/);
  const wordCountStr = words.length === 1 ? '1 word' : `${words.length} words`;

  // Clue 1: Atmospheric enigmatic description (no product names or card giveaways)
  const clue1 = `Housed in Lab ${labNum}. ${crypticInfo.description}`;

  // Clue 2: Abstract insignia silhouette (no direct emoji or concrete name)
  const clue2 = `Insignia Silhouette: ${crypticInfo.shape}`;

  // Clue 3: Cipher pattern with strictly 1 letter for short names (<=3 letters) and 2-3 letters for others
  const clue3 =
    cleanLetters.length <= 3
      ? `A concise ${cleanLetters.length}-letter designation. Decipher the nameplate below:`
      : `Encrypted nameplate (${cleanLetters.length} letters, ${wordCountStr}). Decipher the code below:`;

  return {
    clue1,
    clue2,
    clue3,
    aboutText: crypticInfo.description,
    icon: product.icon || '📦',
    iconLabel: crypticInfo.shape,
    cipherPattern,
    nameHint: `${cleanLetters.length} Letters • ${wordCountStr}`,
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
  const [selectedRewardItem, setSelectedRewardItem] = useState<ExpeditionItemReward | null>(null);
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

  const isLab4Done = useMemo(() => {
    if (completedLabIds?.includes('4') || completedLabIds?.includes('e')) return true;
    return isLabCompleted('4', normalizedEmail);
  }, [completedLabIds, normalizedEmail, localFeedbackVersion]);

  const completedLabsCount = (isLab1Done ? 1 : 0) + (isLab2Done ? 1 : 0) + (isLab3Done ? 1 : 0) + (isLab4Done ? 1 : 0);

  // User submitted product IDs across all labs
  const submittedProductIds = useMemo(() => {
    return getSubmittedFeedbackForUser(normalizedEmail);
  }, [normalizedEmail, localFeedbackVersion]);

  // Product pool from all base labs (supports live database override from useLabs)
  const allProducts: ProductWithLab[] = useMemo(() => {
    const l1 = dbLabs['1'] || baseExpeditionLabs['1'];
    const l2 = dbLabs['2'] || baseExpeditionLabs['2'];
    const l3 = dbLabs['3'] || baseExpeditionLabs['3'];
    const l4 = dbLabs['4'] || baseExpeditionLabs['4'];
    const labsList = [l1, l2, l3, l4].filter(Boolean);

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
      localStorage.setItem(`treasure_target_product_${userEmail}`, chosen.id);
    }
    return chosen;
  }, [allProducts, normalizedEmail, userEmail]);

  // Generate & store 3 clues randomly and persistently for this user (v3 cache)
  const targetClues = useMemo(() => {
    if (!targetProduct) return null;
    if (typeof window !== 'undefined') {
      try {
        const stored =
          localStorage.getItem(`treasure_clues_v3_${normalizedEmail}`) ||
          localStorage.getItem(`treasure_clues_v3_${userEmail}`);
        if (stored) return JSON.parse(stored) as ProductClues;
      } catch {}
    }
    const generated = getProductClues(targetProduct);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`treasure_clues_v3_${normalizedEmail}`, JSON.stringify(generated));
        localStorage.setItem(`treasure_clues_v3_${userEmail}`, JSON.stringify(generated));
      } catch {}
    }
    return generated;
  }, [targetProduct, normalizedEmail, userEmail]);

  // Deterministically select & persist 1 single random expedition reward item for this user
  const userRewardItem = useMemo<ExpeditionItemReward>(() => {
    if (typeof window !== 'undefined') {
      const storedItemId =
        localStorage.getItem(`treasure_user_reward_item_${normalizedEmail}`) ||
        localStorage.getItem(`treasure_user_reward_item_${userEmail}`);
      if (storedItemId) {
        const found = EXPEDITION_REWARD_ITEMS.find((it) => it.id === storedItemId);
        if (found) return found;
      }
    }

    // Stable hash based on email string to pick 1 random reward item
    const hash = normalizedEmail
      .split('')
      .reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 31), 0);

    const chosen =
      EXPEDITION_REWARD_ITEMS[Math.abs(hash) % EXPEDITION_REWARD_ITEMS.length] ||
      EXPEDITION_REWARD_ITEMS[0];
    if (typeof window !== 'undefined' && chosen) {
      try {
        localStorage.setItem(`treasure_user_reward_item_${normalizedEmail}`, chosen.id);
        localStorage.setItem(`treasure_user_reward_item_${userEmail}`, chosen.id);
      } catch {}
    }
    return chosen;
  }, [normalizedEmail, userEmail]);

  // Has the user submitted feedback for this target product in its lab? (Only shown as a badge if solved)
  const isTargetSubmitted = useMemo(() => {
    if (!targetProduct) return false;
    return submittedProductIds.includes(targetProduct.id);
  }, [targetProduct, submittedProductIds]);

  // Are all 3 clues unlocked? (Strictly requires all 3 clues: Clue 1, Clue 2, AND Clue 3)
  const areAllCluesUnlocked = Boolean(unlockedClues[1] && unlockedClues[2] && unlockedClues[3]);

  // Did the user solve the secret product early via guess before all 3 clues are unlocked?
  const isFoundEarly = Boolean(isVerified && !areAllCluesUnlocked);

  // If user completed all reviews across all labs (informational)
  const isAllReviewsCompleted = useMemo(() => {
    return totalProductsCount > 0 && completedProductsCount >= totalProductsCount;
  }, [completedProductsCount, totalProductsCount]);

  // The secret product is revealed ONLY when:
  // 1. All 3 clues have been unlocked, OR
  // 2. The user correctly guesses early
  const isProductRevealed = Boolean(isVerified || areAllCluesUnlocked);
  const isSolved = isProductRevealed;

  // The surprise item (relic) MUST ONLY be revealed once the product is revealed!
  const isArtifactUnlocked = isProductRevealed;

  // Load verified state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
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
    if (!targetProduct || isSolved || areAllCluesUnlocked) return;

    const cleanInput = normalizeName(guessInput);
    if (!cleanInput || cleanInput.length < 2) {
      setStatusMessage('Please enter at least 2 letters of the project name.');
      return;
    }

    const cleanTargetName = normalizeName(targetProduct.name);
    const cleanTargetBase = normalizeName(targetProduct.name.replace(/\s*\([^)]*\)/g, ''));

    const noSpaceInput = cleanInput.replace(/\s+/g, '');
    const noSpaceTarget = cleanTargetName.replace(/\s+/g, '');
    const noSpaceBase = cleanTargetBase.replace(/\s+/g, '');

    // Allow flexible matching:
    // 1. Exact match (e.g. 'astron', 'avg', 'led light')
    // 2. Space-agnostic match (e.g. 'assetorbit' vs 'asset orbit')
    // 3. Exact match with the base name (ignoring parenthesized "(frequency)")
    // 4. Substantial match if input length >= 4 and covers at least 75% of name
    const isExact = cleanInput === cleanTargetName || cleanInput === cleanTargetBase;
    const isNoSpace = noSpaceInput === noSpaceTarget || noSpaceInput === noSpaceBase;
    const isSubstantial =
      cleanInput.length >= 4 &&
      ((cleanTargetName.startsWith(cleanInput) && cleanInput.length >= Math.ceil(cleanTargetName.length * 0.75)) ||
        (cleanTargetBase.startsWith(cleanInput) && cleanInput.length >= Math.ceil(cleanTargetBase.length * 0.75)));

    const isCorrect = isExact || isNoSpace || isSubstantial;

    if (isCorrect) {
      setIsVerified(true);
      setStatusMessage('✦ Correct! Mystery project solved early — your artifact has been unlocked below!');
      if (typeof window !== 'undefined') {
        localStorage.setItem(`treasure_verified_${normalizedEmail}`, 'true');
        localStorage.setItem(`treasure_verified_${userEmail}`, 'true');
      }
    } else {
      setIsShaking(true);
      setStatusMessage('Not quite right — check the clues or try another guess.');
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
          className="relative w-full bg-[length:100%_100%] bg-no-repeat bg-center px-8 sm:px-12 md:px-14 pt-11 sm:pt-14 md:pt-16 pb-16 sm:pb-20 md:pb-24 flex flex-col justify-between text-[#241308] overflow-hidden"
        >
          {/* Treasure Undersea Background Artwork with Low Opacity */}
          <div
            style={{
              backgroundImage: `url('/treasure.webp')`,
              WebkitMaskImage: `url('/assets/images/torn-card-bg.webp')`,
              WebkitMaskSize: '100% 100%',
              maskImage: `url('/assets/images/torn-card-bg.webp')`,
              maskSize: '100% 100%',
            }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.14] pointer-events-none"
          />

          {/* Top Right Wax Seal Badge */}
          <div className="absolute top-8 right-8 sm:top-10 sm:right-11 md:top-11 md:right-13 w-10 h-10 sm:w-11 sm:h-11 pointer-events-none opacity-90 z-20">
            {isVerified ? (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-[#8b261d] flex items-center justify-center rotate-12 bg-[#8b261d]/20 shadow-md">
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className="text-[9px] font-black text-[#8b261d] uppercase tracking-wider"
                >
                  SOLVED
                </span>
              </div>
            ) : completedLabsCount === 0 ? (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-[#8b6943]/60 flex items-center justify-center -rotate-6 bg-[#241308]/10 shadow-sm">
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className="text-[9px] font-black text-[#6b4516] uppercase tracking-wider"
                >
                  LOCKED
                </span>
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-[#8b6943] flex items-center justify-center rotate-12 bg-[#8b6943]/15 shadow-sm">
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className="text-[9px] font-black text-[#6b4516] uppercase tracking-wider"
                >
                  ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Section Header with Proper Visible Fonts & Stated Challenge */}
          <div className="mb-2.5 sm:mb-3 px-0.5 flex flex-col items-start pr-14 sm:pr-16 relative z-10 w-full">
            <div className="flex items-center gap-2">
              <span className="text-[#b38920] text-base sm:text-lg animate-pulse">✦</span>
              <h2
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                className="text-lg sm:text-2xl md:text-3xl font-black text-[#1c0f05] tracking-wide leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]"
              >
                EXPEDITION TREASURE MAP
              </h2>
            </div>

            {/* Clear Challenge Explanation Box */}
            <div className="mt-1.5 p-2 sm:p-2.5 rounded-lg bg-[#241308]/[0.08] border border-[#8b6943]/40 text-[#3d1f05] w-full">
              <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs text-[#854d0e] uppercase tracking-wider font-mono">
                <span>🎯</span>
                <span>Secret Product Challenge</span>
              </div>
              <p
                style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                className="text-xs sm:text-[13px] font-semibold text-[#3d1f05] mt-0.5 leading-snug"
              >
                Guess the secret mystery product using the clues before all 3 clues are unlocked! Once all 3 clues are uncovered, the mystery product and your expedition artifact are automatically revealed.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VINTAGE TREASURE MAP CANVAS WITH NATHAN DRAKE & WAYPOINTS                 */}
          {/* ========================================================================= */}
          <div className="my-1.5 sm:my-2 select-none relative z-10">
            <div
              style={{
                backgroundImage: `url('/assets/images/pirate_trail_map.png')`,
              }}
              data-nathan-container="true"
              className="relative w-full aspect-[16/8.8] bg-[length:100%_100%] bg-center bg-no-repeat rounded-lg overflow-visible select-none border border-[#8b6943]/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
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
            <div className="mt-1.5 w-full flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md bg-[#1f1006]/95 border border-[#8b6943]/60 text-[#f5ebd7] font-mono text-[10px] sm:text-xs shadow-inner">
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
          <div className="flex flex-col gap-2 my-1.5 sm:my-2 relative z-10">
            {/* Clues Header Bar with Count on Top */}
            <div className="flex items-center justify-between px-0.5 mb-0.5">
              <span
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3d1f05] flex items-center gap-1.5"
              >
                <span>📜</span>
                <span>Clues</span>
              </span>
              <span
                style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                className="text-xs sm:text-sm font-bold text-[#854d0e] bg-[#fef3c7] border border-[#d4af37]/60 px-2.5 sm:px-3 py-0.5 rounded-full shadow-xs"
              >
                {(unlockedClues[1] ? 1 : 0) + (unlockedClues[2] ? 1 : 0) + (unlockedClues[3] ? 1 : 0)} / 3 Unlocked
              </span>
            </div>

            {/* Card 1: Clue 1 */}
            <div
              onClick={() => setActiveCrossClue(activeCrossClue === 1 ? null : 1)}
              className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all cursor-pointer ${
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
              <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-[#8b6943]/20">
                <span
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-xs sm:text-sm font-black text-[#2c1405]"
                >
                  Clue 1
                </span>
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
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
              className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all cursor-pointer ${
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
              <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-[#8b6943]/20">
                <span
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-xs sm:text-sm font-black text-[#2c1405]"
                >
                  Clue 2
                </span>
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
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
                <div className="flex items-start sm:items-center gap-3 pt-0.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#fef3c7] to-[#fde68a] border-2 border-[#d4af37] flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-xs">
                    <span title="Insignia Recon">🔍</span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                      className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#b45309]"
                    >
                      Insignia Silhouette Clue
                    </span>
                    <p
                      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                      className="text-sm sm:text-[15px] font-semibold text-[#1c0f05] leading-relaxed"
                    >
                      {targetClues?.clue2}
                    </p>
                  </div>
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
              className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all cursor-pointer ${
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
              <div className="flex items-center justify-between mb-1 pb-0.5 border-b border-[#8b6943]/20">
                <span
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-xs sm:text-sm font-black text-[#2c1405]"
                >
                  Clue 3
                </span>
                <span
                  style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
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
          <div className="mt-2 pt-2 border-t-2 border-[#8b6943]/35 relative z-10">
            <div className="flex items-center justify-between mb-1.5">
              <span
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3d1f05] flex items-center gap-1.5"
              >
                <span>🗝️</span>
                <span>Mystery Secret Product</span>
              </span>
              {isSolved ? (
                <span className="px-2 py-0.5 rounded bg-emerald-800/15 text-emerald-900 border border-emerald-800/40 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  ✦ {isFoundEarly ? 'Challenge Won Early' : areAllCluesUnlocked ? 'All Clues Unlocked • Form Closed' : 'Solved'}
                </span>
              ) : (
                <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded bg-[#8b6943]/15 text-[#6d3e16] border border-[#8b6943]/30 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  ✦ Guessing Open
                </span>
              )}
            </div>

            {isSolved ? (
              <div className="p-3 sm:p-4 rounded-xl border-2 border-[#b38920] bg-gradient-to-r from-[#fef3c7] via-[#fffbeb] to-[#fde68a] flex flex-col gap-2 shadow-md">
                <div className="flex items-center justify-between border-b border-[#b38920]/40 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg">
                      {isFoundEarly ? '🏆' : areAllCluesUnlocked ? '✨' : '🗝️'}
                    </span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[#7a481c]">
                      {isFoundEarly
                        ? 'CHALLENGE WON • SOLVED EARLY BEFORE ALL CLUES!'
                        : areAllCluesUnlocked
                        ? 'ALL 3 CLUES UNCOVERED • GUESSING CLOSED & REVEALED'
                        : 'MYSTERY PROJECT SOLVED'}
                    </span>
                  </div>
                  <span className="text-emerald-700 text-xs font-bold font-mono">
                    ✓ Cleared
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#1c0f05] to-[#3a1e08] border-2 border-[#ffd700] flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-md overflow-hidden">
                    <ProductIcon icon={targetProduct?.icon} fallback="🪐" imgClassName="w-8 h-8 sm:w-9 sm:h-9" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-mono font-bold text-[#b45309]">
                        Lab {targetClues?.labNum || '502'}
                      </span>
                      {isTargetSubmitted && (
                        <span className="text-[9px] font-mono text-emerald-800 bg-emerald-800/15 px-1.5 py-0.2 rounded border border-emerald-700/30 font-bold">
                          ✓ Reviewed by you
                        </span>
                      )}
                    </div>
                    <h3
                      style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                      className="text-base sm:text-xl font-black text-[#1c0f05] truncate"
                    >
                      {targetProduct?.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#5c3710] font-serif italic truncate mt-0.5">
                      &quot;{targetProduct?.description}&quot;
                    </p>
                  </div>
                </div>

                {isFoundEarly ? (
                  <div className="text-[10px] sm:text-[11px] font-mono text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded border border-emerald-400 font-semibold text-center">
                    Outstanding recon! You guessed this product early — your mystery artifact has been awarded below!
                  </div>
                ) : areAllCluesUnlocked ? (
                  <div className="text-[10px] sm:text-[11px] font-mono text-[#854d0e] bg-amber-100/80 px-2.5 py-1 rounded border border-amber-400 font-semibold text-center">
                    All clues unlocked! Guess form is sealed and your artifact has been directly revealed below.
                  </div>
                ) : null}
              </div>
            ) : (
              <form
                onSubmit={handleVerifyGuess}
                className={`flex flex-col gap-2 ${isShaking ? 'animate-shake' : ''}`}
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    placeholder="Guess project or company name..."
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                    className="flex-1 min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border-2 border-[#8b6943]/60 bg-[#fffbf2] text-[#1c0f05] text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#b38920] shadow-inner placeholder:font-normal placeholder:italic placeholder:text-[#8b6943]/60 transition"
                  />
                  <button
                    type="submit"
                    style={{
                      fontFamily: "var(--font-cinzel), 'Cinzel', serif",
                      clipPath:
                        'polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)',
                    }}
                    className="py-2 sm:py-2.5 px-5 bg-gradient-to-b from-[#ffd700] via-[#d4af37] to-[#996515] text-[#140802] font-black text-xs sm:text-sm uppercase tracking-widest shadow-md transition hover:brightness-110 active:scale-[0.98] border-t border-[#fff9d6] cursor-pointer shrink-0"
                  >
                    Verify Solution
                  </button>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-[11px] font-mono text-[#7a481c] italic px-1">
                  <span>✦ Guess early to unlock your artifact!</span>
                  <span className="hidden sm:inline sm:shrink-0">All 3 clues closes guessing & directly reveals artifact</span>
                </div>
              </form>
            )}

            {/* Status Feedback Banner */}
            {statusMessage && !isSolved && (
              <div className="mt-2 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold text-center bg-rose-100 border border-rose-400 text-rose-900 shadow-sm flex items-center justify-center gap-1.5">
                <span>⚠️</span>
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 1 SINGLE RANDOM EXPEDITION REWARD SECTION (FROM /items)                   */}
          {/* ========================================================================= */}
          <div className="mt-3 pt-3 border-t-2 border-[#8b6943]/35 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg">🎁</span>
                <span
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3d1f05]"
                >
                  Expedition Item Reward
                </span>
              </div>
              <span
                style={{ fontFamily: "var(--font-oswald), sans-serif" }}
                className={`shrink-0 whitespace-nowrap text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  isArtifactUnlocked
                    ? 'bg-emerald-800/15 text-emerald-900 border-emerald-700/50'
                    : 'bg-[#241308]/10 text-[#7a5a3a] border-[#8b6943]/30'
                }`}
              >
                {isArtifactUnlocked
                  ? isFoundEarly
                    ? '✦ Unlocked Early'
                    : '✦ Artifact Revealed'
                  : '🔒 Sealed Relic'}
              </span>
            </div>

            {isArtifactUnlocked ? (
              /* User Solved Early OR All Clues Unlocked OR All Reviews Done -> 1 Surprise Reward Revealed! */
              <div className="flex flex-col gap-2.5">
                <div className="p-2.5 rounded-lg bg-gradient-to-r from-[#d4af37]/25 via-[#fef3c7] to-[#d4af37]/25 border border-[#d4af37] text-center shadow-xs">
                  <span className="inline-block text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#854d0e]">
                    {isFoundEarly
                      ? '✦ EARLY DISCOVERY REWARD SECURED ✦'
                      : '✦ EXPEDITION ARTIFACT REVEALED ✦'}
                  </span>
                  <p
                    style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                    className="text-xs sm:text-sm font-black text-[#1c0f05] mt-0.5"
                  >
                    {isFoundEarly
                      ? 'You correctly guessed the mystery product early and unlocked your expedition artifact!'
                      : 'All 3 clues unlocked! Your unique expedition relic has been directly revealed!'}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#6b4516] font-serif italic mt-0.5">
                    Click the artifact below to inspect its archaeological lore and inscription.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedRewardItem(userRewardItem)}
                  className="p-3.5 sm:p-4 rounded-xl border-2 border-[#b38920] bg-gradient-to-b from-[#fffbf2] via-[#fbf3e2] to-[#f4e4c3] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-sm hover:shadow-md hover:border-[#d4af37] transition-all cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#1c0f05]/10 to-[#1c0f05]/5 border-2 border-[#d4af37]/60 group-hover:border-[#d4af37] flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                      <img
                        src={userRewardItem.image}
                        alt={userRewardItem.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </div>
                    <div className="flex flex-col items-center sm:items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#d4af37]/25 text-[#854d0e] border border-[#d4af37]/50">
                          {userRewardItem.rarity}
                        </span>
                        <span className="text-[9.5px] sm:text-[10.5px] font-mono text-[#8b6943]">
                          {userRewardItem.origin}
                        </span>
                      </div>
                      <h4
                        style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                        className="text-sm sm:text-base font-black text-[#1c0f05] leading-tight group-hover:text-[#8b261d] transition-colors"
                      >
                        {userRewardItem.name}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#5c3710] font-mono italic">
                        &ldquo;{userRewardItem.inscription}&rdquo;
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRewardItem(userRewardItem);
                    }}
                    style={{
                      fontFamily: "var(--font-cinzel), 'Cinzel', serif",
                      clipPath:
                        'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
                    }}
                    className="py-2 px-4 bg-gradient-to-b from-[#ffd700] via-[#d4af37] to-[#996515] text-[#140802] font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition shrink-0 cursor-pointer"
                  >
                    Inspect Relic ➔
                  </button>
                </div>
              </div>
            ) : (
              /* Not Yet Unlocked: 1 SURPRISE REWARD LOCKED */
              <div className="flex flex-col gap-2">
                <div className="p-2 rounded-lg bg-[#241308]/[0.06] border border-[#8b6943]/35 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔒</span>
                    <p className="text-[11px] sm:text-xs text-[#5c3710] font-serif italic">
                      Surprise artifact remains sealed! Guess the product early or unlock all 3 clues to reveal your relic.
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#241308]/10 text-[#7a5a3a] border border-[#8b6943]/30 shrink-0">
                    HIDDEN
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl border-2 border-dashed border-[#8b6943]/45 bg-gradient-to-b from-[#241308]/[0.08] via-[#241308]/[0.04] to-[#241308]/[0.08] flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4 text-center sm:text-left select-none relative overflow-hidden">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-[#3a2010]/20 to-[#241308]/30 border-2 border-[#8b6943]/40 flex items-center justify-center text-2xl text-[#b38920] shadow-inner shrink-0">
                    <span className="animate-pulse">❓</span>
                    <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>
                  </div>
                  <div className="flex flex-col items-center sm:items-start gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#8b6943]/20 text-[#8b6943] border border-[#8b6943]/30">
                        Surprise Relic
                      </span>
                      <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold text-[#8b261d]">
                        🔒 Sealed
                      </span>
                    </div>
                    <h4
                      style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                      className="text-sm sm:text-base font-black text-[#2e1908] tracking-wide"
                    >
                      Locked Mystery Artifact
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#6b4516] font-serif italic max-w-md">
                      Find and guess the product early, or uncover all 3 clues along the expedition trail to unlock this artifact!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 4 Items Reward Inspection Modal */}
      <AnimatePresence>
        {selectedRewardItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedRewardItem(null)}
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
                onClick={() => setSelectedRewardItem(null)}
                className="absolute top-3.5 right-3.5 text-[#d4af37]/70 hover:text-[#fffbeb] transition text-sm font-mono w-7 h-7 rounded-full border border-[#8c6d23]/40 flex items-center justify-center hover:bg-[#8c6d23]/20 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="text-center pb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 text-[#fef08a] font-mono text-[10px] sm:text-xs font-extrabold uppercase tracking-widest shadow-sm">
                  <span>✦ EXPEDITION ITEM SECURED ✦</span>
                </div>
              </div>

              {/* Large Image Preview */}
              <div className="relative my-4 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-b from-[#451a03] to-[#1a0b02] border-2 border-[#d4af37] flex items-center justify-center shadow-[0_0_28px_rgba(212,175,55,0.5)] p-2">
                  <img
                    src={selectedRewardItem.image}
                    alt={selectedRewardItem.name}
                    className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
                  />
                </div>

                <div className="mt-2 text-center">
                  <span className="px-3 py-0.5 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/20 text-[#fbbf24] font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    {selectedRewardItem.rarity}
                  </span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
                  className="text-xl sm:text-2xl font-bold text-[#ffd700] tracking-tight leading-snug"
                >
                  {selectedRewardItem.name}
                </h3>
                <p className="text-xs font-mono uppercase tracking-wider text-[#a07246]">
                  Origin: {selectedRewardItem.origin}
                </p>

                <div className="my-3 p-3.5 rounded-lg border border-[#8c6d23]/40 bg-[#140a02]/60 text-left">
                  <p className="text-xs sm:text-sm text-[#e2d3be] font-mono leading-relaxed">
                    {selectedRewardItem.lore}
                  </p>
                </div>

                <div className="pt-1">
                  <p className="text-xs font-mono italic text-[#d4af37]/90 bg-[#2b1708]/70 py-2 px-3 rounded border border-[#8c6d23]/30">
                    &ldquo;{selectedRewardItem.inscription}&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#8c6d23]/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-[#a07246]">
                  <span>✦ Item Saved in Inventory</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRewardItem(null)}
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
