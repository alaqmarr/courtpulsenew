import { asc, desc, eq } from "drizzle-orm";
import { withCache } from "@courtpulse/connections/cache.connection";
import {
  auctionBids,
  db,
  stages,
  teams,
  tournamentEnrollments,
  tournamentFairPlayLogs,
  tournamentGames,
  tournamentMembers,
  tournamentPlayers,
  tournamentPoints,
  tournaments,
  tournamentTeams,
  users,
} from "@courtpulse/database";
import {
  computeTournamentAnalytics,
  type TournamentPlayerStatRow,
  type TournamentStandingRow,
} from "./tournament.helpers";

export type { TournamentPlayerStatRow, TournamentStandingRow };

export async function getTournamentDetailBySlug(slug: string) {
  return withCache(`tournament:${slug}`, () => computeTournamentDetailBySlug(slug));
}

function computeTournamentDetailBySlug(slug: string) {
  const tournament = db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .get();
  if (!tournament) return null;

  const owner =
    db.select().from(users).where(eq(users.id, tournament.ownerId)).get() ?? null;

  const tournamentStages = db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, tournament.id))
    .orderBy(asc(stages.order), asc(stages.createdAt))
    .all();

  const enrolledRows = db
    .select({
      enrollment: tournamentTeams,
      clubTeam: teams,
    })
    .from(tournamentTeams)
    .leftJoin(teams, eq(tournamentTeams.teamId, teams.id))
    .where(eq(tournamentTeams.tournamentId, tournament.id))
    .orderBy(asc(tournamentTeams.createdAt))
    .all();

  const playersList = db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournament.id))
    .orderBy(desc(tournamentPlayers.soldPrice), asc(tournamentPlayers.name))
    .all();

  const enrollmentsList = db
    .select()
    .from(tournamentEnrollments)
    .where(eq(tournamentEnrollments.tournamentId, tournament.id))
    .orderBy(desc(tournamentEnrollments.createdAt))
    .all();

  const gamesList = db
    .select()
    .from(tournamentGames)
    .where(eq(tournamentGames.tournamentId, tournament.id))
    .orderBy(asc(tournamentGames.round), asc(tournamentGames.courtNumber), desc(tournamentGames.createdAt))
    .all();

  const bidsList = db
    .select()
    .from(auctionBids)
    .where(eq(auctionBids.tournamentId, tournament.id))
    .orderBy(desc(auctionBids.createdAt))
    .limit(60)
    .all();

  const fairPlayLogs = db
    .select()
    .from(tournamentFairPlayLogs)
    .where(eq(tournamentFairPlayLogs.tournamentId, tournament.id))
    .orderBy(desc(tournamentFairPlayLogs.createdAt))
    .all();

  const membersRows = db
    .select({
      id: tournamentMembers.id,
      userId: tournamentMembers.userId,
      role: tournamentMembers.role,
      name: users.displayName,
      email: users.email,
    })
    .from(tournamentMembers)
    .leftJoin(users, eq(tournamentMembers.userId, users.id))
    .where(eq(tournamentMembers.tournamentId, tournament.id))
    .all();

  // Point logs per game for live & recent scoring inspection
  const gameIds = new Set(gamesList.map((g) => g.id));
  const pointsList =
    gameIds.size > 0
      ? db
          .select()
          .from(tournamentPoints)
          .orderBy(desc(tournamentPoints.timestamp))
          .all()
          .filter((pt) => gameIds.has(pt.gameId))
      : [];

  const { standings, playerStats, fairPlaySummary } = computeTournamentAnalytics({
    tournament,
    enrolledTeams: enrolledRows.map(({ enrollment, clubTeam }) => ({
      enrollment,
      clubTeamName: clubTeam?.name ?? null,
      clubTeamSlug: clubTeam?.slug ?? null,
    })),
    players: playersList,
    games: gamesList,
    fairPlayLogs,
  });

  const existingClubIds = new Set(
    enrolledRows.map((r) => r.enrollment.teamId).filter(Boolean)
  );
  const allClubTeams = db.select().from(teams).orderBy(asc(teams.name)).all();

  const enrolledTeams = enrolledRows.map(({ enrollment, clubTeam }) => {
    const squad = playersList.filter((p) => p.teamId === enrollment.id);
    const purseSpent = squad.reduce((sum, p) => sum + p.soldPrice, 0);
    const purseBudget = enrollment.purseBudget ?? tournament.auctionPurse;
    return {
      id: enrollment.id,
      teamId: enrollment.teamId,
      teamName: enrollment.name || clubTeam?.name || "Team",
      color: enrollment.color || "#059669",
      logoUrl: enrollment.logoUrl ?? null,
      teamSlug: clubTeam?.slug ?? null,
      ownerName: enrollment.ownerName ?? null,
      ownerEmail: enrollment.ownerEmail ?? null,
      ownerToken: enrollment.ownerToken ?? null,
      purseBudget,
      purseSpent,
      purseRemaining: Math.max(0, purseBudget - purseSpent),
      fairPlayScore: enrollment.fairPlayScore,
      squadCount: squad.length,
    };
  });

  return {
    tournament,
    owner,
    stages: tournamentStages,
    enrolledTeams,
    availableTeams: allClubTeams.filter((t) => !existingClubIds.has(t.id)),
    players: playersList,
    enrollments: enrollmentsList,
    games: gamesList,
    pointsLog: pointsList.slice(0, 100),
    bids: bidsList,
    fairPlayLogs,
    members: membersRows,
    standings,
    playerStats,
    fairPlaySummary,
  };
}

