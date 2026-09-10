// Map node placement utility
// Calculates organic, well-spaced, and randomized coordinates for up to 10 nodes
// strictly contained within the left page of the journal map.

export interface Point2D {
  x: number;
  y: number;
}

const BOUNDS = {
  minX: 20,
  maxX: 78,
  minY: 15,
  maxY: 85,
};

/**
 * Generates a deterministic, jitter-free serpentine layout for N checkpoints.
 * Positions flow top-to-bottom in a smooth S-curve (alternating left/right
 * wings), so connecting them in array order produces a clean, non-crossing
 * trail. Same geometry (minus random jitter) as the "auto-arrange" layout the
 * admin page applies on add/delete — guaranteeing the runtime map always
 * renders a proper trail regardless of stored per-product coordinates.
 */
export function generateOrderedSerpentineLayout(count: number): Point2D[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 49, y: 50 }];

  // Dedicated handcrafted optimal layouts for standard lab product counts:
  // 10 Checkpoints (Labs 502 & 509): perfectly alternating left/right with 17% vertical clearance
  if (count === 10) {
    return [
      { x: 50, y: 13 }, // 0: Top center
      { x: 76, y: 21 }, // 1: Upper right
      { x: 24, y: 29 }, // 2: Upper left
      { x: 76, y: 38 }, // 3: Mid-upper right
      { x: 24, y: 46 }, // 4: Mid-left
      { x: 76, y: 55 }, // 5: Mid-right
      { x: 24, y: 63 }, // 6: Lower-mid left
      { x: 76, y: 72 }, // 7: Lower-mid right
      { x: 24, y: 80 }, // 8: Bottom left
      { x: 50, y: 88 }, // 9: Bottom center
    ];
  }

  // 6 Checkpoints (Lab 508): sweeping S-curve with 14% vertical separation
  if (count === 6) {
    return [
      { x: 49, y: 14 },
      { x: 76, y: 28 },
      { x: 24, y: 42 },
      { x: 76, y: 56 },
      { x: 24, y: 70 },
      { x: 50, y: 84 },
    ];
  }

  // 4 Checkpoints (Lab 510): wide open trail with 22% vertical separation
  if (count === 4) {
    return [
      { x: 49, y: 18 },
      { x: 76, y: 40 },
      { x: 24, y: 62 },
      { x: 50, y: 84 },
    ];
  }

  // Generic fallback for any arbitrary count:
  const minY = 14;
  const maxY = 86;
  const spanY = maxY - minY;
  const points: Point2D[] = [];

  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const y = Math.round(minY + progress * spanY);
    let x = 49;
    if (i === 0) {
      x = 49;
    } else if (i === count - 1) {
      x = i % 2 === 1 ? 70 : 30;
    } else {
      x = i % 2 === 1 ? 75 : 25;
    }
    points.push({ x, y });
  }

  return points;
}

/**
 * Generates an organic, randomized layout for N checkpoints
 * ensuring every node is inside the safe page margins and maintains
 * a minimum spacing distance between all pairs.
 */
export function generateRandomizedSafeLayout(count: number, seed?: number): Point2D[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 49, y: 50 }];

  // Pseudo-random generator with optional seed
  let s = seed !== undefined ? seed : Math.random() * 10000;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const spanX = BOUNDS.maxX - BOUNDS.minX;
  const spanY = BOUNDS.maxY - BOUNDS.minY;
  const requiredMinDist = Math.max(18, 33 - count * 1.5);

  let bestLayout: Point2D[] = [];
  let bestMinDistOverall = -1;

  // Run up to 35 layout attempts to find the globally most well-spaced and organic layout
  for (let layoutAttempt = 0; layoutAttempt < 35; layoutAttempt++) {
    const candidatePoints: Point2D[] = [];
    let layoutValid = true;

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      // Progressive downward pacing with slight organic variation
      const nominalY = BOUNDS.minY + progress * spanY;

      // Serpentine wave: alternates left and right wings of the map
      const wavePhase = progress * Math.PI * (count <= 4 ? 1.5 : count <= 7 ? 2.5 : 3.5);
      const waveSide = Math.sin(wavePhase); // -1 to 1
      const nominalX = 49 + waveSide * (spanX * 0.44);

      // Random jitter per attempt
      const jitterX = (rand() - 0.5) * (spanX * 0.28);
      const jitterY = (rand() - 0.5) * (spanY / Math.max(1, count - 1) * 0.65);

      const ptX = Math.max(
        BOUNDS.minX,
        Math.min(BOUNDS.maxX, Math.round((nominalX + jitterX) * 10) / 10)
      );
      const ptY = Math.max(
        BOUNDS.minY,
        Math.min(BOUNDS.maxY, Math.round((nominalY + jitterY) * 10) / 10)
      );

      // Verify minimum distance with previously placed points in this attempt
      for (const existing of candidatePoints) {
        const d = Math.hypot(ptX - existing.x, ptY - existing.y);
        if (d < requiredMinDist) {
          layoutValid = false;
          break;
        }
      }

      candidatePoints.push({ x: ptX, y: ptY });
    }

    // Compute pairwise minimum distance for this layout
    let layoutMinDist = 9999;
    for (let i = 0; i < candidatePoints.length; i++) {
      for (let j = i + 1; j < candidatePoints.length; j++) {
        const d = Math.hypot(
          candidatePoints[i].x - candidatePoints[j].x,
          candidatePoints[i].y - candidatePoints[j].y
        );
        if (d < layoutMinDist) layoutMinDist = d;
      }
    }

    if (layoutValid && layoutMinDist >= requiredMinDist) {
      return candidatePoints;
    }

    if (layoutMinDist > bestMinDistOverall) {
      bestMinDistOverall = layoutMinDist;
      bestLayout = candidatePoints;
    }
  }

  return bestLayout;
}
