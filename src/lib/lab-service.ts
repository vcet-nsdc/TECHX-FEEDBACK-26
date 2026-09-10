// Uncharted Expedition — MongoDB-backed labs service.
//
// Persists the journal labs (3 sectors + their checkpoints) in a `labs`
// collection so admin edits survive restarts. On first read the collection
// is seeded from the static expeditionData so the site works even before
// any admin edit has been made.
//
// Only the journal labs live here — feedback/users/leaderboard remain on
// the in-memory mockStore (see services.ts).

import { getDatabase } from './mongodb';
import { ExpeditionLab } from './expeditionData';

export type LabDoc = {
  labKey: string; // '1' | '2' | '3' | '4'
  lab: ExpeditionLab;
  updatedAt: Date;
};

export const LAB_KEYS = ['1', '2', '3', '4'] as const;

function sanitizeLabs(raw: Record<string, unknown>): Record<string, ExpeditionLab> {
  const result: Record<string, ExpeditionLab> = {};
  for (const key of LAB_KEYS) {
    const lab = raw?.[key] as ExpeditionLab | undefined;
    if (lab && lab.id && Array.isArray(lab.checkpoints)) {
      result[key] = {
        ...lab,
        checkpoints: lab.checkpoints.slice(0, 20),
      };
    }
  }
  return result;
}

export async function getLabsFromDb(): Promise<Record<string, ExpeditionLab>> {
  const db = await getDatabase();
  const collection = db.collection<LabDoc>('labs');

  const docs = await collection.find({ labKey: { $in: [...LAB_KEYS] } }).toArray();
  const byKey: Record<string, LabDoc> = {};
  for (const doc of docs) byKey[doc.labKey] = doc;

  const { baseExpeditionLabs } = await import('./expeditionData');

  const labs: Record<string, ExpeditionLab> = {};
  for (const key of LAB_KEYS) {
    const base = baseExpeditionLabs[key] || ({} as ExpeditionLab);
    if (byKey[key]) {
      labs[key] = {
        ...base,
        ...byKey[key].lab,
        mapImage: (byKey[key].lab?.mapImage || base.mapImage)?.replace(/\.jpg$/, '.webp'),
        themeType: byKey[key].lab?.themeType || base.themeType,
        inkColor: byKey[key].lab?.inkColor || base.inkColor,
        glowColor: byKey[key].lab?.glowColor || base.glowColor,
        coreGlow: byKey[key].lab?.coreGlow || base.coreGlow,
        badgeClass: byKey[key].lab?.badgeClass || base.badgeClass,
      };
    } else if (base.id) {
      labs[key] = base;
    }
  }

  // First run: seed from the static config so the journal always has data.
  if (Object.keys(labs).length === 0) {
    return seedLabs();
  }
  return labs;
}

export async function saveLabsToDb(
  labs: Record<string, ExpeditionLab>
): Promise<Record<string, ExpeditionLab>> {
  const clean = sanitizeLabs(labs);
  if (Object.keys(clean).length === 0) {
    throw new Error('No valid labs provided');
  }

  const db = await getDatabase();
  const collection = db.collection<LabDoc>('labs');
  const now = new Date();

  await Promise.all(
    Object.entries(clean).map(([labKey, lab]) =>
      collection.updateOne(
        { labKey },
        { $set: { lab, updatedAt: now } },
        { upsert: true }
      )
    )
  );
  return clean;
}

export async function resetLabsToSeed(): Promise<Record<string, ExpeditionLab>> {
  const db = await getDatabase();
  const collection = db.collection<LabDoc>('labs');
  await collection.deleteMany({ labKey: { $in: [...LAB_KEYS] } });
  return seedLabs();
}

async function seedLabs(): Promise<Record<string, ExpeditionLab>> {
  // Dynamic import to avoid a circular dependency at module scope:
  // expeditionData imports nothing from this file, but it is imported by
  // the cache wiring we add later — keep this lazy.
  const { baseExpeditionLabs } = await import('./expeditionData');
  const seed: Record<string, ExpeditionLab> = {};
  for (const key of LAB_KEYS) {
    if (baseExpeditionLabs[key]) {
      seed[key] = JSON.parse(JSON.stringify(baseExpeditionLabs[key]));
    }
  }
  await saveLabsToDb(seed);
  return seed;
}

// ---------- Checkpoint catalog ----------
//
// The active expedition flow rates *checkpoints* (e.g. "c1-p1") rather than
// the static product catalog in mock-data.ts (e.g. "a1"). These helpers
// resolve checkpoint ids against the admin-editable labs collection, with a
// fallback to the static seed config so submissions keep working while
// MongoDB is unreachable.

export type CheckpointRef = {
  tableId: string; // checkpoint id, e.g. "c1-p1"
  name: string; // human-readable waypoint name
  labKey: string; // labs-collection key: '1' | '2' | '3'
  canonicalLabId: string; // canonical expedition lab id: 'a' | 'c' | 'd'
  labName: string; // sector title, e.g. "LAB 502"
};

export type CheckpointGroup = {
  labKey: string;
  canonicalLabId: string;
  checkpointIds: string[];
};

// Reverse of the labAliases map in expeditionData.ts.
const CANONICAL_LAB_BY_KEY: Record<string, string> = {
  '1': 'a',
  '2': 'c',
  '3': 'd',
  '4': 'e',
};

export async function getCheckpointCatalog(): Promise<Map<string, CheckpointRef>> {
  let labs: Record<string, ExpeditionLab>;
  try {
    labs = await getLabsFromDb();
  } catch {
    // MongoDB unreachable — validate against the static seed config so the
    // submission flow keeps working (mirrors the services.ts fallbacks).
    const { baseExpeditionLabs } = await import('./expeditionData');
    labs = baseExpeditionLabs;
  }

  const catalog = new Map<string, CheckpointRef>();
  for (const [key, lab] of Object.entries(labs)) {
    for (const cp of lab.checkpoints ?? []) {
      if (!cp?.id) continue;
      catalog.set(cp.id, {
        tableId: cp.id,
        name: cp.name,
        labKey: key,
        canonicalLabId: CANONICAL_LAB_BY_KEY[key] ?? key,
        labName: lab.title || lab.name,
      });
    }
  }
  return catalog;
}

// Resolve a single tableId to its checkpoint (or null when unknown).
export async function findCheckpoint(tableId: string): Promise<CheckpointRef | null> {
  const catalog = await getCheckpointCatalog();
  return catalog.get(tableId) ?? null;
}

// Checkpoint ids grouped per lab — used by the server-side progress rules to
// award shards/unlocks once every waypoint of a sector has been rated.
export async function getCheckpointGroups(): Promise<CheckpointGroup[]> {
  const catalog = await getCheckpointCatalog();
  const byLab = new Map<string, CheckpointGroup>();
  for (const ref of catalog.values()) {
    let group = byLab.get(ref.labKey);
    if (!group) {
      group = { labKey: ref.labKey, canonicalLabId: ref.canonicalLabId, checkpointIds: [] };
      byLab.set(ref.labKey, group);
    }
    group.checkpointIds.push(ref.tableId);
  }
  return Array.from(byLab.values());
}