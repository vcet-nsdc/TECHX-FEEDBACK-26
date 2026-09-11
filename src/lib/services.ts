// Uncharted Expedition — services layer (facade).
//
// Primary persistence is MongoDB (mongo-services.ts). If MongoDB is
// unreachable — e.g. local dev without a mongod, or a transient outage —
// every call transparently falls back to the in-memory store so the site
// keeps working. Callers don't know or care which backend served them.

import { DuplicateFeedbackError } from './errors';
import * as mongo from './mongo-services';
import { memoryStore } from './mock-store';
import { LAB_ORDER, getLabById, CLUE_POOL, TREASURE_POOL } from './mock-data';
import {
  FeedbackEntry,
  ExpeditionUser,
  LeaderboardEntry,
  PaginatedFeedbackResult,
  DashboardData,
} from './models';

export { DuplicateFeedbackError };
export type { LeaderboardEntry };

export type StoreBackend = 'mongodb' | 'memory';

let warnedBackend: string | null = null;

function warnOnce(backend: StoreBackend, err: unknown) {
  if (warnedBackend !== backend) {
    warnedBackend = backend;
    console.warn(
      `[store] Falling back to ${backend} store:`,
      err instanceof Error ? err.message : err
    );
  }
}

async function withMongo<T>(op: () => Promise<T>): Promise<T | null> {
  try {
    return await op();
  } catch (err) {
    if (err instanceof DuplicateFeedbackError) {
      throw err;
    }
    console.error('[store-error] withMongo caught error:', err);
    warnOnce('memory', err);
    return null;
  }
}

export type ProductStatEntry = {
  productId: string;
  productName: string;
  labName: string;
  totalRatings: number;
  totalCoins: number;
  averageRating: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  totalComments: number;
  lastRated: string | null;
};

