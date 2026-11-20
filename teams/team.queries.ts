import { desc, eq, inArray } from "drizzle-orm";
import { withCache } from "@courtpulse/connections/cache.connection";
import {
  db,
  games,
  pairStats,
  sessions,
  teamMembers,
  teams,
  tournamentTeams,
  tournaments,
  users,
} from "@courtpulse/database";
import {
  calculateTeamPlayerStats,
  calculateWinningPairs,
  buildPlayerLabelMap,
  matchesUserIdentity,
  type UserTeamSummary,
} from "@courtpulse/helpers/stats.helpers";

export async function getDashboardData(userId: string) {
  return withCache(`dashboard:${userId}`, () => computeDashboardData(userId));
}

function computeDashboardData(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return null;

  const ownedTeams = db
    .select()
    .from(teams)
    .where(eq(teams.ownerId, user.id))
    .orderBy(desc(teams.createdAt))
    .all();

  const memberLinks = db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .all();

  const memberTeamIds = memberLinks.map((m) => m.teamId);
  const memberTeams =
    memberTeamIds.length > 0
      ? db.select().from(teams).where(inArray(teams.id, memberTeamIds)).all()
      : [];

  const allTeamsMap = new Map<string, (typeof ownedTeams)[number]>();
  for (const t of ownedTeams) allTeamsMap.set(t.id, t);
  for (const t of memberTeams) {
    if (!allTeamsMap.has(t.id)) allTeamsMap.set(t.id, t);
  }
  const allTeams = Array.from(allTeamsMap.values());
  const allTeamIds = allTeams.map((t) => t.id);

  const allMembers =
    allTeamIds.length > 0
      ? db
          .select()
          .from(teamMembers)
          .where(inArray(teamMembers.teamId, allTeamIds))
          .all()
      : [];

  const allSessions =
    allTeamIds.length > 0
      ? db
          .select()
          .from(sessions)
          .where(inArray(sessions.teamId, allTeamIds))
          .orderBy(desc(sessions.date), desc(sessions.createdAt))
          .all()
      : [];

  const allSessionIds = allSessions.map((s) => s.id);
  const allGames =
    allSessionIds.length > 0
      ? db
          .select()
          .from(games)
          .where(inArray(games.sessionId, allSessionIds))
          .all()
      : [];

  const sessionToTeamId = new Map(allSessions.map((s) => [s.id, s.teamId]));
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const membersByTeam = new Map<string, number>();
  for (const m of allMembers) {
    membersByTeam.set(m.teamId, (membersByTeam.get(m.teamId) ?? 0) + 1);
  }

  const gamesCountByTeam = new Map<string, number>();
  const gamesCountBySession = new Map<string, number>();
  for (const g of allGames) {
    gamesCountBySession.set(g.sessionId, (gamesCountBySession.get(g.sessionId) ?? 0) + 1);
    const tid = sessionToTeamId.get(g.sessionId);
    if (tid) {
      gamesCountByTeam.set(tid, (gamesCountByTeam.get(tid) ?? 0) + 1);
    }
  }

  const sessionsCountByTeam = new Map<string, number>();
  for (const s of allSessions) {
    sessionsCountByTeam.set(s.teamId, (sessionsCountByTeam.get(s.teamId) ?? 0) + 1);
  }

  let totalWins = 0;
  let totalLosses = 0;
  let totalGamesPlayed = 0;

  const teamStatsMap = new Map<string, UserTeamSummary>();
  for (const team of allTeams) {
    teamStatsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      teamSlug: team.slug,
      plays: 0,
      wins: 0,
      losses: 0,
    });
  }

  for (const g of allGames) {
    const teamId = sessionToTeamId.get(g.sessionId);
    if (!teamId) continue;

    const inA = g.teamAPlayers.some((p) =>
      matchesUserIdentity(p, user.email, user.name, user.displayName)
    );
    const inB = g.teamBPlayers.some((p) =>
      matchesUserIdentity(p, user.email, user.name, user.displayName)
    );

    if (!inA && !inB) continue;

    totalGamesPlayed += 1;
    const summary = teamStatsMap.get(teamId);
    if (summary) summary.plays += 1;

    if ((g.winner === "A" && inA) || (g.winner === "B" && inB)) {
      totalWins += 1;
      if (summary) summary.wins += 1;
    } else if (g.winner) {
      totalLosses += 1;
      if (summary) summary.losses += 1;
    }
  }

  const hostedTournaments = db
    .select()
    .from(tournaments)
    .where(eq(tournaments.ownerId, user.id))
    .orderBy(desc(tournaments.createdAt))
    .all();

  const linkedTournaments =
    allTeamIds.length > 0
      ? db
          .select({ tournament: tournaments })
          .from(tournamentTeams)
          .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
          .where(inArray(tournamentTeams.teamId, allTeamIds))
          .all()
          .map((row) => row.tournament)
      : [];

  const tournamentMap = new Map<string, (typeof hostedTournaments)[number]>();
  for (const t of hostedTournaments) tournamentMap.set(t.id, t);
  for (const t of linkedTournaments) {
    if (!tournamentMap.has(t.id)) tournamentMap.set(t.id, t);
  }

  const winRate =
    totalGamesPlayed > 0
      ? Number(((totalWins / totalGamesPlayed) * 100).toFixed(1))
      : 0;

  const recentSessions = allSessions.slice(0, 6).map((s) => {
    const team = teamById.get(s.teamId);
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      date: s.date,
      teamName: team?.name || "Team",
      teamSlug: team?.slug || "",
      gameCount: gamesCountBySession.get(s.id) ?? 0,
    };
  });

  const allLabelMap = buildPlayerLabelMap(allMembers);
  const sessionById = new Map(allSessions.map((s) => [s.id, s]));
  const recentMatches = [...allGames]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map((g) => {
      const sess = sessionById.get(g.sessionId);
      const team = sess ? teamById.get(sess.teamId) : undefined;
      return {
        id: g.id,
        teamName: team?.name || "Team",
        teamSlug: team?.slug || "",
        sessionSlug: sess?.slug || "",
        teamA: g.teamAPlayers.map((t) => allLabelMap.get(t.toLowerCase()) || t.split("@")[0]),
        teamB: g.teamBPlayers.map((t) => allLabelMap.get(t.toLowerCase()) || t.split("@")[0]),
        teamAScore: g.teamAScore,
        teamBScore: g.teamBScore,
        winner: g.winner,
      };
    });

  return {
    user,
    teams: allTeams.map((t) => ({
      ...t,
      memberCount: membersByTeam.get(t.id) ?? 0,
      sessionCount: sessionsCountByTeam.get(t.id) ?? 0,
      totalMatches: gamesCountByTeam.get(t.id) ?? 0,
      userSummary: teamStatsMap.get(t.id)!,
    })),
    tournaments: Array.from(tournamentMap.values()),
    recentSessions,
    recentMatches,
    stats: {
      totalWins,
      totalLosses,
      totalGamesPlayed,
      winRate,
      points: totalWins * 3 + totalGamesPlayed,
    },
    teamChartStats: Array.from(teamStatsMap.values()).filter((s) => s.plays > 0),
  };
}

