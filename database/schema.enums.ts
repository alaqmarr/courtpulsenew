export const PACKAGE_TYPES = [
  "FREE",
  "TEAM_PACKAGE",
  "TOURNAMENT_PACKAGE",
  "PRO_PACKAGE",
] as const;

export const TEAM_ROLES = ["OWNER", "MANAGER", "MEMBER"] as const;

export const GAME_WINNERS = ["A", "B"] as const;

export const WINNING_TEAMS = ["A", "B", "DRAW"] as const;

export const TOURNAMENT_GAME_STATUSES = [
  "SCHEDULED",
  "LIVE",
  "COMPLETED",
] as const;

export const AUCTION_STATUSES = [
  "NOT_STARTED",
  "LIVE",
  "PAUSED",
  "COMPLETED",
] as const;

export const PLAYER_AUCTION_STATUSES = [
  "PENDING",
  "ON_BLOCK",
  "SOLD",
  "UNSOLD",
] as const;

export const FAIR_PLAY_LOG_TYPES = [
  "BONUS",
  "WARNING",
  "PENALTY",
  "CATCHUP",
] as const;

export const ENROLLMENT_PAYMENT_MODES = ["UPI", "CASH"] as const;

export const ENROLLMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export const ACHIEVEMENT_CATEGORIES = [
  "GAMES",
  "WINS",
  "TOURNAMENTS",
  "SOCIAL",
  "SPECIAL",
] as const;

export const ACHIEVEMENT_TIERS = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
] as const;

export const PAYMENT_TYPES = [
  "TEAM_PURCHASE",
  "TOURNAMENT_PURCHASE",
  "PACKAGE_SUBSCRIPTION",
  "MANUAL_CREDIT",
] as const;

export const ACTIVITY_TYPES = [
  "TEAM_CREATED",
  "TOURNAMENT_CREATED",
  "GAME_PLAYED",
  "GAME_WON",
  "MEMBER_ADDED",
  "PAYMENT_MADE",
] as const;

export const OTP_PURPOSES = [
  "FIRST_LOGIN_PASSWORD",
  "PASSWORD_RESET",
  "EMAIL_VERIFY",
] as const;

export type PackageType = (typeof PACKAGE_TYPES)[number];
export type TeamRole = (typeof TEAM_ROLES)[number];
export type GameWinner = (typeof GAME_WINNERS)[number];
export type WinningTeam = (typeof WINNING_TEAMS)[number];
export type TournamentGameStatus = (typeof TOURNAMENT_GAME_STATUSES)[number];
export type AuctionStatus = (typeof AUCTION_STATUSES)[number];
export type PlayerAuctionStatus = (typeof PLAYER_AUCTION_STATUSES)[number];
export type FairPlayLogType = (typeof FAIR_PLAY_LOG_TYPES)[number];
export type EnrollmentPaymentMode = (typeof ENROLLMENT_PAYMENT_MODES)[number];
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type OtpPurpose = (typeof OTP_PURPOSES)[number];