// Short in-process memory cache for heavy aggregation endpoints (leaderboard, productStats)
// Protects MongoDB from thundering herd during peak concurrency (e.g. 500 participants polling).
let leaderboardCache: Record<string, { data: LeaderboardEntry[]; timestamp: number }> = {};
let productStatsCache: { data: ProductStatEntry[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 3000; // 3 seconds

export function invalidateAggregateCaches(): void {
  leaderboardCache = {};
  productStatsCache = null;
}

// ---------- Feedback ----------

export async function saveFeedback(
  feedback: Omit<FeedbackEntry, '_id' | 'createdAt'> & { createdAt?: Date }
): Promise<FeedbackEntry> {
  invalidateAggregateCaches();
  const saved = await withMongo(() => mongo.saveFeedback(feedback));
  if (saved) return saved;

  if (feedback.submissionId) {
    const existing = memoryStore.feedback.find((f) => f.submissionId === feedback.submissionId);
    if (existing) return existing;
  }

  const duplicate = memoryStore.feedback.some(
    (f) => f.studentEmail === feedback.studentEmail && f.tableId === feedback.tableId
  );
  if (duplicate) {
    const existing = memoryStore.feedback.find(
      (f) => f.studentEmail === feedback.studentEmail && f.tableId === feedback.tableId
    );
    if (existing && feedback.submissionId && existing.submissionId === feedback.submissionId) {
      return existing;
    }
    throw new DuplicateFeedbackError();
  }

  const doc = { ...feedback, createdAt: feedback.createdAt ?? new Date() };
  memoryStore.feedback.push(doc);
  return doc;
}

export async function getFeedback(filters: {
  email?: string;
  productId?: string;
  department?: string;
} = {}): Promise<FeedbackEntry[]> {
  const result = await withMongo(() => mongo.getFeedback(filters));
  if (result) return result;

  let out = memoryStore.feedback.slice();
  if (filters.email) out = out.filter((f) => f.studentEmail === filters.email);
  if (filters.productId) out = out.filter((f) => f.tableId === filters.productId);
  if (filters.department) out = out.filter((f) => f.studentDepartment === filters.department);
  out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return out;
}

export async function getPaginatedFeedback(filters: {
  email?: string;
  productId?: string;
  department?: string;
  limit?: number;
  cursor?: string;
  page?: number;
} = {}): Promise<PaginatedFeedbackResult> {
  const result = await withMongo(() => mongo.getPaginatedFeedback(filters));
  if (result) return result;

  let out = memoryStore.feedback.slice();
  if (filters.email) out = out.filter((f) => f.studentEmail === filters.email);
  if (filters.productId) out = out.filter((f) => f.tableId === filters.productId);
  if (filters.department) out = out.filter((f) => f.studentDepartment === filters.department);
  out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  if (filters.cursor) {
    out = out.filter((f) => String(f.timestamp) < filters.cursor!);
  }

  const limit = typeof filters.limit === 'number' && filters.limit > 0 ? filters.limit : 25;
  const skip = filters.page && filters.page > 1 ? (filters.page - 1) * limit : 0;
  if (skip > 0) {
    out = out.slice(skip);
  }
  const hasMore = out.length > limit;
  const items = hasMore ? out.slice(0, limit) : out;
  const nextCursor = hasMore && items.length > 0 ? String(items[items.length - 1].timestamp) : null;

  return { items, nextCursor, hasMore, total: memoryStore.feedback.length };
}

export async function getFeedbackStats(): Promise<{
  totalUsers: number;
  totalFeedback: number;
  averageRating: number;
}> {
  const stats = await withMongo(() => mongo.getFeedbackStats());
  if (stats) return stats;

  const totalFeedback = memoryStore.feedback.length;
  const uniqueEmails = new Set(memoryStore.feedback.map((f) => f.studentEmail));
  const avg =
    totalFeedback > 0
      ? memoryStore.feedback.reduce((s, f) => s + f.rating, 0) / totalFeedback
      : 0;
  return {
    totalUsers: uniqueEmails.size,
    totalFeedback,
    averageRating: Number(avg.toFixed(2)),
  };
}

// ---------- User / expedition progress ----------

async function applyProgressRules(user: ExpeditionUser): Promise<void> {
  // 1. Legacy rules: static product catalog (mock-data) completion.
  for (const labId of LAB_ORDER) {
    if (user.completedLabs.includes(labId)) continue;
    const lab = getLabById(labId);
    if (!lab) continue;
    const allDone = lab.products.every((p) => user.completedProducts.includes(p.id));
    if (allDone) {
      user.completedLabs.push(labId);
      if (!user.shards.includes(labId)) user.shards.push(labId);
      const idx = LAB_ORDER.indexOf(labId);
      if (idx + 1 < LAB_ORDER.length) {
        const next = LAB_ORDER[idx + 1];
        if (!user.unlockedLabs.includes(next)) user.unlockedLabs.push(next);
      }
    }
  }

  // 2. Checkpoint rules (active journal flow): sectors are admin-editable
  //    and live in MongoDB, so completion is evaluated against the live
  //    catalog (static seed fallback while MongoDB is unreachable). Shards
  //    use canonical lab ids, shared with rule 1.
  try {
    const { getCheckpointGroups } = await import('./lab-service');
    const { LEGACY_PRODUCT_ID_MAP } = await import('./mock-data');
    const groups = await getCheckpointGroups();
    const userDoneSet = new Set(
      (user.completedProducts || []).map((id) => LEGACY_PRODUCT_ID_MAP[id] || id)
    );
    for (const group of groups) {
      if (group.checkpointIds.length === 0) continue;
      if (user.completedLabs.includes(group.canonicalLabId)) continue;
      const allDone = group.checkpointIds.every((id) => userDoneSet.has(id));
      if (!allDone) continue;
      user.completedLabs.push(group.canonicalLabId);
      if (!user.shards.includes(group.canonicalLabId)) user.shards.push(group.canonicalLabId);
      const idx = LAB_ORDER.indexOf(group.canonicalLabId);
      const next = LAB_ORDER[idx + 1];
      if (next && !user.unlockedLabs.includes(next)) user.unlockedLabs.push(next);
    }
  } catch {
    // Catalog unavailable — skip checkpoint-based progression this pass.
  }

  if (user.shards.length >= LAB_ORDER.length && !user.completionDate) {
    user.completionDate = new Date().toISOString();
  }
}

export async function updateUserProgress(
  email: string,
  productId: string,
  info?: { name?: string; department?: string }
): Promise<ExpeditionUser> {
  const updated = await withMongo(() => mongo.updateUserProgress(email, productId, info));
  if (updated) return updated;

  let user = memoryStore.users.get(email);
  if (!user) {
    user = {
      name: info?.name ?? '',
      email,
      department: info?.department ?? '',
      completedProducts: [productId],
      unlockedLabs: ['a'],
      completedLabs: [],
      shards: [],
      discoveredClues: [],
      discoveredTreasures: [],
    };
    memoryStore.users.set(email, user);
    await applyProgressRules(user);
    return user;
  }

  if (info?.name && !user.name) user.name = info.name;
  if (info?.department && !user.department) user.department = info.department;
  if (!user.completedProducts.includes(productId)) {
    user.completedProducts.push(productId);
  }
  await applyProgressRules(user);
  return user;
}

function rank(users: ExpeditionUser[], allFeedback: FeedbackEntry[]): LeaderboardEntry[] {
  return users
    .map((user) => {
      const feedback = allFeedback.filter((f) => f.studentEmail === user.email);
      const totalRating = feedback.reduce((s, f) => s + f.rating, 0);
      const averageRating = feedback.length > 0 ? totalRating / feedback.length : 0;
      return {
        ...user,
        totalRating,
        averageRating,
        isCompleted: user.shards.length >= LAB_ORDER.length,
      };
    })
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return b.isCompleted ? 1 : -1;
      if (a.completedProducts.length !== b.completedProducts.length)
        return b.completedProducts.length - a.completedProducts.length;
      return b.averageRating - a.averageRating;
    })
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

export async function getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
  const cacheKey = String(limit ?? 'all');
  const cached = leaderboardCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const users = await withMongo(async () => mongo.getLeaderboardAggregated(limit));
  if (users) {
    leaderboardCache[cacheKey] = { data: users, timestamp: Date.now() };
    return users;
  }

  const ranked = rank(
    Array.from(memoryStore.users.values()),
    memoryStore.feedback.slice()
  );
  const res = typeof limit === 'number' && limit > 0 ? ranked.slice(0, limit) : ranked;
  leaderboardCache[cacheKey] = { data: res, timestamp: Date.now() };
  return res;
}