export async function getTeamDetailBySlug(slug: string) {
  return withCache(`team:${slug}`, () => computeTeamDetailBySlug(slug));
}

function computeTeamDetailBySlug(slug: string) {
  const team = db.select().from(teams).where(eq(teams.slug, slug)).get();
  if (!team) return null;

  const owner = db.select().from(users).where(eq(users.id, team.ownerId)).get() ?? null;

  const memberRows = db
    .select({
      member: teamMembers,
      user: users,
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, team.id))
    .all();

  const members = memberRows.map(({ member, user }) => ({
    ...member,
    user: user
      ? { id: user.id, name: user.name, displayName: user.displayName, email: user.email }
      : null,
  }));

  const teamSessions = db
    .select()
    .from(sessions)
    .where(eq(sessions.teamId, team.id))
    .orderBy(desc(sessions.date), desc(sessions.createdAt))
    .all();

  const sessionIds = teamSessions.map((s) => s.id);
  const teamGames =
    sessionIds.length > 0
      ? db
          .select()
          .from(games)
          .where(inArray(games.sessionId, sessionIds))
          .orderBy(desc(games.createdAt))
          .all()
      : [];

  const gamesBySession = new Map<string, typeof teamGames>();
  for (const g of teamGames) {
    const list = gamesBySession.get(g.sessionId) || [];
    list.push(g);
    gamesBySession.set(g.sessionId, list);
  }

  const storedPairStats = db
    .select()
    .from(pairStats)
    .where(eq(pairStats.teamId, team.id))
    .all();

  const labelMap = buildPlayerLabelMap(members);
  const playerStats = calculateTeamPlayerStats(teamGames, members);
  const winningPairs = calculateWinningPairs(teamGames, labelMap);

  return {
    team,
    owner,
    members,
    sessions: teamSessions.map((s) => ({
      ...s,
      games: gamesBySession.get(s.id) || [],
    })),
    games: teamGames,
    playerStats,
    winningPairs,
    storedPairStats,
  };
}
