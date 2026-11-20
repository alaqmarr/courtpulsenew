import { relations } from "drizzle-orm";
import {
  achievements,
  activities,
  auctionBids,
  calendarEvents,
  eloHistory,
  games,
  matchEvents,
  notifications,
  otpTokens,
  pairStats,
  payments,
  sessionPairHistory,
  sessionParticipants,
  sessionPlayerStats,
  sessions,
  stages,
  teamMembers,
  teams,
  tournamentEnrollments,
  tournamentFairPlayLogs,
  tournamentGames,
  tournamentMembers,
  tournamentPlayers,
  tournamentPoints,
  tournaments,
  tournamentTeams,
  userAchievements,
  users,
} from "./schema.tables";

export const usersRelations = relations(users, ({ many }) => ({
  teamsOwned: many(teams),
  tournamentsOwned: many(tournaments),
  memberships: many(teamMembers),
  payments: many(payments),
  notifications: many(notifications),
  activities: many(activities),
  otpTokens: many(otpTokens),
  userAchievements: many(userAchievements),
  eloHistory: many(eloHistory),
}));

export const otpTokensRelations = relations(otpTokens, ({ one }) => ({
  user: one(users, { fields: [otpTokens.userId], references: [users.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
  members: many(teamMembers),
  sessions: many(sessions),
  pairStats: many(pairStats),
  tournamentTeams: many(tournamentTeams),
  calendarEvents: many(calendarEvents),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  team: one(teams, { fields: [sessions.teamId], references: [teams.id] }),
  games: many(games),
  participants: many(sessionParticipants),
  playerStats: many(sessionPlayerStats),
  pairHistory: many(sessionPairHistory),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  session: one(sessions, { fields: [games.sessionId], references: [sessions.id] }),
  events: many(matchEvents),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  owner: one(users, { fields: [tournaments.ownerId], references: [users.id] }),
  stages: many(stages),
  tournamentTeams: many(tournamentTeams),
  tournamentMembers: many(tournamentMembers),
  tournamentPlayers: many(tournamentPlayers),
  enrollments: many(tournamentEnrollments),
  games: many(tournamentGames),
  calendarEvents: many(calendarEvents),
  auctionBids: many(auctionBids),
  fairPlayLogs: many(tournamentFairPlayLogs),
}));

export const tournamentTeamsRelations = relations(tournamentTeams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentTeams.tournamentId],
    references: [tournaments.id],
  }),
  team: one(teams, { fields: [tournamentTeams.teamId], references: [teams.id] }),
  players: many(tournamentPlayers),
}));

export const tournamentGamesRelations = relations(tournamentGames, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentGames.tournamentId],
    references: [tournaments.id],
  }),
  stage: one(stages, { fields: [tournamentGames.stageId], references: [stages.id] }),
  teamA: one(tournamentTeams, {
    fields: [tournamentGames.teamAId],
    references: [tournamentTeams.id],
  }),
  teamB: one(tournamentTeams, {
    fields: [tournamentGames.teamBId],
    references: [tournamentTeams.id],
  }),
  points: many(tournamentPoints),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));
