import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@courtpulse/auth/auth.helpers";
import {
  db,
  tournamentMembers,
  tournaments,
  tournamentTeams,
} from "@courtpulse/database";
import type {
  TournamentFairPlayLogRecord,
  TournamentGameRecord,
  TournamentPlayerRecord,
  TournamentRecord,
  TournamentTeamRecord,
} from "@courtpulse/database/schema.types";

export interface TournamentAccessContext {
  tournament: TournamentRecord;
  isOwner: boolean;
  isCoAdmin: boolean;
  isAdmin: boolean;
  ownerTeam: TournamentTeamRecord | null;
  currentUserId: string | null;
  currentUserEmail: string | null;
}

export async function resolveTournamentAccess(
  slug: string,
  tokens?: { adminToken?: string | null; ownerToken?: string | null }
): Promise<TournamentAccessContext | null> {
  const tournament = db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .get();
  if (!tournament) return null;

  const user = await getCurrentUser();
  const isOwner = Boolean(user && user.id === tournament.ownerId);

  let isMemberAdmin = false;
  if (user && !isOwner) {
    const member = db
      .select()
      .from(tournamentMembers)
      .where(
        and(
          eq(tournamentMembers.tournamentId, tournament.id),
          eq(tournamentMembers.userId, user.id)
        )
      )
      .get();
    isMemberAdmin = Boolean(
      member && (member.role === "OWNER" || member.role === "MANAGER")
    );
  }

  const tokenMatchesAdmin = Boolean(
    tokens?.adminToken &&
      tournament.adminToken &&
      tokens.adminToken === tournament.adminToken
  );

  const teamsList = db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournament.id))
    .all();

  let ownerTeam: TournamentTeamRecord | null = null;
  if (tokens?.ownerToken) {
    ownerTeam =
      teamsList.find((t) => t.ownerToken && t.ownerToken === tokens.ownerToken) ??
      null;
  }
  if (!ownerTeam && user?.email) {
    const lowerEmail = user.email.toLowerCase();
    ownerTeam =
      teamsList.find(
        (t) => t.ownerEmail && t.ownerEmail.toLowerCase() === lowerEmail
      ) ?? null;
  }

  const isCoAdmin = tokenMatchesAdmin || isMemberAdmin;
  return {
    tournament,
    isOwner,
    isCoAdmin,
    isAdmin: isOwner || isCoAdmin,
    ownerTeam,
    currentUserId: user?.id ?? null,
    currentUserEmail: user?.email ?? null,
  };
}

export interface TournamentStandingRow {
  tournamentTeamId: string;
  teamName: string;
  color: string;
  logoUrl: string | null;
  teamSlug: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  points: number;
  fairPlayScore: number;
  fairPlayBonus: number;
  purseBudget: number;
  purseSpent: number;
  purseRemaining: number;
  squadCount: number;
}

export interface TournamentPlayerStatRow {
  playerId: string;
  name: string;
  email: string | null;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  category: string;
  skillTier: string;
  isCaptain: boolean;
  isCheckedIn: boolean;
  soldPrice: number;
  basePrice: number;
  auctionStatus: string;
  played: number;
  scheduledCount: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  winRate: number;
  minGamesRequired: number;
  deficit: number;
  projectedDeficit: number;
  quotaMet: boolean;
}

