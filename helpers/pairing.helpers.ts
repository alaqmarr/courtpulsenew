export interface PairingMemberLike {
  email: string;
  displayName?: string | null;
  user?: {
    name?: string | null;
    displayName?: string | null;
  } | null;
}

export interface PairingGameLike {
  teamAPlayers: string[];
  teamBPlayers: string[];
  createdAt?: Date | string;
}

export interface SessionPairingSummary {
  playCountByEmail: Record<string, number>;
  pairPlayCounts: Record<string, number>;
  singlesMatchupCounts: Record<string, number>;
  matchupPlayCounts: Record<string, number>;
  lastGamePlayerEmails: string[];
}

export type PairingPickResult =
  | { ok: false; message: string }
  | {
      ok: true;
      teamA: string[];
      teamB: string[];
      sideAPairPlays: number;
      sideBPairPlays: number;
      matchupPlays: number;
    };

export function canonicalPairKey(a: string, b: string): string {
  return [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("|");
}

export function canonicalSideKey(players: string[]): string {
  return [...players].map((p) => p.trim().toLowerCase()).sort().join("|");
}

export function canonicalMatchupKey(sideA: string[], sideB: string[]): string {
  return [canonicalSideKey(sideA), canonicalSideKey(sideB)].sort().join(" vs ");
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function buildTokenToEmailMap(
  members: PairingMemberLike[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of members) {
    const email = m.email.trim().toLowerCase();
    map.set(email, email);
    if (m.displayName) map.set(m.displayName.trim().toLowerCase(), email);
    if (m.user?.name) map.set(m.user.name.trim().toLowerCase(), email);
    if (m.user?.displayName) map.set(m.user.displayName.trim().toLowerCase(), email);
  }
  return map;
}

export function buildSessionPairingSummary(
  members: PairingMemberLike[],
  games: PairingGameLike[]
): SessionPairingSummary {
  const tokenMap = buildTokenToEmailMap(members);
  const normalize = (token: string) => {
    const clean = token.trim().toLowerCase();
    return tokenMap.get(clean) ?? clean;
  };

  const playCountByEmail: Record<string, number> = {};
  const pairPlayCounts: Record<string, number> = {};
  const singlesMatchupCounts: Record<string, number> = {};
  const matchupPlayCounts: Record<string, number> = {};

  for (const game of games) {
    const sideA = game.teamAPlayers.map(normalize);
    const sideB = game.teamBPlayers.map(normalize);

    for (const p of [...sideA, ...sideB]) {
      playCountByEmail[p] = (playCountByEmail[p] ?? 0) + 1;
    }

    if (sideA.length === 2) {
      const keyA = canonicalPairKey(sideA[0], sideA[1]);
      pairPlayCounts[keyA] = (pairPlayCounts[keyA] ?? 0) + 1;
    }
    if (sideB.length === 2) {
      const keyB = canonicalPairKey(sideB[0], sideB[1]);
      pairPlayCounts[keyB] = (pairPlayCounts[keyB] ?? 0) + 1;
    }

    if (sideA.length === 2 && sideB.length === 2) {
      const mKey = canonicalMatchupKey(sideA, sideB);
      matchupPlayCounts[mKey] = (matchupPlayCounts[mKey] ?? 0) + 1;
    } else if (sideA.length === 1 && sideB.length === 1) {
      const sKey = canonicalPairKey(sideA[0], sideB[0]);
      singlesMatchupCounts[sKey] = (singlesMatchupCounts[sKey] ?? 0) + 1;
    }
  }

  const latest = games[0];
  const lastGamePlayerEmails = latest
    ? Array.from(new Set([...latest.teamAPlayers, ...latest.teamBPlayers].map(normalize)))
    : [];

  return {
    playCountByEmail,
    pairPlayCounts,
    singlesMatchupCounts,
    matchupPlayCounts,
    lastGamePlayerEmails,
  };
}

function compareTuples(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function pickMatchPairing(params: {
  mode: "DOUBLES" | "SINGLES";
  strategy: "RANDOM" | "FAIR";
  presentEmails: string[];
  playCountByEmail: Record<string, number>;
  pairPlayCounts: Record<string, number>;
  singlesMatchupCounts: Record<string, number>;
  matchupPlayCounts: Record<string, number>;
  lastGamePlayerEmails?: string[];
  currentSideA?: string[];
  currentSideB?: string[];
}): PairingPickResult {
  const uniquePool = Array.from(
    new Set(params.presentEmails.map((e) => e.trim().toLowerCase()))
  );

  const required = params.mode === "DOUBLES" ? 4 : 2;
  if (uniquePool.length < required) {
    return {
      ok: false,
      message: `Need at least ${required} checked-in players for ${params.mode.toLowerCase()} (currently ${uniquePool.length}).`,
    };
  }

  // Shuffle uniformly first, then sort by play count so low-play waiters are never clipped if >14 players
  const workingPool = shuffleInPlace([...uniquePool]).sort(
    (a, b) => (params.playCountByEmail[a] ?? 0) - (params.playCountByEmail[b] ?? 0)
  );
  const pool = workingPool.slice(0, 14);
  const lastSet = new Set(
    (params.lastGamePlayerEmails ?? []).map((e) => e.trim().toLowerCase())
  );

  if (params.mode === "SINGLES") {
    const currentKey =
      params.currentSideA?.length === 1 && params.currentSideB?.length === 1
        ? canonicalPairKey(params.currentSideA[0], params.currentSideB[0])
        : null;

    let bestScore: number[] | null = null;
    let bestCandidates: Array<{ a: string; b: string; h2h: number }> = [];

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const p1 = pool[i];
        const p2 = pool[j];
        const key = canonicalPairKey(p1, p2);
        const h2h = params.singlesMatchupCounts[key] ?? 0;

        const c1 = params.playCountByEmail[p1] ?? 0;
        const c2 = params.playCountByEmail[p2] ?? 0;
        const sumPlays = c1 + c2;
        const maxSelected = Math.max(c1, c2);

        let minBenched = Infinity;
        for (const u of pool) {
          if (u !== p1 && u !== p2) {
            const cu = params.playCountByEmail[u] ?? 0;
            if (cu < minBenched) minBenched = cu;
          }
        }
        const lagBeforeStart = Number.isFinite(minBenched)
          ? Math.max(0, maxSelected - minBenched)
          : 0;

        const isCurrent = currentKey && key === currentKey ? 1 : 0;
        const overlapLast =
          (lastSet.has(p1) ? 1 : 0) + (lastSet.has(p2) ? 1 : 0);
        const sameLast = pool.length > 2 && overlapLast === 2 ? 1 : 0;

        const score =
          params.strategy === "FAIR"
            ? [lagBeforeStart, h2h, sumPlays, isCurrent, sameLast, overlapLast]
            : [lagBeforeStart, h2h, isCurrent, sameLast, overlapLast];

        if (!bestScore || compareTuples(score, bestScore) < 0) {
          bestScore = score;
          bestCandidates = [{ a: p1, b: p2, h2h }];
        } else if (compareTuples(score, bestScore) === 0) {
          bestCandidates.push({ a: p1, b: p2, h2h });
        }
      }
    }

    const picked = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    const flip = Math.random() < 0.5;
    return {
      ok: true,
      teamA: [flip ? picked.b : picked.a],
      teamB: [flip ? picked.a : picked.b],
      sideAPairPlays: picked.h2h,
      sideBPairPlays: picked.h2h,
      matchupPlays: picked.h2h,
    };
  }

  // Doubles (2v2): evaluate all 4-player subsets and their 3 unordered pair splits
  const currentMatchKey =
    params.currentSideA?.length === 2 && params.currentSideB?.length === 2
      ? canonicalMatchupKey(params.currentSideA, params.currentSideB)
      : null;

  let bestScore: number[] | null = null;
  let bestCandidates: Array<{
    sideA: [string, string];
    sideB: [string, string];
    playsA: number;
    playsB: number;
    matchupPlays: number;
  }> = [];

  const n = pool.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const quad = [pool[i], pool[j], pool[k], pool[l]];
          const selectedSet = new Set(quad);

          const c0 = params.playCountByEmail[quad[0]] ?? 0;
          const c1 = params.playCountByEmail[quad[1]] ?? 0;
          const c2 = params.playCountByEmail[quad[2]] ?? 0;
          const c3 = params.playCountByEmail[quad[3]] ?? 0;
          const sumPlays = c0 + c1 + c2 + c3;
          const maxSelected = Math.max(c0, c1, c2, c3);

          let minBenched = Infinity;
          for (const u of pool) {
            if (!selectedSet.has(u)) {
              const cu = params.playCountByEmail[u] ?? 0;
              if (cu < minBenched) minBenched = cu;
            }
          }
          const lagBeforeStart = Number.isFinite(minBenched)
            ? Math.max(0, maxSelected - minBenched)
            : 0;

          let overlapLast = 0;
          for (const p of quad) {
            if (lastSet.has(p)) overlapLast++;
          }
          const same4AsLast = pool.length > 4 && overlapLast === 4 ? 1 : 0;

          const partitions: Array<[[string, string], [string, string]]> = [
            [[quad[0], quad[1]], [quad[2], quad[3]]],
            [[quad[0], quad[2]], [quad[1], quad[3]]],
            [[quad[0], quad[3]], [quad[1], quad[2]]],
          ];

          for (const [sideA, sideB] of partitions) {
            const playsA =
              params.pairPlayCounts[canonicalPairKey(sideA[0], sideA[1])] ?? 0;
            const playsB =
              params.pairPlayCounts[canonicalPairKey(sideB[0], sideB[1])] ?? 0;
            const totalPairRepeats = playsA + playsB;
            const maxPairPlays = Math.max(playsA, playsB);

            const mKey = canonicalMatchupKey(sideA, sideB);
            const matchupPlays = params.matchupPlayCounts[mKey] ?? 0;
            const isCurrent = currentMatchKey && mKey === currentMatchKey ? 1 : 0;

            const score =
              params.strategy === "FAIR"
                ? [
                    lagBeforeStart,
                    totalPairRepeats,
                    sumPlays,
                    maxPairPlays,
                    matchupPlays,
                    isCurrent,
                    same4AsLast,
                    overlapLast,
                  ]
                : [
                    lagBeforeStart,
                    totalPairRepeats,
                    maxPairPlays,
                    matchupPlays,
                    isCurrent,
                    same4AsLast,
                    overlapLast,
                  ];

            if (!bestScore || compareTuples(score, bestScore) < 0) {
              bestScore = score;
              bestCandidates = [
                { sideA, sideB, playsA, playsB, matchupPlays },
              ];
            } else if (compareTuples(score, bestScore) === 0) {
              bestCandidates.push({ sideA, sideB, playsA, playsB, matchupPlays });
            }
          }
        }
      }
    }
  }

  const picked = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
  const flipSides = Math.random() < 0.5;
  const rawA = flipSides ? picked.sideB : picked.sideA;
  const rawB = flipSides ? picked.sideA : picked.sideB;
  const playsA = flipSides ? picked.playsB : picked.playsA;
  const playsB = flipSides ? picked.playsA : picked.playsB;

  const teamA = Math.random() < 0.5 ? [rawA[0], rawA[1]] : [rawA[1], rawA[0]];
  const teamB = Math.random() < 0.5 ? [rawB[0], rawB[1]] : [rawB[1], rawB[0]];

  return {
    ok: true,
    teamA,
    teamB,
    sideAPairPlays: playsA,
    sideBPairPlays: playsB,
    matchupPlays: picked.matchupPlays,
  };
}
