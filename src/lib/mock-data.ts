// Uncharted Expedition — mock static data.
// All seeds seniors will need on a real DB live here: labs, products,
// clue pool, treasure pool, certificate shard templates.

import { Lab, Clue, Treasure } from './models';

// Legacy ID alias map to ensure seamless backward compatibility with any past submissions
export const LEGACY_PRODUCT_ID_MAP: Record<string, string> = {
  // Lab 502
  'c2-p5': '502-01',
  'c1-p4': '502-02',
  'c3-p10': '502-03',
  'c4-p2': '502-04',
  'c3-p9': '502-05',
  'c2-p1': '502-06',
  'c2-p2': '502-07',
  'c1-p10': '502-08',
  'c3-p8': '502-09',
  'c2-p3': '502-10',
  // Lab 508
  'c3-p6': '508-01',
  'c3-p7': '508-02',
  'c2-p4': '508-03',
  'c4-p1': '508-04',
  'c4-p3': '508-05',
  'c4-p4': '508-06',
  // Lab 509
  'c1-p6': '509-01',
  'c1-p5': '509-02',
  'c1-p1': '509-03',
  'c1-p2': '509-04',
  'c1-p3': '509-05',
  'c3-p1': '509-06',
  'c3-p2': '509-07',
  'c3-p3': '509-08',
  'c3-p4': '509-09',
  'c3-p5': '509-10',
  // Lab 510
  'c4-p5': '510-01',
  'c1-p7': '510-02',
  'c1-p8': '510-03',
  'c1-p9': '510-04',
};

export const LABS: Lab[] = [
  {
    labId: 'a',
    labName: 'Lab 502',
    products: [
      { id: '502-01', name: 'ASTRON', icon: '🔭' },
      { id: '502-02', name: 'MAITRI', icon: '🤝' },
      { id: '502-03', name: 'ROBOT', icon: '🤖' },
      { id: '502-04', name: 'LEARNAIMO', icon: '📚' },
      { id: '502-05', name: 'AVG', icon: '🛡️' },
      { id: '502-06', name: 'BYTEVERSE', icon: '🌌' },
      { id: '502-07', name: 'IN-OUT DESK', icon: '🪑' },
      { id: '502-08', name: 'LED LIGHT (frequency)', icon: '💡' },
      { id: '502-09', name: 'FODUU', icon: '🚀' },
      { id: '502-10', name: 'MEND-X', icon: '🩹' },
    ],
  },
  {
    labId: 'c',
    labName: 'Lab 508',
    products: [
      { id: '508-01', name: 'SYNERGY AUTOMATION', icon: '⚙️' },
      { id: '508-02', name: 'TECH SAI CARE', icon: '🩺' },
      { id: '508-03', name: 'DEUEX', icon: '⚡' },
      { id: '508-04', name: 'GLOBALNET', icon: '📡' },
      { id: '508-05', name: 'TECH CRYPTERS', icon: '🔐' },
      { id: '508-06', name: 'MICROSOFT POWER AUTOMATE', icon: '⚡' },
    ],
  },
  {
    labId: 'd',
    labName: 'Lab 509',
    products: [
      { id: '509-01', name: 'PAPERPAL', icon: '📝' },
      { id: '509-02', name: 'R DISCOVERY', icon: '🔬' },
      { id: '509-03', name: 'ASSETORBIT', icon: '🪐' },
      { id: '509-04', name: 'SYNKARO', icon: '🔄' },
      { id: '509-05', name: 'ABCD IT SOLUTIONS', icon: '💻' },
      { id: '509-06', name: 'SETH COMPUTERS', icon: '🖥️' },
      { id: '509-07', name: 'ANAY IT SOLUTIONS', icon: '📊' },
      { id: '509-08', name: 'SHIVAM STOCK', icon: '📈' },
      { id: '509-09', name: 'SAMSUNG ECOSYSTEMS', icon: '📱' },
      { id: '509-10', name: 'IOS SYSTEM', icon: '🍏' },
    ],
  },
  {
    labId: 'e',
    labName: 'Lab 510',
    products: [
      { id: '510-01', name: 'MICROSOFT ACCESS', icon: '🗄️' },
      { id: '510-02', name: 'ADSNEX AI', icon: '🤖' },
      { id: '510-03', name: 'META GLASSES', icon: '👓' },
      { id: '510-04', name: 'OPTINEX', icon: '🌐' },
    ],
  },
];

