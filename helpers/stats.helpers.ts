export interface MemberIdentity {
  email: string;
  displayName?: string | null;
  user?: {
    name?: string | null;
    displayName?: string | null;
  } | null;
}

export interface GameLike {
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAScore?: number;
  teamBScore?: number;
  winner: "A" | "B" | null;
  createdAt?: Date | string;
}

export interface PlayerStatRow {
  key: string;
  name: string;
  email: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  recentForm: ("W" | "L")[];
}

export interface PairStatRow {
  pairKey: string;
  pairLabel: string;
  plays: number;
  wins: number;
  winRate: number;
}

export interface UserTeamSummary {
  teamId: string;
  teamName: string;
  teamSlug: string;
  plays: number;
  wins: number;
  losses: number;
}

export function getMemberDisplayName(member: MemberIdentity): string {
  const emailPrefix = member.email.split("@")[0] || member.email;
  return (
    member.displayName?.trim() ||
    member.user?.displayName?.trim() ||
    member.user?.name?.trim() ||
    emailPrefix
  );
}

export function buildPlayerLabelMap(members: MemberIdentity[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of members) {
    const label = getMemberDisplayName(m);
    map.set(m.email.toLowerCase(), label);
    if (m.displayName) map.set(m.displayName.toLowerCase(), label);
    if (m.user?.name) map.set(m.user.name.toLowerCase(), label);
  }
  return map;
}

export function resolvePlayerLabel(token: string, labelMap: Map<string, string>): string {
  const normalized = token.trim().toLowerCase();
  const mapped = labelMap.get(normalized);
  if (mapped) return mapped;
  if (token.includes("@")) return token.split("@")[0];
  return token;
}

export function calculateTeamPlayerStats(
  games: GameLike[],
  members: MemberIdentity[]
): PlayerStatRow[] {
  const tokenToMemberKey = new Map<string, string>();
  const rows = new Map<string, PlayerStatRow>();

  for (const m of members) {
    const key = m.email.toLowerCase();
    const label = getMemberDisplayName(m);
    rows.set(key, {
      key,
      name: label,
      email: m.email,
      games: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      points: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      recentForm: [],
    });
    tokenToMemberKey.set(key, key);
    if (m.displayName) tokenToMemberKey.set(m.displayName.trim().toLowerCase(), key);
    if (m.user?.name) tokenToMemberKey.set(m.user.name.trim().toLowerCase(), key);
    if (m.user?.displayName) tokenToMemberKey.set(m.user.displayName.trim().toLowerCase(), key);
  }

  const ensureRow = (rawToken: string): PlayerStatRow => {
    const normalized = rawToken.trim().toLowerCase();
    const existingKey = tokenToMemberKey.get(normalized);
    if (existingKey && rows.has(existingKey)) {
      return rows.get(existingKey)!;
    }
    const fallbackName = rawToken.includes("@") ? rawToken.split("@")[0] : rawToken;
    const created: PlayerStatRow = {
      key: normalized,
      name: fallbackName,
      email: rawToken.includes("@") ? rawToken : "",
      games: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      points: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      recentForm: [],
    };
    rows.set(normalized, created);
    tokenToMemberKey.set(normalized, normalized);
    return created;
  };

  for (const game of games) {
    if (!game.winner) continue;
    const scoreA = Number(game.teamAScore ?? 0);
    const scoreB = Number(game.teamBScore ?? 0);
    const aWon = game.winner === "A";

    for (const token of game.teamAPlayers) {
      const row = ensureRow(token);
      row.games += 1;
      row.pointsFor += scoreA;
      row.pointsAgainst += scoreB;
      row.pointDiff += scoreA - scoreB;
      if (aWon) {
        row.wins += 1;
        row.points += 10;
        if (row.recentForm.length < 5) row.recentForm.push("W");
      } else {
        row.losses += 1;
        row.points += 2;
        if (row.recentForm.length < 5) row.recentForm.push("L");
      }
    }

    for (const token of game.teamBPlayers) {
      const row = ensureRow(token);
      row.games += 1;
      row.pointsFor += scoreB;
      row.pointsAgainst += scoreA;
      row.pointDiff += scoreB - scoreA;
      if (!aWon) {
        row.wins += 1;
        row.points += 10;
        if (row.recentForm.length < 5) row.recentForm.push("W");
      } else {
        row.losses += 1;
        row.points += 2;
        if (row.recentForm.length < 5) row.recentForm.push("L");
      }
    }
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      winRate: row.games > 0 ? Number(((row.wins / row.games) * 100).toFixed(1)) : 0,
      recentForm: [...row.recentForm].reverse(),
    }))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.pointDiff - a.pointDiff ||
        b.winRate - a.winRate ||
        b.points - a.points ||
        a.name.localeCompare(b.name)
    );
}

export function calculateWinningPairs(
  games: GameLike[],
  labelMap: Map<string, string>
): PairStatRow[] {
  const pairMap = new Map<string, { plays: number; wins: number; label: string }>();

  const recordSide = (players: string[], isWinner: boolean) => {
    if (players.length !== 2) return;
    const sortedTokens = [...players].map((p) => p.trim().toLowerCase()).sort();
    const key = sortedTokens.join("|");
    const label = `${resolvePlayerLabel(sortedTokens[0], labelMap)} & ${resolvePlayerLabel(
      sortedTokens[1],
      labelMap
    )}`;

    const existing = pairMap.get(key) || { plays: 0, wins: 0, label };
    existing.plays += 1;
    if (isWinner) existing.wins += 1;
    pairMap.set(key, existing);
  };

  for (const game of games) {
    if (!game.winner) continue;
    recordSide(game.teamAPlayers, game.winner === "A");
    recordSide(game.teamBPlayers, game.winner === "B");
  }

  return Array.from(pairMap.entries())
    .map(([pairKey, stats]) => ({
      pairKey,
      pairLabel: stats.label,
      plays: stats.plays,
      wins: stats.wins,
      winRate: stats.plays > 0 ? Number(((stats.wins / stats.plays) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.plays - a.plays);
}

export function matchesUserIdentity(
  token: string,
  userEmail: string,
  userName?: string | null,
  userDisplayName?: string | null
): boolean {
  const normalized = token.trim().toLowerCase();
  if (normalized === userEmail.trim().toLowerCase()) return true;
  if (userDisplayName && normalized === userDisplayName.trim().toLowerCase()) return true;
  if (userName && normalized === userName.trim().toLowerCase()) return true;
  return false;
}