export function getLiveAuctionSnapshot(slug: string) {
  const tournament = db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .get();
  if (!tournament) return null;

  const teamsRows = db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournament.id))
    .orderBy(asc(tournamentTeams.createdAt))
    .all();

  const playersRows = db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournament.id))
    .orderBy(asc(tournamentPlayers.auctionOrder), asc(tournamentPlayers.name))
    .all();

  const bidsRows = db
    .select()
    .from(auctionBids)
    .where(eq(auctionBids.tournamentId, tournament.id))
    .orderBy(desc(auctionBids.createdAt))
    .limit(25)
    .all();

  const currentPlayer = tournament.currentAuctionPlayerId
    ? playersRows.find((p) => p.id === tournament.currentAuctionPlayerId) ?? null
    : null;

  const currentBids = currentPlayer
    ? bidsRows.filter((b) => b.playerId === currentPlayer.id)
    : [];

  return {
    auctionStatus: tournament.auctionStatus,
    auctionPurse: tournament.auctionPurse,
    auctionBasePrice: tournament.auctionBasePrice,
    auctionBidIncrement: tournament.auctionBidIncrement,
    auctionMinSquadSize: tournament.auctionMinSquadSize,
    auctionMaxSquadSize: tournament.auctionMaxSquadSize,
    currentHighestBid: tournament.currentHighestBid,
    currentHighestTeamId: tournament.currentHighestTeamId,
    currentPlayer,
    currentBids,
    recentBids: bidsRows,
    teams: teamsRows.map((t) => {
      const squad = playersRows.filter((p) => p.teamId === t.id);
      const spent = squad.reduce((sum, p) => sum + p.soldPrice, 0);
      const budget = t.purseBudget ?? tournament.auctionPurse;
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        ownerName: t.ownerName,
        squadCount: squad.length,
        purseBudget: budget,
        purseSpent: spent,
        purseRemaining: Math.max(0, budget - spent),
      };
    }),
    players: playersRows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      skillTier: p.skillTier,
      basePrice: p.basePrice,
      soldPrice: p.soldPrice,
      teamId: p.teamId,
      isCaptain: p.isCaptain,
      isCheckedIn: p.isCheckedIn,
      auctionStatus: p.auctionStatus,
      customRating: p.customRating,
    })),
  };
}
