import { desc, eq, inArray } from "drizzle-orm";
import { withCache } from "@courtpulse/connections/cache.connection";
import {
  db,
  teamMembers,
  teams,
  tournamentTeams,
  tournaments,
} from "@courtpulse/database";

export interface NavSidebarData {
  teams: { id: string; name: string; slug: string }[];
  tournaments: { id: string; name: string; slug: string }[];
}

export async function getNavSidebarData(userId: string): Promise<NavSidebarData> {
  return withCache(`nav:${userId}`, () => {
    const ownedTeams = db
      .select({ id: teams.id, name: teams.name, slug: teams.slug })
      .from(teams)
      .where(eq(teams.ownerId, userId))
      .orderBy(desc(teams.createdAt))
      .all();

    const memberLinks = db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .all();

    const memberTeamIds = memberLinks.map((m) => m.teamId);
    const memberTeams =
      memberTeamIds.length > 0
        ? db
            .select({ id: teams.id, name: teams.name, slug: teams.slug })
            .from(teams)
            .where(inArray(teams.id, memberTeamIds))
            .all()
        : [];

    const teamsMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const t of ownedTeams) teamsMap.set(t.id, t);
    for (const t of memberTeams) {
      if (!teamsMap.has(t.id)) teamsMap.set(t.id, t);
    }

    const allTeamIds = Array.from(teamsMap.keys());

    const ownedTournaments = db
      .select({ id: tournaments.id, name: tournaments.name, slug: tournaments.slug })
      .from(tournaments)
      .where(eq(tournaments.ownerId, userId))
      .orderBy(desc(tournaments.createdAt))
      .all();

    const linkedTournaments =
      allTeamIds.length > 0
        ? db
            .select({
              id: tournaments.id,
              name: tournaments.name,
              slug: tournaments.slug,
            })
            .from(tournamentTeams)
            .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
            .where(inArray(tournamentTeams.teamId, allTeamIds))
            .all()
        : [];

    const tournamentsMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const t of ownedTournaments) tournamentsMap.set(t.id, t);
    for (const t of linkedTournaments) {
      if (!tournamentsMap.has(t.id)) tournamentsMap.set(t.id, t);
    }

    return {
      teams: Array.from(teamsMap.values()),
      tournaments: Array.from(tournamentsMap.values()),
    };
  });
}