export async function getProductStats(): Promise<Array<ProductStatEntry>> {
  if (productStatsCache && Date.now() - productStatsCache.timestamp < CACHE_TTL_MS) {
    return productStatsCache.data;
  }

  const { getProductLookup } = await import('./mock-store');
  const { LEGACY_PRODUCT_ID_MAP } = await import('./mock-data');
  const legacyKeys = new Set(Object.keys(LEGACY_PRODUCT_ID_MAP));
  const productMap = getProductLookup();

  try {
    const { getCheckpointCatalog } = await import('./lab-service');
    for (const ref of (await getCheckpointCatalog()).values()) {
      if (!productMap.has(ref.tableId)) {
        productMap.set(ref.tableId, {
          id: ref.tableId,
          name: ref.name,
          labName: ref.labName,
          labId: ref.canonicalLabId,
        });
      }
    }
  } catch {
    // Catalog unavailable — fall back to static product names only.
  }

  // Helper to create blank stats for a primary product
  const createBlankStats = (id: string, name: string, labName: string): ProductStatEntry => ({
    productId: id,
    productName: name,
    labName,
    totalRatings: 0,
    totalCoins: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    totalComments: 0,
    lastRated: null as string | null,
  });

  const mongoStats = await withMongo(() => mongo.getProductStatsAggregated());
  if (mongoStats) {
    const statsMap = new Map<string, ProductStatEntry>();
    // Seed all 30 canonical products
    for (const [id, info] of productMap.entries()) {
      if (legacyKeys.has(id)) continue;
      statsMap.set(id, createBlankStats(id, info.name, info.labName));
    }
    // Overlay mongo aggregation results (merging legacy IDs if any)
    for (const st of mongoStats) {
      const canonicalId = LEGACY_PRODUCT_ID_MAP[st.productId] || st.productId;
      const target = statsMap.get(canonicalId);
      if (target) {
        target.totalRatings += st.totalRatings;
        target.totalComments += st.totalComments;
        for (let r = 1; r <= 5; r++) {
          target.ratingDistribution[r as 1 | 2 | 3 | 4 | 5] += st.ratingDistribution[r as 1 | 2 | 3 | 4 | 5] || 0;
        }
        if (st.lastRated && (!target.lastRated || new Date(st.lastRated) > new Date(target.lastRated))) {
          target.lastRated = st.lastRated;
        }
      }
    }
    for (const target of statsMap.values()) {
      if (target.totalRatings > 0) {
        const sum =
          target.ratingDistribution[1] * 1 +
          target.ratingDistribution[2] * 2 +
          target.ratingDistribution[3] * 3 +
          target.ratingDistribution[4] * 4 +
          target.ratingDistribution[5] * 5;
        target.totalCoins = sum;
        target.averageRating = Number((sum / target.totalRatings).toFixed(2));
      }
    }
    const list = Array.from(statsMap.values());
    list.sort((a, b) => {
      // 1. More coins earned by a product -> on top!
      if (b.totalCoins !== a.totalCoins) return b.totalCoins - a.totalCoins;
      // 2. Average rating tiebreaker
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      // 3. Total ratings tiebreaker
      if (b.totalRatings !== a.totalRatings) return b.totalRatings - a.totalRatings;
      const timeA = a.lastRated ? new Date(a.lastRated).getTime() : 0;
      const timeB = b.lastRated ? new Date(b.lastRated).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return a.productId.localeCompare(b.productId);
    });
    productStatsCache = { data: list, timestamp: Date.now() };
    return list;
  }

  // In-memory fallback calculation
  const allFeedback = memoryStore.feedback;
  const productStats = new Map<string, ProductStatEntry>();

  // Initialize all canonical products so full allotment is visible
  for (const [id, info] of productMap.entries()) {
    if (legacyKeys.has(id)) continue;
    productStats.set(id, createBlankStats(id, info.name, info.labName));
  }

  for (const feedback of allFeedback) {
    const canonicalId = LEGACY_PRODUCT_ID_MAP[feedback.tableId] || feedback.tableId;
    const stats = productStats.get(canonicalId);
    if (!stats) continue;

    stats.totalRatings++;
    const tier = Math.max(1, Math.min(5, feedback.rating)) as 1 | 2 | 3 | 4 | 5;
    stats.ratingDistribution[tier]++;
    if (feedback.comment && feedback.comment.trim() !== '') {
      stats.totalComments++;
    }
    const tsString =
      typeof feedback.timestamp === 'string'
        ? feedback.timestamp
        : new Date(feedback.timestamp).toISOString();
    if (!stats.lastRated || new Date(tsString) > new Date(stats.lastRated)) {
      stats.lastRated = tsString;
    }
  }

  for (const stats of productStats.values()) {
    if (stats.totalRatings > 0) {
      const sum =
        stats.ratingDistribution[1] * 1 +
        stats.ratingDistribution[2] * 2 +
        stats.ratingDistribution[3] * 3 +
        stats.ratingDistribution[4] * 4 +
        stats.ratingDistribution[5] * 5;
      stats.totalCoins = sum;
      stats.averageRating = Number((sum / stats.totalRatings).toFixed(2));
    }
  }

  const list = Array.from(productStats.values());
  list.sort((a, b) => {
    // 1. More coins earned by a product -> on top!
    if (b.totalCoins !== a.totalCoins) return b.totalCoins - a.totalCoins;
    // 2. Average rating tiebreaker
    if (b.averageRating !== a.averageRating) {
      return b.averageRating - a.averageRating;
    }
    // 3. Total ratings tiebreaker
    if (b.totalRatings !== a.totalRatings) {
      return b.totalRatings - a.totalRatings;
    }
    const timeA = a.lastRated ? new Date(a.lastRated).getTime() : 0;
    const timeB = b.lastRated ? new Date(b.lastRated).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return a.productId.localeCompare(b.productId);
  });
  productStatsCache = { data: list, timestamp: Date.now() };
  return list;
}