export function computeTournamentAnalytics({
  tournament,
  enrolledTeams,
  players,
  games,
  fairPlayLogs,
}: {
  tournament: TournamentRecord;
  enrolledTeams: {
    enrollment: TournamentTeamRecord;
    clubTeamSlug: string | null;
    clubTeamName: string | null;
  }[];
  players: TournamentPlayerRecord[];
  games: TournamentGameRecord[];
  fairPlayLogs: TournamentFairPlayLogRecord[];
}) {
  const standingsMap = new Map<string, TournamentStandingRow>();

  for (const { enrollment, clubTeamName, clubTeamSlug } of enrolledTeams) {
    const budget = enrollment.purseBudget ?? tournament.auctionPurse;
    const squadCount = players.filter((p) => p.teamId === enrollment.id).length;
    const purseSpent = players
      .filter((p) => p.teamId === enrollment.id)
      .reduce((sum, p) => sum + p.soldPrice, 0);

    standingsMap.set(enrollment.id, {
      tournamentTeamId: enrollment.id,
      teamName: enrollment.name || clubTeamName || "Team",
      color: enrollment.color || "#059669",
      logoUrl: enrollment.logoUrl ?? null,
      teamSlug: clubTeamSlug,
      ownerName: enrollment.ownerName ?? null,
      ownerEmail: enrollment.ownerEmail ?? null,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      points: 0,
      fairPlayScore: 100,
      fairPlayBonus: 0,
      purseBudget: budget,
      purseSpent,
      purseRemaining: Math.max(0, budget - purseSpent),
      squadCount,
    });
  }

  for (const g of games) {
    if (!g.winningTeam) continue;
    const sideA = standingsMap.get(g.teamAId);
    const sideB = standingsMap.get(g.teamBId);
    if (!sideA || !sideB) continue;

    sideA.played += 1;
    sideB.played += 1;
    sideA.pointsFor += g.teamAScore;
    sideA.pointsAgainst += g.teamBScore;
    sideB.pointsFor += g.teamBScore;
    sideB.pointsAgainst += g.teamAScore;

    if (g.winningTeam === "A") {
      sideA.wins += 1;
      sideA.points += tournament.winPoints;
      sideB.losses += 1;
      sideB.points += tournament.lossPoints;
    } else if (g.winningTeam === "B") {
      sideB.wins += 1;
      sideB.points += tournament.winPoints;
      sideA.losses += 1;
      sideA.points += tournament.lossPoints;
    } else {
      sideA.draws += 1;
      sideB.draws += 1;
      sideA.points += tournament.drawPoints;
      sideB.points += tournament.drawPoints;
    }
  }

  for (const log of fairPlayLogs) {
    if (!log.teamId) continue;
    const row = standingsMap.get(log.teamId);
    if (!row) continue;
    row.fairPlayScore = Math.max(
      0,
      Math.min(120, row.fairPlayScore + log.pointsDelta * 5)
    );
    row.fairPlayBonus += log.pointsDelta;
    row.points += log.pointsDelta;
  }

  for (const row of standingsMap.values()) {
    row.pointDiff = row.pointsFor - row.pointsAgainst;
  }

  const standings = Array.from(standingsMap.values()).sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.pointDiff - a.pointDiff ||
      b.pointsFor - a.pointsFor ||
      b.fairPlayScore - a.fairPlayScore ||
      a.teamName.localeCompare(b.teamName)
  );

  // Player-level analytics and Fair Play quota tracking
  const teamById = new Map(standings.map((s) => [s.tournamentTeamId, s]));
  const playerMap = new Map<string, TournamentPlayerStatRow>();
  const playerLookupByIdentity = new Map<string, TournamentPlayerStatRow>();

  for (const p of players) {
    const team = p.teamId ? teamById.get(p.teamId) : undefined;
    const row: TournamentPlayerStatRow = {
      playerId: p.id,
      name: p.name,
      email: p.email,
      teamId: p.teamId,
      teamName: team?.teamName ?? null,
      teamColor: team?.color ?? null,
      category: p.category,
      skillTier: p.skillTier,
      isCaptain: p.isCaptain,
      isCheckedIn: p.isCheckedIn,
      soldPrice: p.soldPrice,
      basePrice: p.basePrice,
      auctionStatus: p.auctionStatus,
      played: 0,
      scheduledCount: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      winRate: 0,
      minGamesRequired: tournament.minGamesPerPlayer,
      deficit: tournament.minGamesPerPlayer,
      projectedDeficit: tournament.minGamesPerPlayer,
      quotaMet: tournament.minGamesPerPlayer === 0,
    };
    playerMap.set(p.id, row);
    playerLookupByIdentity.set(p.name.trim().toLowerCase(), row);
    if (p.email) {
      playerLookupByIdentity.set(p.email.trim().toLowerCase(), row);
    }
  }

  for (const g of games) {
    const isDone = g.status === "COMPLETED" && Boolean(g.winningTeam);
    const updateSide = (names: string[], side: "A" | "B") => {
      const seen = new Set<string>();
      for (const raw of names) {
        const key = raw.trim().toLowerCase();
        const player = playerLookupByIdentity.get(key);
        if (!player || seen.has(player.playerId)) continue;
        seen.add(player.playerId);

        if (!isDone) {
          player.scheduledCount += 1;
          continue;
        }
        player.played += 1;
        const ownPts = side === "A" ? g.teamAScore : g.teamBScore;
        const oppPts = side === "A" ? g.teamBScore : g.teamAScore;
        player.pointsFor += ownPts;
        player.pointsAgainst += oppPts;
        if (g.winningTeam === side) {
          player.wins += 1;
        } else if (g.winningTeam !== "DRAW") {
          player.losses += 1;
        }
      }
    };

    updateSide(g.teamAPlayers || [], "A");
    updateSide(g.teamBPlayers || [], "B");
  }

  const playerStats = Array.from(playerMap.values()).map((row) => {
    const pointDiff = row.pointsFor - row.pointsAgainst;
    const winRate =
      row.played > 0 ? Math.round((row.wins / row.played) * 100) : 0;
    const deficit = Math.max(0, row.minGamesRequired - row.played);
    const projectedDeficit = Math.max(
      0,
      row.minGamesRequired - (row.played + row.scheduledCount)
    );
    return {
      ...row,
      pointDiff,
      winRate,
      deficit,
      projectedDeficit,
      quotaMet: row.played >= row.minGamesRequired,
    };
  });

  playerStats.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.winRate - a.winRate ||
      b.pointDiff - a.pointDiff ||
      b.played - a.played ||
      a.name.localeCompare(b.name)
  );

  const rosteredPlayers = playerStats.filter((p) => Boolean(p.teamId));
  const quotaTarget = tournament.minGamesPerPlayer;
  const playersBehindQuota = playerStats.filter((p) => p.deficit > 0);
  const playersProjectedBehind = playerStats.filter(
    (p) => p.projectedDeficit > 0
  );
  const checkedInCount = players.filter((p) => p.isCheckedIn).length;
  const complianceRate =
    rosteredPlayers.length > 0 && quotaTarget > 0
      ? Math.round(
          (rosteredPlayers.filter((p) => p.quotaMet).length /
            rosteredPlayers.length) *
            100
        )
      : 100;

  return {
    standings,
    playerStats,
    fairPlaySummary: {
      minGamesPerPlayer: quotaTarget,
      totalPlayers: players.length,
      rosteredCount: rosteredPlayers.length,
      checkedInCount,
      behindQuotaCount: playersBehindQuota.length,
      projectedBehindCount: playersProjectedBehind.length,
      complianceRate,
    },
  };
}

