// Uncharted Expedition — mock static data.
// All seeds seniors will need on a real DB live here: labs, products,
// clue pool, treasure pool, certificate shard templates.

import { Lab, Clue, Treasure } from './models';

export const LABS: Lab[] = [
  {
    labId: 'a',
    labName: 'Lab 502',
    products: [
      { id: 'c1-p1', name: 'ASSETORBIT', icon: '🪐' },
      { id: 'c1-p2', name: 'SUNTECH TECHNOLOGY', icon: '☀️' },
      { id: 'c1-p3', name: 'ABCD IT SOLUTIONS', icon: '💻' },
      { id: 'c1-p4', name: 'ADSNEX AI', icon: '🤖' },
      { id: 'c1-p5', name: 'META GLASSES', icon: '👓' },
      { id: 'c1-p6', name: 'OPTINEXT GLOBAL.IN', icon: '🌐' },
      { id: 'c1-p7', name: 'PRELAUNCH', icon: '🚀' },
    ],
  },
  {
    labId: 'c',
    labName: 'Lab 508',
    products: [
      { id: 'c2-p1', name: 'MAITRI', icon: '🤝' },
      { id: 'c2-p2', name: 'R DISCOVERY', icon: '🔬' },
      { id: 'c2-p3', name: 'PAPERPAL', icon: '📝' },
      { id: 'c2-p4', name: 'LED LIGHT (frequency)', icon: '💡' },
      { id: 'c2-p5', name: 'SETH COMPUTERS', icon: '🖥️' },
      { id: 'c2-p6', name: 'ANAY IT SOLUTIONS', icon: '📊' },
      { id: 'c2-p7', name: 'SHIVAM STOCKS', icon: '📈' },
    ],
  },
  {
    labId: 'd',
    labName: 'Lab 509',
    products: [
      { id: 'c3-p1', name: 'SAMSUNG ECOSYSTEM', icon: '📱' },
      { id: 'c3-p2', name: 'ios', icon: '🍏' },
      { id: 'c3-p3', name: 'AVG', icon: '🛡️' },
      { id: 'c3-p4', name: 'Robotic arm', icon: '🦾' },
      { id: 'c3-p5', name: 'robot', icon: '🤖' },
      { id: 'c3-p6', name: 'Byteverse', icon: '🪐' },
      { id: 'c3-p7', name: 'In-Out Desk', icon: '🪑' },
      { id: 'c3-p8', name: 'Mend-x', icon: '🩹' },
    ],
  },
  {
    labId: 'e',
    labName: 'Lab 510',
    products: [
      { id: 'c4-p1', name: 'SANDSTORM AI', icon: '🌪️' },
      { id: 'c4-p2', name: 'SOLARIS GRID', icon: '⚡' },
      { id: 'c4-p3', name: 'DUNE ROVER ROBOTICS', icon: '🚙' },
      { id: 'c4-p4', name: 'MIRAGE CYBER DEFENSE', icon: '🛡️' },
      { id: 'c4-p5', name: 'OASIS HYDRATION IOT', icon: '💧' },
      { id: 'c4-p6', name: 'PYRAMID CLOUD', icon: '🏛️' },
      { id: 'c4-p7', name: 'SCARAB SENSORS', icon: '🪲' },
    ],
  },
];

export const LAB_ORDER: string[] = LABS.map((l) => l.labId); // ["a","c","d","e"]

export function getLabById(labId: string): Lab | undefined {
  return LABS.find((l) => l.labId === labId);
}

export function getProductById(productId: string): { product: { id: string; name: string; icon: string }; lab: Lab } | undefined {
  for (const lab of LABS) {
    const product = lab.products.find((p) => p.id === productId);
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
