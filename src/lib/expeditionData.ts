import { getCachedLab } from './expeditionStore';

export interface CheckpointNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  x: number; // Percentage from left (0 - 100)
  y: number; // Percentage from top (0 - 100)
}

export interface ExpeditionLab {
  id: string;
  labId?: string;
  sourceLab?: string;
  chapterNumber: string;
  name: string;
  title: string;
  subtitle: string;
  badgeTitle: string;
  fragmentId?: string;
  fragmentName?: string;
  fragmentImage?: string;
  mapImage?: string;
  themeType?: 'jungle' | 'frost' | 'volcano' | 'desert';
  inkColor?: string;
  glowColor?: string;
  coreGlow?: string;
  badgeClass?: string;
  checkpoints: CheckpointNode[];
}

// 1. Primary Base Labs (Strictly 3 Sectors with Distinct Environmental Spread Maps)
export const baseExpeditionLabs: Record<string, ExpeditionLab> = {
  '1': {
    id: '1',
    labId: '1',
    sourceLab: '1',
    chapterNumber: 'Chapter I',
    name: 'Lab 502',
    title: 'LAB 502',
    subtitle: 'Uncover ancient temple ruins, forgotten jungle canopies, and lost stone beacons.',
    badgeTitle: 'Portolan Route Mastered',
    fragmentId: '1',
    fragmentName: 'Avery Pirate Seal',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab1.webp',
    themeType: 'jungle',
    inkColor: '#1b381e',
    glowColor: '#10b981',
    coreGlow: '#d1fae5',
    badgeClass: 'bg-[#14532d]/20 text-[#166534] border-[#166534]/40',
    checkpoints: [
      {
        id: 'c1-p1',
        name: 'ASSETORBIT',
        description: 'Asset management and orbital telemetry tracking platform.',
        icon: '🪐',
        x: 35,
        y: 20,
      },
      {
        id: 'c1-p2',
        name: 'SUNTECH TECHNOLOGY',
        description: 'Solar intelligence and smart power distribution matrix.',
        icon: '☀️',
        x: 74,
        y: 22,
      },
      {
        id: 'c1-p3',
        name: 'ABCD IT SOLUTIONS',
        description: 'Enterprise IT infrastructure and software acceleration.',
        icon: '💻',
        x: 82,
        y: 40,
      },
      {
        id: 'c1-p4',
        name: 'ADSNEX AI',
        description: 'Next-generation neural targeting and AI analytics engine.',
        icon: '🤖',
        x: 44,
        y: 46,
      },
      {
        id: 'c1-p5',
        name: 'META GLASSES',
        description: 'Augmented reality vision and spatial computing interface.',
        icon: '👓',
        x: 76,
        y: 58,
      },
      {
        id: 'c1-p6',
        name: 'OPTINEXT GLOBAL.IN',
        description: 'Global optical networking and low-latency routing gateway.',
        icon: '🌐',
        x: 34,
        y: 68,
      },
      {
        id: 'c1-p7',
        name: 'PRELAUNCH',
        description: 'Product readiness telemetry and agile launchpad monitor.',
        icon: '🚀',
        x: 66,
        y: 76,
      },
    ],
  },
  '2': {
    id: '2',
    labId: '2',
    sourceLab: '2',
    chapterNumber: 'Chapter II',
    name: 'Lab 508',
    title: 'LAB 508',
    subtitle: 'Explore research assistants, smart frequency systems, and market platforms.',
    badgeTitle: 'Lab 508 Mastered',
    fragmentId: '2',
    fragmentName: 'Magellan Cross Key',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab2.webp',
    themeType: 'frost',
    inkColor: '#0f2238',
    glowColor: '#38bdf8',
    coreGlow: '#e0f2fe',
    badgeClass: 'bg-[#0369a1]/20 text-[#0284c7] border-[#0284c7]/40',
    checkpoints: [
      {
        id: 'c2-p1',
        name: 'MAITRI',
        description: 'Collaborative community intelligence and inclusive assistive tech.',
        icon: '🤝',
        x: 32,
        y: 20,
      },
      {
        id: 'c2-p2',
        name: 'R DISCOVERY',
        description: 'Academic paper recommendation and research synthesis platform.',
        icon: '🔬',
        x: 72,
        y: 24,
      },
      {
        id: 'c2-p3',
        name: 'PAPERPAL',
        description: 'Real-time scholarly writing assistance and citation analysis.',
        icon: '📝',
        x: 80,
        y: 42,
      },
      {
        id: 'c2-p4',
        name: 'LED LIGHT (frequency)',
        description: 'High-frequency tunable illumination and stroboscopic telemetry.',
        icon: '💡',
        x: 44,
        y: 48,
      },
      {
        id: 'c2-p5',
        name: 'SETH COMPUTERS',
        description: 'Custom computing architectures and high-throughput systems.',
        icon: '🖥️',
        x: 74,
        y: 60,
      },
      {
        id: 'c2-p6',
        name: 'ANAY IT SOLUTIONS',
        description: 'Business analytics and agile technology infrastructure.',
        icon: '📊',
        x: 30,
        y: 70,
      },
      {
        id: 'c2-p7',
        name: 'SHIVAM STOCKS',
        description: 'Real-time equity market analysis and algorithmic trading signals.',
        icon: '📈',
        x: 62,
        y: 78,
      },
    ],
  },
  '3': {
    id: '3',
    labId: '3',
    sourceLab: '3',
    chapterNumber: 'Chapter III',
    name: 'Lab 509',
    title: 'LAB 509',
    subtitle: 'Inspect mobile ecosystems, cybersecurity tools, robotics, and smart desks.',
    badgeTitle: 'Lab 509 Mastered',
    fragmentId: '3',
    fragmentName: 'King’s Astrolabe Crest',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab3.webp',
    themeType: 'volcano',
    inkColor: '#240902',
    glowColor: '#f97316',
    coreGlow: '#fef08a',
    badgeClass: 'bg-[#9a3412]/20 text-[#c2410c] border-[#ea580c]/40',
    checkpoints: [
      {
        id: 'c3-p1',
        name: 'SAMSUNG ECOSYSTEM',
        description: 'Unified multi-device interconnectivity and smart home relay.',
        icon: '📱',
        x: 35,
        y: 18,
      },
      {
        id: 'c3-p2',
        name: 'ios',
        description: 'Modern iOS application ecosystem and mobile experience stack.',
        icon: '🍏',
        x: 72,
        y: 22,
      },
      {
        id: 'c3-p3',
        name: 'AVG',
        description: 'Real-time threat detection and endpoint cybersecurity shield.',
        icon: '🛡️',
        x: 82,
        y: 36,
      },
      {
        id: 'c3-p4',
        name: 'Robotic arm',
        description: 'Precision multi-axis articulated robotic arm for automated tasks.',
        icon: '🦾',
        x: 46,
        y: 42,
      },
      {
        id: 'c3-p5',
        name: 'robot',
        description: 'Autonomous mobile robot with LIDAR navigation and obstacle avoidance.',
        icon: '🤖',
        x: 70,
        y: 54,
      },
      {
        id: 'c3-p6',
        name: 'Byteverse',
        description: 'Decentralized digital realm and interactive 3D virtual environment.',
        icon: '🪐',
        x: 28,
        y: 62,
      },
      {
        id: 'c3-p7',
        name: 'In-Out Desk',
        description: 'Smart biometric ergonomic workstation and attendance tracking.',
        icon: '🪑',
        x: 55,
        y: 72,
      },
      {
        id: 'c3-p8',
        name: 'Mend-x',
        description: 'Automated digital first-aid and medical diagnostics assistant.',
        icon: '🩹',
        x: 78,
        y: 80,
      },
    ],
  },
  '4': {
    id: '4',
    labId: '4',
    sourceLab: '4',
    chapterNumber: 'Chapter IV',
    name: 'Lab 510',
    title: 'LAB 510',
    subtitle: 'Navigate ancient desert dunes, hidden oases, and sun-scorched pyramid ruins.',
    badgeTitle: 'Lab 510 Mastered',
    fragmentId: '4',
    fragmentName: 'Dune Sunstone Talisman',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab4.webp',
    themeType: 'desert',
    inkColor: '#2b1b04',
    glowColor: '#d97706',
    coreGlow: '#fef3c7',
    badgeClass: 'bg-[#b45309]/20 text-[#d97706] border-[#d97706]/40',
    checkpoints: [
      {
        id: 'c4-p1',
        name: 'SANDSTORM AI',
        description: 'Autonomous neural navigation and sandstorm filtering vision matrix.',
        icon: '🌪️',
        x: 34,
        y: 20,
      },
      {
        id: 'c4-p2',
        name: 'SOLARIS GRID',
        description: 'High-yield photovoltaic power grid and thermal energy storage.',
        icon: '⚡',
        x: 74,
        y: 22,
      },
      {
        id: 'c4-p3',
        name: 'DUNE ROVER ROBOTICS',
        description: 'All-terrain autonomous rover designed for extreme dune traverses.',
        icon: '🚙',
        x: 82,
        y: 38,
      },
      {
        id: 'c4-p4',
        name: 'MIRAGE CYBER DEFENSE',
        description: 'Next-gen deceptive honeypot architectures and perimeter protection.',
        icon: '🛡️',
        x: 45,
        y: 46,
      },
      {
        id: 'c4-p5',
        name: 'OASIS HYDRATION IOT',
        description: 'Smart moisture extraction, water reclamation, and telemetry nodes.',
        icon: '💧',
        x: 75,
        y: 58,
      },
      {
        id: 'c4-p6',
        name: 'PYRAMID CLOUD',
        description: 'Hierarchical edge data vault engineered for subterranean resilience.',
        icon: '🏛️',
        x: 32,
        y: 68,
      },
      {
        id: 'c4-p7',
        name: 'SCARAB SENSORS',
        description: 'Micro-sensor swarm deploying seismic and environmental telemetry.',
        icon: '🪲',
        x: 68,
        y: 78,
      },
    ],
  },
};

