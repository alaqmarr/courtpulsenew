import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
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

export type UserRecord = InferSelectModel<typeof users>;
export type NewUserRecord = InferInsertModel<typeof users>;
export type OtpTokenRecord = InferSelectModel<typeof otpTokens>;
export type TeamRecord = InferSelectModel<typeof teams>;
export type TeamMemberRecord = InferSelectModel<typeof teamMembers>;
export type SessionRecord = InferSelectModel<typeof sessions>;
export type SessionParticipantRecord = InferSelectModel<typeof sessionParticipants>;
export type SessionPlayerStatRecord = InferSelectModel<typeof sessionPlayerStats>;
export type SessionPairHistoryRecord = InferSelectModel<typeof sessionPairHistory>;
export type GameRecord = InferSelectModel<typeof games>;
export type MatchEventRecord = InferSelectModel<typeof matchEvents>;
export type PairStatRecord = InferSelectModel<typeof pairStats>;
export type TournamentRecord = InferSelectModel<typeof tournaments>;
export type StageRecord = InferSelectModel<typeof stages>;
export type TournamentTeamRecord = InferSelectModel<typeof tournamentTeams>;
export type TournamentMemberRecord = InferSelectModel<typeof tournamentMembers>;
export type TournamentPlayerRecord = InferSelectModel<typeof tournamentPlayers>;
export type TournamentEnrollmentRecord = InferSelectModel<typeof tournamentEnrollments>;
export type TournamentGameRecord = InferSelectModel<typeof tournamentGames>;
export type TournamentPointRecord = InferSelectModel<typeof tournamentPoints>;
export type AuctionBidRecord = InferSelectModel<typeof auctionBids>;
export type TournamentFairPlayLogRecord = InferSelectModel<typeof tournamentFairPlayLogs>;
export type AchievementRecord = InferSelectModel<typeof achievements>;
export type UserAchievementRecord = InferSelectModel<typeof userAchievements>;
export type EloHistoryRecord = InferSelectModel<typeof eloHistory>;
export type PaymentRecord = InferSelectModel<typeof payments>;
export type NotificationRecord = InferSelectModel<typeof notifications>;
export type ActivityRecord = InferSelectModel<typeof activities>;
export type CalendarEventRecord = InferSelectModel<typeof calendarEvents>;
