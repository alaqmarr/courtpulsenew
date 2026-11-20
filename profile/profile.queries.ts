import { asc, desc, eq, inArray } from "drizzle-orm";
import { withCache } from "@courtpulse/connections/cache.connection";
import {
  achievements,
  db,
  eloHistory,
  games,
  sessions,
  teamMembers,
  teams,
  tournamentPlayers,
  users,
} from "@courtpulse/database";
import { matchesUserIdentity } from "@courtpulse/helpers/stats.helpers";

export interface AchievementProgress {
  id: string;
  key: string;
  name: string;
  description: string;
  tier: string;
  category: string;
  target: number;
  current: number;
  unlocked: boolean;
}

export async function getProfileData(userId: string) {
  return withCache(`profile:${userId}`, () => computeProfileData(userId));
}

function computeProfileData(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return null;

  const memberships = db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .all();

  const ownedTeams = db
    .select()
    .from(teams)
    .where(eq(teams.ownerId, user.id))
    .all();

  const teamIds = Array.from(
    new Set([...memberships.map((m) => m.teamId), ...ownedTeams.map((t) => t.id)])
  );

  const teamSessions =
    teamIds.length > 0
      ? db.select().from(sessions).where(inArray(sessions.teamId, teamIds)).all()
      : [];
  const sessionIds = teamSessions.map((s) => s.id);

  const allGames =
    sessionIds.length > 0
      ? db
          .select()
          .from(games)
          .where(inArray(games.sessionId, sessionIds))
          .orderBy(asc(games.createdAt))
          .all()
      : [];

  let totalPlayed = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  let perfectGames = 0;
  const uniqueTeammates = new Set<string>();

  for (const g of allGames) {
    if (!g.winner) continue;
    const inA = g.teamAPlayers.some((p) =>
      matchesUserIdentity(p, user.email, user.name, user.displayName)
    );
    const inB = g.teamBPlayers.some((p) =>
      matchesUserIdentity(p, user.email, user.name, user.displayName)
    );
    if (!inA && !inB) continue;

    totalPlayed += 1;
    const ownSide = inA ? g.teamAPlayers : g.teamBPlayers;
    for (const mate of ownSide) {
      if (!matchesUserIdentity(mate, user.email, user.name, user.displayName)) {
        uniqueTeammates.add(mate.toLowerCase());
      }
    }

    const won = (g.winner === "A" && inA) || (g.winner === "B" && inB);
    const oppScore = inA ? g.teamBScore : g.teamAScore;
    const ownScore = inA ? g.teamAScore : g.teamBScore;

    if (won) {
      totalWins += 1;
      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      if (ownScore > 0 && oppScore === 0) perfectGames += 1;
    } else {
      totalLosses += 1;
      currentStreak = 0;
    }
  }

  const tournamentEntries = db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.userId, user.id))
    .all();

  const allAchievements = db
    .select()
    .from(achievements)
    .orderBy(asc(achievements.createdAt))
    .all();

  const metricByType: Record<string, number> = {
    games_played: totalPlayed,
    wins: totalWins,
    win_streak: bestStreak,
    tournaments_joined: tournamentEntries.length,
    tournaments_won: 0,
    teams_joined: teamIds.length,
    unique_teammates: uniqueTeammates.size,
    points_scored: totalWins * 10 + totalLosses * 2,
    perfect_game: perfectGames,
  };

  const achievementProgress: AchievementProgress[] = allAchievements.map((a) => {
    const target = Number(a.criteria?.value ?? 1);
    const current = metricByType[a.criteria?.type ?? ""] ?? 0;
    return {
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      tier: a.tier,
      category: a.category,
      target,
      current: Math.min(target, current),
      unlocked: current >= target,
    };
  });

  const history = db
    .select()
    .from(eloHistory)
    .where(eq(eloHistory.userId, user.id))
    .orderBy(desc(eloHistory.timestamp))
    .limit(20)
    .all();

  return {
    user,
    stats: {
      totalPlayed,
      totalWins,
      totalLosses,
      bestStreak,
      winRate:
        totalPlayed > 0
          ? Number(((totalWins / totalPlayed) * 100).toFixed(1))
          : 0,
      uniqueTeammates: uniqueTeammates.size,
    },
    achievements: achievementProgress,
    eloHistory: history,
  };
}