export const LAB_ORDER: string[] = LABS.map((l) => l.labId); // ["a","c","d","e"]

export function getLabById(labId: string): Lab | undefined {
  return LABS.find((l) => l.labId === labId);
}

export function getProductById(productId: string): { product: { id: string; name: string; icon: string }; lab: Lab } | undefined {
  const normalizedId = LEGACY_PRODUCT_ID_MAP[productId] || productId;
  for (const lab of LABS) {
    const product = lab.products.find((p) => p.id === normalizedId || p.id === productId);
    if (product) return { product, lab };
  }
  return undefined;
}

// --- Clue pool — shown randomly (or not at all) after a feedback submit ---
export const CLUE_POOL: Clue[] = [
  {
    id: 'clue-a-1',
    title: 'Cryptic Inscription',
    body: 'A weathered tablet mentions "the river that flows north" — perhaps a hint for the next checkpoint.',
    labId: 'a',
  },
  {
    id: 'clue-a-2',
    title: 'Torn Map Fragment',
    body: 'A torn piece of parchment shows a path leading east of the temple gate.',
    labId: 'a',
  },
  {
    id: 'clue-c-1',
    title: 'Old Journal Page',
    body: 'Someone scribbled "the third torch from the left is a decoy" — could be useful later.',
    labId: 'c',
  },
  {
    id: 'clue-c-2',
    title: 'Strange Compass Reading',
    body: 'The compass needle wobbles here — something metallic is buried nearby.',
    labId: 'c',
  },
  {
    id: 'clue-c-1',
    title: 'Half-Eaten Logbook',
    body: '"High tide at dawn exposes the lower passage" — underlined twice.',
    labId: 'c',
  },
  {
    id: 'clue-c-2',
    title: 'Carved Symbol',
    body: 'A spiral with three dots appears on the cliff face — the same mark is on the final chest.',
    labId: 'c',
  },
  {
    id: 'clue-e-1',
    title: 'Weathered Papyrus',
    body: 'Hieroglyphs describe a secret entrance behind the shifting sands of the western dune.',
    labId: 'e',
  },
  {
    id: 'clue-e-2',
    title: 'Solar Compass Note',
    body: 'When the midday sun hits the apex of the pyramid, follow the shadow towards the oasis cache.',
    labId: 'e',
  },
];

// --- Treasure pool — optional mini-game reward, never blocks progression ---
export const TREASURE_POOL: Treasure[] = [
  { id: 'tr-coin', name: 'Ancient Coin', description: 'A worn bronze coin from a forgotten kingdom.' },
  { id: 'tr-relic', name: 'Bone Relic', description: 'A small carved figure, perhaps a good-luck charm.' },
  { id: 'tr-map', name: 'Folded Sketch', description: 'A rough sketch of a place you do not recognise yet.' },
  { id: 'tr-blank', name: 'Empty Cache', description: 'Nothing here but dust. Better luck next time.' },
];

// --- Certificate shard templates (1 per lab) ---
// Keys match the canonical lab IDs in LABS above ("a", "c", "d", "e").
export const SHARD_INSCRIPTIONS: Record<string, string> = {
  a: 'Awarded for clearing the Mountain Pass — first leg of the expedition.',
  c: 'Awarded for surviving the Lost Temple — second leg of the expedition.',
  d: 'Awarded for charting the Coastal Ruins — third leg of the expedition.',
  e: 'Awarded for conquering the Shifting Dunes — desert leg of the expedition.',
};

export function getShardInscription(labId: string): string {
  return SHARD_INSCRIPTIONS[labId] ?? 'Expedition checkpoint cleared.';
}

// --- Admin credentials live in server-side env vars (ADMIN_USERNAME /
// ADMIN_PASSWORD / ADMIN_PASSWORD_HASH). Never ship them to the client. ---

export const DEPARTMENT_OPTIONS = [
  'AI-DS', 'CSE-DS', 'COMPS', 'EXTC', 'MECH',
  'VLSI', 'IT', 'CIVIL', 'MMS',
];
