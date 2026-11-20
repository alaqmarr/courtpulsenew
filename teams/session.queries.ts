import { desc, eq } from "drizzle-orm";
import { withCache } from "@courtpulse/connections/cache.connection";
import {
  db,
  games,
  sessionPairHistory,
  sessionParticipants,
  sessionPlayerStats,
  sessions,
  teamMembers,
  teams,
  users,
} from "@courtpulse/database";
import {
  buildPlayerLabelMap,
  calculateTeamPlayerStats,
  getMemberDisplayName,
} from "@courtpulse/helpers/stats.helpers";

export async function getSessionDetail(teamSlug: string, sessionSlug: string) {
  return withCache(`session:${teamSlug}:${sessionSlug}`, () =>
    computeSessionDetail(teamSlug, sessionSlug)
  );
}

function computeSessionDetail(teamSlug: string, sessionSlug: string) {
  const team = db.select().from(teams).where(eq(teams.slug, teamSlug)).get();
  if (!team) return null;

  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.slug, sessionSlug))
    .get();

  if (!session || session.teamId !== team.id) return null;

  const memberRows = db
    .select({ member: teamMembers, user: users })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, team.id))
    .all();

  const participantRows = db
    .select()
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, session.id))
    .all();
  const participantMap = new Map(
    participantRows.map((p) => [p.memberId, p.isSelected])
  );

  const allMembers = memberRows.map(({ member, user }) => ({
    id: member.id,
    userId: member.userId,
    email: member.email,
    role: member.role,
    canCreateSessions: member.canCreateSessions,
    canCreateGames: member.canCreateGames,
    canScoreGames: member.canScoreGames,
    canManagePlayers: member.canManagePlayers,
    displayName: getMemberDisplayName({
      email: member.email,
      displayName: member.displayName,
      user,
    }),
    isActive: member.isActive !== false,
    isPresent:
      participantRows.length === 0
        ? true
        : participantMap.get(member.id) ?? false,
    user,
  }));

  // Inactive players stay in past stats/labels, but never appear in selection lists
  const members = allMembers.filter((m) => m.isActive);

  const labelMap = buildPlayerLabelMap(allMembers);
  const labelObject = Object.fromEntries(labelMap.entries());

  const sessionGames = db
    .select()
    .from(games)
    .where(eq(games.sessionId, session.id))
    .orderBy(desc(games.createdAt))
    .all();

  const storedPlayerStats = db
    .select()
    .from(sessionPlayerStats)
    .where(eq(sessionPlayerStats.sessionId, session.id))
    .all();

  const pairHistory = db
    .select()
    .from(sessionPairHistory)
    .where(eq(sessionPairHistory.sessionId, session.id))
    .all();

  const sessionStandings = calculateTeamPlayerStats(sessionGames, allMembers);

  return {
    team,
    session,
    allMembers,
    members,
    labelMap: labelObject,
    games: sessionGames,
    storedPlayerStats,
    pairHistory,
    sessionStandings,
  };
}