// 2. Slug & Letter Aliases Mapping
// Canonical lab IDs come from mock-data.ts: "a" (King's Bay), "c"
// (Libertalia), "d" (New Devon), "e" (Dune/Desert) — mapped onto sectors 1/2/3/4.
const labAliases: Record<string, string> = {
  a: '1',
  c: '2',
  d: '3',
  e: '4',
  'kings-bay': '1',
  libertalia: '2',
  'new-devon': '3',
  'desert': '4',
  'oasis': '4',
  'lab-510': '4',
  '510': '4',
};

// 3. Proxy Wrapper: Keeps Object.values(expeditionLabs) to 4 items while resolving aliases
export const expeditionLabs: Record<string, ExpeditionLab> = new Proxy(baseExpeditionLabs, {
  get(target, prop: string) {
    if (typeof prop !== 'string') return undefined;
    const resolvedKey = labAliases[prop] || prop;
    const fromCache = getCachedLab(resolvedKey);
    if (fromCache) return fromCache;
    if (prop in target) return target[prop];
    if (resolvedKey in target) return target[resolvedKey];
    return undefined;
  },
  ownKeys() {
    return ['1', '2', '3', '4'];
  },
  getOwnPropertyDescriptor(target, prop) {
    return Object.getOwnPropertyDescriptor(target, prop);
  },
});

export function getSubmittedFeedbackForUser(userEmail: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`feedback_submitted_${userEmail}`) || localStorage.getItem(`submittedFeedback_${userEmail}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSubmittedFeedbackForUser(userEmail: string, checkpointId: string): string[] {
  if (typeof window === 'undefined') return [];
  const current = getSubmittedFeedbackForUser(userEmail);
  if (!current.includes(checkpointId)) {
    const updated = [...current, checkpointId];
    localStorage.setItem(`feedback_submitted_${userEmail}`, JSON.stringify(updated));
    localStorage.setItem(`submittedFeedback_${userEmail}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('feedbackSubmitted'));
    return updated;
  }
  return current;
}

export function isLabCompleted(labId: string, userEmail: string): boolean {
  const lab = expeditionLabs[labId];
  if (!lab || !lab.checkpoints) return false;
  const submitted = getSubmittedFeedbackForUser(userEmail);
  return lab.checkpoints.length > 0 && lab.checkpoints.every((cp) => submitted.includes(cp.id));
}
