import {
  buildPlayerLabelMap,
  getMemberDisplayName,
  resolvePlayerLabel,
  type GameLike,
  type MemberIdentity,
  type PairStatRow,
  type PlayerStatRow,
} from "./stats.helpers";
import { buildTokenToEmailMap } from "./pairing.helpers";

export interface SessionTrendPoint {
  label: string;
  matches: number;
  completed: number;
}

export interface PartnerChemistryRow {
  partnerKey: string;
  partnerName: string;
  plays: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface RecentMatchRow {
  id: string;
  slug: string;
  sessionSlug: string;
  sessionName: string;
  teamA: string[];
  teamB: string[];
  winner: "A" | "B" | null;
  createdAt: Date | string;
}

export function calculateSessionTrend(
  sessions: {
    name: string | null;
    date: Date | string;
    games: GameLike[];
  }[]
): SessionTrendPoint[] {
  // Take up to 14 most recent sessions in chronological order
  const ordered = [...sessions].slice(0, 14).reverse();
  return ordered.map((s) => {
    const d = s.date instanceof Date ? s.date : new Date(s.date);
    const shortDate = Number.isNaN(d.getTime())
      ? ""
      : `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
    const completed = s.games.filter((g) => Boolean(g.winner)).length;
    return {
      label: shortDate || s.name || "Session",
      matches: s.games.length,
      completed,
    };
  });
}

export function calculatePlayerPartnerBreakdown(
  playerKey: string,
  games: GameLike[],
  members: MemberIdentity[]
): PartnerChemistryRow[] {
  const labelMap = buildPlayerLabelMap(members);
  const memberAliases = new Set<string>([playerKey.toLowerCase()]);

  for (const m of members) {
    if (m.email.toLowerCase() === playerKey.toLowerCase()) {
      if (m.displayName) memberAliases.add(m.displayName.trim().toLowerCase());
      if (m.user?.name) memberAliases.add(m.user.name.trim().toLowerCase());
      if (m.user?.displayName) memberAliases.add(m.user.displayName.trim().toLowerCase());
    }
  }

  const partnerMap = new Map<string, PartnerChemistryRow>();

  const checkSide = (players: string[], didWin: boolean) => {
    const normalized = players.map((p) => p.trim().toLowerCase());
    const hasPlayer = normalized.some((p) => memberAliases.has(p));
    if (!hasPlayer || normalized.length < 2) return;

    const partnerToken = normalized.find((p) => !memberAliases.has(p));
    if (!partnerToken) return;

    const partnerName = resolvePlayerLabel(partnerToken, labelMap);
    const row = partnerMap.get(partnerToken) || {
      partnerKey: partnerToken,
      partnerName,
      plays: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };

    row.plays += 1;
    if (didWin) row.wins += 1;
    else row.losses += 1;
    row.winRate = Math.round((row.wins / row.plays) * 100);
    partnerMap.set(partnerToken, row);
  };

  for (const game of games) {
    if (!game.winner) continue;
    checkSide(game.teamAPlayers, game.winner === "A");
    checkSide(game.teamBPlayers, game.winner === "B");
  }

  return Array.from(partnerMap.values()).sort(
    (a, b) => b.wins - a.wins || b.winRate - a.winRate || b.plays - a.plays
  );
}

export function extractRecentMatches(
  sessions: {
    slug: string;
    name: string | null;
    games: {
      id: string;
      slug: string;
      teamAPlayers: string[];
      teamBPlayers: string[];
      winner: "A" | "B" | null;
      createdAt: Date | string;
    }[];
  }[],
  members: MemberIdentity[],
  limit = 10
): RecentMatchRow[] {
  const labelMap = buildPlayerLabelMap(members);
  const rows: RecentMatchRow[] = [];

  for (const session of sessions) {
    for (const g of session.games) {
      rows.push({
        id: g.id,
        slug: g.slug,
        sessionSlug: session.slug,
        sessionName: session.name || "Match session",
        teamA: g.teamAPlayers.map((t) => resolvePlayerLabel(t, labelMap)),
        teamB: g.teamBPlayers.map((t) => resolvePlayerLabel(t, labelMap)),
        winner: g.winner,
        createdAt: g.createdAt,
      });
    }
  }

  return rows
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

export interface PartnerVersatilityRow {
  playerKey: string;
  playerName: string;
  distinctPartners: number;
  winningPartners: number;
  doublesWins: number;
  doublesPlays: number;
  avgPartnerWinRate: number;
}

export interface TeamInsightsSummary {
  universalPartner: PartnerVersatilityRow | null;
  topVersatilePartners: PartnerVersatilityRow[];
  bestDuo: PairStatRow | null;
  marginLeader: {
    name: string;
    avgDiff: number;
    totalDiff: number;
    games: number;
  } | null;
  clutchPlayer: {
    name: string;
    winRate: number;
    wins: number;
    games: number;
  } | null;
  streakLeader: {
    name: string;
    bestStreak: number;
    currentStreak: number;
  } | null;
  ironman: {
    name: string;
    games: number;
  } | null;
  tempo: {
    scoredCount: number;
    avgMargin: number;
    closeGamesPct: number;
    biggestWinScore: string;
    biggestWinners: string;
    biggestMargin: number;
  };
}

export function calculateTeamInsights(
  games: GameLike[],
  members: MemberIdentity[],
  playerStats: PlayerStatRow[],
  winningPairs: PairStatRow[]
): TeamInsightsSummary | null {
  const scoredGames = games
    .filter((g) => Boolean(g.winner))
    .sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    );

  if (scoredGames.length === 0) return null;

  const labelMap = buildPlayerLabelMap(members);
  const tokenToEmail = buildTokenToEmailMap(members);
  const canon = (raw: string) => {
    const clean = raw.trim().toLowerCase();
    return tokenToEmail.get(clean) ?? clean;
  };

  // Per-player partner chemistry, close-game clutch stats, and win streaks
  const partnerHistory = new Map<
    string,
    Map<string, { plays: number; wins: number }>
  >();
  const clutchStats = new Map<string, { plays: number; wins: number }>();
  const streakStats = new Map<string, { cur: number; max: number }>();

  let marginSum = 0;
  let scoredWithPoints = 0;
  let closeGames = 0;
  let biggestMargin = -1;
  let biggestWinScore = "";
  let biggestWinners = "";

  for (const g of scoredGames) {
    const scoreA = Number(g.teamAScore ?? 0);
    const scoreB = Number(g.teamBScore ?? 0);
    const hasScores = scoreA > 0 || scoreB > 0;
    const diff = Math.abs(scoreA - scoreB);
    const isClose = hasScores && diff <= 3;

    if (hasScores) {
      scoredWithPoints += 1;
      marginSum += diff;
      if (isClose) closeGames += 1;

      if (diff > biggestMargin) {
        biggestMargin = diff;
        const winSide = g.winner === "A" ? g.teamAPlayers : g.teamBPlayers;
        const hi = Math.max(scoreA, scoreB);
        const lo = Math.min(scoreA, scoreB);
        biggestWinScore = `${hi} - ${lo}`;
        biggestWinners = winSide
          .map((t) => resolvePlayerLabel(t, labelMap))
          .join(" & ");
      }
    }

    const recordSide = (players: string[], won: boolean) => {
      const normalized = players.map(canon);
      for (const p of normalized) {
        const s = streakStats.get(p) || { cur: 0, max: 0 };
        if (won) {
          s.cur += 1;
          if (s.cur > s.max) s.max = s.cur;
        } else {
          s.cur = 0;
        }
        streakStats.set(p, s);

        if (isClose) {
          const c = clutchStats.get(p) || { plays: 0, wins: 0 };
          c.plays += 1;
          if (won) c.wins += 1;
          clutchStats.set(p, c);
        }
      }

      if (normalized.length === 2) {
        const [p1, p2] = normalized;
        const addPair = (a: string, b: string) => {
          let map = partnerHistory.get(a);
          if (!map) {
            map = new Map();
            partnerHistory.set(a, map);
          }
          const rec = map.get(b) || { plays: 0, wins: 0 };
          rec.plays += 1;
          if (won) rec.wins += 1;
          map.set(b, rec);
        };
        addPair(p1, p2);
        addPair(p2, p1);
      }
    };

    recordSide(g.teamAPlayers, g.winner === "A");
    recordSide(g.teamBPlayers, g.winner === "B");
  }

  // Partner versatility ("who almost wins with everyone")
  const versatilityRows: PartnerVersatilityRow[] = [];
  for (const [playerKey, partners] of partnerHistory.entries()) {
    let doublesPlays = 0;
    let doublesWins = 0;
    let winningPartners = 0;
    let rateSum = 0;

    for (const stats of partners.values()) {
      doublesPlays += stats.plays;
      doublesWins += stats.wins;
      const pct = (stats.wins / stats.plays) * 100;
      rateSum += pct;
      if (pct >= 50) winningPartners += 1;
    }

    const distinctPartners = partners.size;
    if (distinctPartners < 2) continue;

    versatilityRows.push({
      playerKey,
      playerName: resolvePlayerLabel(playerKey, labelMap),
      distinctPartners,
      winningPartners,
      doublesWins,
      doublesPlays,
      avgPartnerWinRate: Number((rateSum / distinctPartners).toFixed(1)),
    });
  }

  const minQualifiedGames =
    scoredGames.length >= 40
      ? Math.min(20, Math.round(scoredGames.length * 0.05))
      : scoredGames.length >= 15
      ? 5
      : 2;

  const qualifiedVersatile = versatilityRows.filter(
    (r) => r.doublesPlays >= minQualifiedGames
  );
  const topVersatilePartners = (
    qualifiedVersatile.length > 0 ? qualifiedVersatile : versatilityRows
  )
    .sort(
      (a, b) =>
        b.winningPartners - a.winningPartners ||
        b.avgPartnerWinRate - a.avgPartnerWinRate ||
        b.doublesWins - a.doublesWins
    )
    .slice(0, 5);

  const universalPartner = topVersatilePartners[0] ?? null;

  // Best duo with statistical sample threshold (>= 5 plays if available, else top winRate >= 2 plays)
  const qualifiedPairs = winningPairs.filter((p) => p.plays >= 5);
  const fallbackPairs = winningPairs.filter((p) => p.plays >= 2);
  const pairPool =
    qualifiedPairs.length > 0
      ? qualifiedPairs
      : fallbackPairs.length > 0
      ? fallbackPairs
      : winningPairs;
  const bestDuo =
    [...pairPool].sort(
      (a, b) => b.winRate - a.winRate || b.wins - a.wins || b.plays - a.plays
    )[0] ?? null;

  // Point margin MVP
  const marginCandidates = playerStats.filter((p) => p.games > 0);
  const marginPool = marginCandidates.some((p) => p.games >= minQualifiedGames)
    ? marginCandidates.filter((p) => p.games >= minQualifiedGames)
    : marginCandidates;
  const topMargin =
    [...marginPool].sort(
      (a, b) =>
        b.pointDiff / b.games - a.pointDiff / a.games || b.pointDiff - a.pointDiff
    )[0] ?? null;

  // Clutch player in <= 3pt games
  const clutchEntries = Array.from(clutchStats.entries()).map(([k, v]) => ({
    key: k,
    name: resolvePlayerLabel(k, labelMap),
    wins: v.wins,
    games: v.plays,
    winRate: Number(((v.wins / v.plays) * 100).toFixed(1)),
  }));
  const qualifiedClutch = clutchEntries.filter((c) => c.games >= 3);
  const topClutch =
    [...(qualifiedClutch.length > 0 ? qualifiedClutch : clutchEntries)].sort(
      (a, b) => b.winRate - a.winRate || b.wins - a.wins
    )[0] ?? null;

  // Longest win streak
  const streakEntries = Array.from(streakStats.entries()).map(([k, v]) => ({
    name: resolvePlayerLabel(k, labelMap),
    bestStreak: v.max,
    currentStreak: v.cur,
  }));
  const streakLeader =
    streakEntries.sort(
      (a, b) => b.bestStreak - a.bestStreak || b.currentStreak - a.currentStreak
    )[0] ?? null;

  // Most active ironman
  const ironmanRow =
    [...playerStats]
      .filter((p) => p.games > 0)
      .sort((a, b) => b.games - a.games || b.wins - a.wins)[0] ?? null;

  return {
    universalPartner,
    topVersatilePartners,
    bestDuo,
    marginLeader: topMargin
      ? {
          name: topMargin.name,
          avgDiff: Number((topMargin.pointDiff / topMargin.games).toFixed(1)),
          totalDiff: topMargin.pointDiff,
          games: topMargin.games,
        }
      : null,
    clutchPlayer: topClutch
      ? {
          name: topClutch.name,
          winRate: topClutch.winRate,
          wins: topClutch.wins,
          games: topClutch.games,
        }
      : null,
    streakLeader: streakLeader && streakLeader.bestStreak > 0 ? streakLeader : null,
    ironman: ironmanRow
      ? { name: ironmanRow.name, games: ironmanRow.games }
      : null,
    tempo: {
      scoredCount: scoredGames.length,
      avgMargin:
        scoredWithPoints > 0
          ? Number((marginSum / scoredWithPoints).toFixed(1))
          : 0,
      closeGamesPct:
        scoredWithPoints > 0
          ? Math.round((closeGames / scoredWithPoints) * 100)
          : 0,
      biggestWinScore: biggestWinScore || "None yet",
      biggestWinners: biggestWinners || "",
      biggestMargin: biggestMargin > 0 ? biggestMargin : 0,
    },
  };
}

export { getMemberDisplayName };
