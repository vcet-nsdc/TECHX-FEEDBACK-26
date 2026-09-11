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
        id: '502-01',
        name: 'ASTRON',
        description: 'Advanced space exploration telemetry and celestial observation platform.',
        icon: '🔭',
        x: 36,
        y: 76,
      },
      {
        id: '502-02',
        name: 'MAITRI',
        description: 'Inclusive assistive intelligence and community collaboration platform.',
        icon: '🤝',
        x: 84,
        y: 38,
      },
      {
        id: '502-03',
        name: 'ROBOT',
        description: 'Autonomous mobile robot with precision navigation and obstacle avoidance.',
        icon: '🤖',
        x: 34,
        y: 80,
      },
      {
        id: '502-04',
        name: 'LEARNAIMO',
        description: 'Interactive gamified learning platform and adaptive digital education suite.',
        icon: '📚',
        x: 76,
        y: 28,
      },
      {
        id: '502-05',
        name: 'AVG',
        description: 'Real-time cybersecurity shield and endpoint threat prevention system.',
        icon: '🛡️',
        x: 64,
        y: 78,
      },
      {
        id: '502-06',
        name: 'BYTEVERSE',
        description: 'Decentralized spatial metaverse and interactive 3D virtual environment.',
        icon: '🌌',
        x: 34,
        y: 22,
      },
      {
        id: '502-07',
        name: 'IN-OUT DESK',
        description: 'Smart biometric ergonomic workstation and attendance tracking telemetry.',
        icon: '🪑',
        x: 76,
        y: 28,
      },
      {
        id: '502-08',
        name: 'LED LIGHT (frequency)',
        description: 'Tunable high-frequency illumination and optical frequency analysis system.',
        icon: '💡',
        x: 35,
        y: 80,
      },
      {
        id: '502-09',
        name: 'FODUU',
        description: 'Creative web development, digital solutions and interactive web portal design.',
        icon: '🚀',
        x: 78,
        y: 64,
      },
      {
        id: '502-10',
        name: 'MEND-X',
        description: 'Automated digital first-aid and rapid medical triage assistant.',
        icon: '🩹',
        x: 48,
        y: 48,
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
    subtitle: 'Inspect process automation, smart healthcare, networking, and workflow orchestration.',
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
        id: '508-01',
        name: 'SYNERGY AUTOMATION',
        description: 'Industrial process automation and coordinated smart workflow integration.',
        icon: '⚙️',
        x: 32,
        y: 48,
      },
      {
        id: '508-02',
        name: 'TECH SAI CARE',
        description: 'Digital healthcare monitoring and smart medical diagnostic telemetry.',
        icon: '🩺',
        x: 54,
        y: 58,
      },
      {
        id: '508-03',
        name: 'DEUEX',
        description: 'Portable dual-display productivity setup and visual hardware interface.',
        icon: '⚡',
        x: 78,
        y: 66,
      },
      {
        id: '508-04',
        name: 'GLOBALNET',
        description: 'Worldwide distributed telecommunications network and high-capacity satellite routing.',
        icon: '📡',
        x: 34,
        y: 22,
      },
      {
        id: '508-05',
        name: 'TECH CRYPTERS',
        description: 'Next-gen cryptographic protocols and decentralized blockchain security ledger.',
        icon: '🔐',
        x: 48,
        y: 48,
      },
      {
        id: '508-06',
        name: 'MICROSOFT POWER AUTOMATE',
        description: 'Enterprise robotic process automation and cross-service workflow streamlining.',
        icon: '⚡',
        x: 78,
        y: 66,
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
    subtitle: 'Uncover research tools, IT services, finance tracking, and mobile ecosystems.',
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
        id: '509-01',
        name: 'PAPERPAL',
        description: 'AI-powered scholarly writing assistant and manuscript editor.',
        icon: '📝',
        x: 34,
        y: 48,
      },
      {
        id: '509-02',
        name: 'R DISCOVERY',
        description: 'Academic paper recommendation and scholarly literature discovery suite.',
        icon: '🔬',
        x: 58,
        y: 42,
      },
      {
        id: '509-03',
        name: 'ASSETORBIT',
        description: 'Asset management and orbital telemetry tracking platform.',
        icon: '🪐',
        x: 32,
        y: 18,
      },
      {
        id: '509-04',
        name: 'SYNKARO',
        description: 'Real-time synchronization and cross-platform data orchestration engine.',
        icon: '🔄',
        x: 55,
        y: 16,
      },
      {
        id: '509-05',
        name: 'ABCD IT SOLUTIONS',
        description: 'Enterprise IT infrastructure and digital solutions architecture.',
        icon: '💻',
        x: 78,
        y: 22,
      },
      {
        id: '509-06',
        name: 'SETH COMPUTERS',
        description: 'High-performance computing architectures and customized workstation systems.',
        icon: '🖥️',
        x: 34,
        y: 18,
      },
      {
        id: '509-07',
        name: 'ANAY IT SOLUTIONS',
        description: 'Business intelligence analytics and agile enterprise cloud services.',
        icon: '📊',
        x: 56,
        y: 16,
      },
      {
        id: '509-08',
        name: 'SHIVAM STOCK',
        description: 'Real-time financial market analytics and stock portfolio intelligence.',
        icon: '📈',
        x: 78,
        y: 24,
      },
      {
        id: '509-09',
        name: 'SAMSUNG ECOSYSTEMS',
        description: 'Interconnected multi-device smart ecosystem and unified mobile relay.',
        icon: '📱',
        x: 84,
        y: 38,
      },
      {
        id: '509-10',
        name: 'IOS SYSTEM',
        description: 'Modern iOS application ecosystem and mobile experience stack.',
        icon: '🍏',
        x: 56,
        y: 42,
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
    subtitle: 'Discover database systems, marketing AI, smart glasses, and optical innovation.',
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
        id: '510-01',
        name: 'MICROSOFT ACCESS',
        description: 'Rapid database application system and structured data inventory management.',
        icon: '🗄️',
        x: 36,
        y: 76,
      },
      {
        id: '510-02',
        name: 'ADSNEX AI',
        description: 'Next-generation neural targeting and predictive marketing AI engine.',
        icon: '🤖',
        x: 52,
        y: 60,
      },
      {
        id: '510-03',
        name: 'META GLASSES',
        description: 'Smart augmented reality vision and spatial audio computing interface.',
        icon: '👓',
        x: 78,
        y: 64,
      },
      {
        id: '510-04',
        name: 'OPTINEX',
        description: 'Global optical networking and low-latency optical routing gateway.',
        icon: '🌐',
        x: 62,
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

export function isAllLabsCompleted(userEmail: string): boolean {
  const labIds = ['1', '2', '3', '4'];
  return labIds.every((id) => isLabCompleted(id, userEmail));
}