export interface PlannedFixture {
  teamAId: string;
  teamBId: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  round: number;
  courtNumber: number;
  slotLabel: string;
  scheduleTime: Date;
  isFairPlayCatchup: boolean;
}

export function generateSmartTournamentFixtures({
  teams,
  players,
  existingGames,
  courtsCount,
  minGamesPerPlayer,
  mode,
  matchFormat,
  startAt,
  slotMinutes,
  doubleRoundRobin,
}: {
  teams: TournamentTeamRecord[];
  players: TournamentPlayerRecord[];
  existingGames: TournamentGameRecord[];
  courtsCount: number;
  minGamesPerPlayer: number;
  mode: "ROUND_ROBIN" | "FAIR_PLAY_CATCHUP";
  matchFormat: "DOUBLES" | "SINGLES";
  startAt: Date;
  slotMinutes: number;
  doubleRoundRobin?: boolean;
}): PlannedFixture[] {
  if (teams.length < 2) return [];
  const safeCourts = Math.max(1, courtsCount);
  const perSide = matchFormat === "DOUBLES" ? 2 : 1;

  // Track play counts per player name (lowercase) across completed + scheduled games
  const playerPlayLoad = new Map<string, number>();
  for (const p of players) {
    playerPlayLoad.set(p.name.trim().toLowerCase(), 0);
  }
  for (const g of existingGames) {
    for (const raw of [...(g.teamAPlayers || []), ...(g.teamBPlayers || [])]) {
      const k = raw.trim().toLowerCase();
      playerPlayLoad.set(k, (playerPlayLoad.get(k) ?? 0) + 1);
    }
  }

  const pickPlayersForTeam = (
    teamId: string,
    preferUnderQuota: boolean
  ): string[] => {
    const roster = players
      .filter((p) => p.teamId === teamId)
      .sort((a, b) => {
        // Checked-in first if anyone is checked in, then lowest play load first
        if (a.isCheckedIn !== b.isCheckedIn) return a.isCheckedIn ? -1 : 1;
        const loadA = playerPlayLoad.get(a.name.trim().toLowerCase()) ?? 0;
        const loadB = playerPlayLoad.get(b.name.trim().toLowerCase()) ?? 0;
        if (preferUnderQuota && loadA !== loadB) return loadA - loadB;
        if (loadA !== loadB) return loadA - loadB;
        return a.name.localeCompare(b.name);
      });

    if (roster.length === 0) return [];
    const chosen = roster.slice(0, Math.min(perSide, roster.length));
    for (const p of chosen) {
      const k = p.name.trim().toLowerCase();
      playerPlayLoad.set(k, (playerPlayLoad.get(k) ?? 0) + 1);
    }
    return chosen.map((p) => p.name);
  };

  type PairSeed = { a: string; b: string; round: number; isCatchup: boolean };
  const rawPairings: PairSeed[] = [];

  if (mode === "ROUND_ROBIN") {
    // Circle method round-robin scheduling
    const ids = teams.map((t) => t.id);
    if (ids.length % 2 === 1) ids.push("__BYE__");
    const totalRounds = ids.length - 1;
    const half = ids.length / 2;
    const ring = [...ids];

    const appendPass = (roundOffset: number, flipHome: boolean) => {
      const working = [...ring];
      for (let r = 0; r < totalRounds; r++) {
        for (let i = 0; i < half; i++) {
          const t1 = working[i];
          const t2 = working[working.length - 1 - i];
          if (t1 === "__BYE__" || t2 === "__BYE__") continue;
          rawPairings.push({
            a: flipHome ? t2 : t1,
            b: flipHome ? t1 : t2,
            round: roundOffset + r + 1,
            isCatchup: false,
          });
        }
        const fixed = working[0];
        const rest = working.slice(1);
        const last = rest.pop()!;
        rest.unshift(last);
        working.splice(0, working.length, fixed, ...rest);
      }
    };

    appendPass(0, false);
    if (doubleRoundRobin) {
      appendPass(totalRounds, true);
    }
  } else {
    // Fair Play catch-up mode: keep creating matches while any rostered player is below minGamesPerPlayer
    const target = Math.max(1, minGamesPerPlayer);
    const maxFixtures = 24;
    for (let safety = 0; safety < maxFixtures; safety++) {
      const underQuotaTeams = teams
        .map((team) => {
          const roster = players.filter((p) => p.teamId === team.id);
          const deficitTotal = roster.reduce((sum, p) => {
            const played = playerPlayLoad.get(p.name.trim().toLowerCase()) ?? 0;
            return sum + Math.max(0, target - played);
          }, 0);
          return { team, deficitTotal };
        })
        .filter((x) => x.deficitTotal > 0)
        .sort((x, y) => y.deficitTotal - x.deficitTotal);

      if (underQuotaTeams.length === 0) break;

      const teamA = underQuotaTeams[0].team;
      const partnerCandidates = teams
        .filter((t) => t.id !== teamA.id)
        .sort((t1, t2) => {
          const d1 =
            underQuotaTeams.find((u) => u.team.id === t1.id)?.deficitTotal ?? 0;
          const d2 =
            underQuotaTeams.find((u) => u.team.id === t2.id)?.deficitTotal ?? 0;
          return d2 - d1;
        });

      const teamB = partnerCandidates[0];
      if (!teamB) break;

      rawPairings.push({
        a: teamA.id,
        b: teamB.id,
        round: safety + 1,
        isCatchup: true,
      });

      // Simulate picks right away inside the loop so deficit counts shrink accurately
      pickPlayersForTeam(teamA.id, true);
      pickPlayersForTeam(teamB.id, true);
    }

    // Reset simulated load before final wave & player allocation below
    for (const p of players) {
      playerPlayLoad.set(p.name.trim().toLowerCase(), 0);
    }
    for (const g of existingGames) {
      for (const raw of [...(g.teamAPlayers || []), ...(g.teamBPlayers || [])]) {
        const k = raw.trim().toLowerCase();
        playerPlayLoad.set(k, (playerPlayLoad.get(k) ?? 0) + 1);
      }
    }
  }

  // Pack pairings into non-overlapping waves across available courts
  const planned: PlannedFixture[] = [];
  const remaining = [...rawPairings];
  let wave = 0;

  while (remaining.length > 0) {
    wave += 1;
    const busyTeamsThisWave = new Set<string>();
    let assignedInWave = 0;

    for (let i = 0; i < remaining.length && assignedInWave < safeCourts; ) {
      const candidate = remaining[i];
      if (
        !busyTeamsThisWave.has(candidate.a) &&
        !busyTeamsThisWave.has(candidate.b)
      ) {
        busyTeamsThisWave.add(candidate.a);
        busyTeamsThisWave.add(candidate.b);
        assignedInWave += 1;
        const scheduleTime = new Date(
          startAt.getTime() + (wave - 1) * slotMinutes * 60 * 1000
        );
        planned.push({
          teamAId: candidate.a,
          teamBId: candidate.b,
          teamAPlayers: pickPlayersForTeam(
            candidate.a,
            mode === "FAIR_PLAY_CATCHUP"
          ),
          teamBPlayers: pickPlayersForTeam(
            candidate.b,
            mode === "FAIR_PLAY_CATCHUP"
          ),
          round: candidate.round,
          courtNumber: assignedInWave,
          slotLabel: `Wave ${wave} · Court ${assignedInWave}`,
          scheduleTime,
          isFairPlayCatchup: candidate.isCatchup,
        });
        remaining.splice(i, 1);
      } else {
        i += 1;
      }
    }

    // Safety guard in case remaining items couldn't fit
    if (assignedInWave === 0 && remaining.length > 0) {
      const fallback = remaining.shift()!;
      const scheduleTime = new Date(
        startAt.getTime() + (wave - 1) * slotMinutes * 60 * 1000
      );
      planned.push({
        teamAId: fallback.a,
        teamBId: fallback.b,
        teamAPlayers: pickPlayersForTeam(fallback.a, false),
        teamBPlayers: pickPlayersForTeam(fallback.b, false),
        round: fallback.round,
        courtNumber: 1,
        slotLabel: `Wave ${wave} · Court 1`,
        scheduleTime,
        isFairPlayCatchup: fallback.isCatchup,
      });
    }
  }

  return planned;
}