export async function getAdminDashboardData(): Promise<DashboardData> {
  const [stats, leaderboard, productStats] = await Promise.all([
    getFeedbackStats(),
    getLeaderboard(20),
    getProductStats(),
  ]);

  const completedUsers = leaderboard.filter((u) => u.isCompleted).length;

  return {
    stats: {
      totalUsers: stats.totalUsers,
      totalFeedback: stats.totalFeedback,
      completedUsers,
      averageRating: stats.averageRating,
    },
    leaderboard,
    productStats,
  };
}

// ---------- Expedition extras ----------

// Random clue reveal — 50% chance to return a clue, 50% to return null.
export async function rollForClue(
  labId: string
): Promise<{ clue: typeof CLUE_POOL[number] | null }> {
  const labClues = CLUE_POOL.filter((c) => c.labId === labId);
  const pool = labClues.length > 0 ? labClues : CLUE_POOL;
  const roll = Math.random();
  if (roll < 0.5) return { clue: null };
  const idx = Math.floor(Math.random() * pool.length);
  return { clue: pool[idx] };
}

// Optional treasure hunt — always returns a treasure (some are duds).
export async function rollForTreasure(): Promise<{
  treasure: typeof TREASURE_POOL[number];
}> {
  const idx = Math.floor(Math.random() * TREASURE_POOL.length);
  return { treasure: TREASURE_POOL[idx] };
}
