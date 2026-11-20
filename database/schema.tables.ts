import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIERS,
  ACTIVITY_TYPES,
  AUCTION_STATUSES,
  ENROLLMENT_PAYMENT_MODES,
  ENROLLMENT_STATUSES,
  FAIR_PLAY_LOG_TYPES,
  GAME_WINNERS,
  OTP_PURPOSES,
  PACKAGE_TYPES,
  PAYMENT_TYPES,
  PLAYER_AUCTION_STATUSES,
  TEAM_ROLES,
  TOURNAMENT_GAME_STATUSES,
  WINNING_TEAMS,
} from "./schema.enums";

const nowMs = () => new Date();

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    mustResetPassword: integer("must_reset_password", { mode: "boolean" })
      .notNull()
      .default(false),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp_ms" }),
    name: text("name"),
    image: text("image"),
    avatarUrl: text("avatar_url"),
    displayName: text("display_name"),
    bio: text("bio"),
    eloRating: integer("elo_rating").notNull().default(1200),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
    points: integer("points").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    packageType: text("package_type", { enum: PACKAGE_TYPES })
      .notNull()
      .default("FREE"),
    teamQuota: integer("team_quota").notNull().default(1),
    tournamentQuota: integer("tournament_quota").notNull().default(1),
    teamCount: integer("team_count").notNull().default(0),
    tournamentCount: integer("tournament_count").notNull().default(0),
    planExpiresAt: integer("plan_expires_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

export const otpTokens = sqliteTable(
  "otp_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    purpose: text("purpose", { enum: OTP_PURPOSES }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("otp_tokens_email_purpose_idx").on(table.email, table.purpose),
    index("otp_tokens_user_idx").on(table.userId),
  ]
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
    gamesPlayed: integer("games_played").notNull().default(0),
    gamesWon: integer("games_won").notNull().default(0),
  },
  (table) => [index("teams_owner_idx").on(table.ownerId)]
);

export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name"),
    email: text("email").notNull(),
    role: text("role", { enum: TEAM_ROLES }).notNull().default("MEMBER"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("team_members_team_idx").on(table.teamId),
    index("team_members_email_idx").on(table.email),
    index("team_members_user_idx").on(table.userId),
    uniqueIndex("team_members_team_email_uq").on(table.teamId, table.email),
  ]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name"),
    date: integer("date", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("sessions_team_idx").on(table.teamId)]
);

export const sessionParticipants = sqliteTable(
  "session_participants",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => teamMembers.id, { onDelete: "cascade" }),
    isSelected: integer("is_selected", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (table) => [
    index("session_participants_session_idx").on(table.sessionId),
    uniqueIndex("session_participants_uq").on(table.sessionId, table.memberId),
  ]
);

export const sessionPlayerStats = sqliteTable(
  "session_player_stats",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    player: text("player").notNull(),
    plays: integer("plays").notNull().default(0),
    pointDiff: integer("point_diff").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("session_player_stats_session_idx").on(table.sessionId),
    uniqueIndex("session_player_stats_uq").on(table.sessionId, table.player),
  ]
);

export const sessionPairHistory = sqliteTable(
  "session_pair_history",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    playerA: text("player_a").notNull(),
    playerB: text("player_b").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("session_pair_history_session_idx").on(table.sessionId)]
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    teamAPlayers: text("team_a_players", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    teamBPlayers: text("team_b_players", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    teamAScore: integer("team_a_score").notNull().default(0),
    teamBScore: integer("team_b_score").notNull().default(0),
    winner: text("winner", { enum: GAME_WINNERS }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("games_session_idx").on(table.sessionId)]
);

export const matchEvents = sqliteTable(
  "match_events",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    playerId: text("player_id"),
    scoreA: integer("score_a").notNull().default(0),
    scoreB: integer("score_b").notNull().default(0),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
    timestamp: integer("timestamp", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("match_events_game_idx").on(table.gameId)]
);

export const pairStats = sqliteTable(
  "pair_stats",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerA: text("player_a").notNull(),
    playerB: text("player_b").notNull(),
    plays: integer("plays").notNull().default(0),
    wins: integer("wins").notNull().default(0),
  },
  (table) => [
    uniqueIndex("pair_stats_team_pair_uq").on(
      table.teamId,
      table.playerA,
      table.playerB
    ),
    index("pair_stats_team_idx").on(table.teamId),
  ]
);

export const tournaments = sqliteTable(
  "tournaments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    minGamesPerPlayer: integer("min_games_per_player").notNull().default(0),
    bannerUrl: text("banner_url"),
    thumbnailUrl: text("thumbnail_url"),
    description: text("description"),
    rules: text("rules"),
    startDate: integer("start_date", { mode: "timestamp_ms" }),
    endDate: integer("end_date", { mode: "timestamp_ms" }),
    matchDays: text("match_days", { mode: "json" }).$type<string[] | null>(),
    courts: integer("courts").notNull().default(1),
    entryFee: integer("entry_fee").notNull().default(0),
    auctionPurse: integer("auction_purse").notNull().default(10000),
    paymentUpi: text("payment_upi"),
    paymentQrCode: text("payment_qr_code"),
    cashContactName: text("cash_contact_name"),
    cashContactNumber: text("cash_contact_number"),
    contactPhone: text("contact_phone"),
    useCustomStats: integer("use_custom_stats", { mode: "boolean" })
      .notNull()
      .default(false),
    galleryImages: text("gallery_images", { mode: "json" }).$type<string[] | null>(),
    adminToken: text("admin_token"),
    winPoints: integer("win_points").notNull().default(2),
    drawPoints: integer("draw_points").notNull().default(1),
    lossPoints: integer("loss_points").notNull().default(0),
    pointsToWin: integer("points_to_win").notNull().default(21),
    auctionBasePrice: integer("auction_base_price").notNull().default(500),
    auctionBidIncrement: integer("auction_bid_increment").notNull().default(100),
    auctionMinSquadSize: integer("auction_min_squad_size").notNull().default(4),
    auctionMaxSquadSize: integer("auction_max_squad_size").notNull().default(10),
    auctionStatus: text("auction_status", { enum: AUCTION_STATUSES })
      .notNull()
      .default("NOT_STARTED"),
    currentAuctionPlayerId: text("current_auction_player_id"),
    currentHighestBid: integer("current_highest_bid").notNull().default(0),
    currentHighestTeamId: text("current_highest_team_id"),
    registrationOpen: integer("registration_open", { mode: "boolean" })
      .notNull()
      .default(true),
    fairPlayPenaltyPoints: integer("fair_play_penalty_points")
      .notNull()
      .default(1),
  },
  (table) => [index("tournaments_owner_idx").on(table.ownerId)]
);

export const stages = sqliteTable(
  "stages",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("stages_tournament_idx").on(table.tournamentId)]
);

export const tournamentTeams = sqliteTable(
  "tournament_teams",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#22c55e"),
    logoUrl: text("logo_url"),
    ownerName: text("owner_name"),
    ownerEmail: text("owner_email"),
    ownerToken: text("owner_token"),
    purseBudget: integer("purse_budget"),
    fairPlayScore: integer("fair_play_score").notNull().default(100),
    matchesPlayed: integer("matches_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    points: integer("points").notNull().default(0),
    purseSpent: integer("purse_spent").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("tournament_teams_tournament_idx").on(table.tournamentId)]
);

export const tournamentMembers = sqliteTable(
  "tournament_members",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: TEAM_ROLES }).notNull().default("MANAGER"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("tournament_members_tournament_idx").on(table.tournamentId),
    uniqueIndex("tournament_members_uq").on(table.tournamentId, table.userId),
  ]
);

export const tournamentPlayers = sqliteTable(
  "tournament_players",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => tournamentTeams.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email"),
    mobile: text("mobile"),
    category: text("category").notNull().default("All-Rounder"),
    skillTier: text("skill_tier").notNull().default("Tier B"),
    basePrice: integer("base_price").notNull().default(500),
    soldPrice: integer("sold_price").notNull().default(0),
    auctionStatus: text("auction_status", { enum: PLAYER_AUCTION_STATUSES })
      .notNull()
      .default("PENDING"),
    auctionOrder: integer("auction_order").notNull().default(0),
    isCaptain: integer("is_captain", { mode: "boolean" }).notNull().default(false),
    matchesPlayed: integer("matches_played").notNull().default(0),
    customRating: integer("custom_rating"),
    customMatches: integer("custom_matches"),
    customWins: integer("custom_wins"),
    isCheckedIn: integer("is_checked_in", { mode: "boolean" })
      .notNull()
      .default(false),
    checkInTime: integer("check_in_time", { mode: "timestamp_ms" }),
    fairPlayNotes: text("fair_play_notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("tournament_players_tournament_idx").on(table.tournamentId),
    index("tournament_players_team_idx").on(table.teamId),
  ]
);

export const tournamentEnrollments = sqliteTable(
  "tournament_enrollments",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile").notNull(),
    category: text("category").notNull().default("All-Rounder"),
    skillTier: text("skill_tier").notNull().default("Tier B"),
    notes: text("notes"),
    paymentMode: text("payment_mode", { enum: ENROLLMENT_PAYMENT_MODES })
      .notNull()
      .default("UPI"),
    paymentScreenshotUrl: text("payment_screenshot_url"),
    transactionId: text("transaction_id"),
    status: text("status", { enum: ENROLLMENT_STATUSES })
      .notNull()
      .default("PENDING"),
    adminNotes: text("admin_notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("tournament_enrollments_tournament_idx").on(table.tournamentId)]
);

export const tournamentGames = sqliteTable(
  "tournament_games",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    stageId: text("stage_id").references(() => stages.id, {
      onDelete: "set null",
    }),
    teamAId: text("team_a_id")
      .notNull()
      .references(() => tournamentTeams.id, { onDelete: "cascade" }),
    teamBId: text("team_b_id")
      .notNull()
      .references(() => tournamentTeams.id, { onDelete: "cascade" }),
    teamAPlayers: text("team_a_players", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    teamBPlayers: text("team_b_players", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    round: integer("round").notNull().default(1),
    courtNumber: integer("court_number").notNull().default(1),
    slotLabel: text("slot_label"),
    isFairPlayCatchup: integer("is_fair_play_catchup", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status", { enum: TOURNAMENT_GAME_STATUSES })
      .notNull()
      .default("SCHEDULED"),
    teamAScore: integer("team_a_score").notNull().default(0),
    teamBScore: integer("team_b_score").notNull().default(0),
    currentSet: integer("current_set").notNull().default(1),
    winningTeam: text("winning_team", { enum: WINNING_TEAMS }),
    scheduleTime: integer("schedule_time", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("tournament_games_tournament_idx").on(table.tournamentId),
    index("tournament_games_team_a_idx").on(table.teamAId),
    index("tournament_games_team_b_idx").on(table.teamBId),
  ]
);

export const tournamentPoints = sqliteTable(
  "tournament_points",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => tournamentGames.id, { onDelete: "cascade" }),
    scorerId: text("scorer_id"),
    pointType: text("point_type").notNull(),
    tournamentTeamId: text("tournament_team_id").references(
      () => tournamentTeams.id,
      { onDelete: "set null" }
    ),
    timestamp: integer("timestamp", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("tournament_points_game_idx").on(table.gameId)]
);

export const auctionBids = sqliteTable(
  "auction_bids",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => tournamentPlayers.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => tournamentTeams.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    bidderRole: text("bidder_role").notNull().default("OWNER"),
    bidderLabel: text("bidder_label").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("auction_bids_tournament_idx").on(table.tournamentId),
    index("auction_bids_player_idx").on(table.playerId),
  ]
);

export const tournamentFairPlayLogs = sqliteTable(
  "tournament_fair_play_logs",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => tournamentTeams.id, {
      onDelete: "cascade",
    }),
    playerId: text("player_id").references(() => tournamentPlayers.id, {
      onDelete: "cascade",
    }),
    type: text("type", { enum: FAIR_PLAY_LOG_TYPES })
      .notNull()
      .default("BONUS"),
    pointsDelta: integer("points_delta").notNull().default(0),
    reason: text("reason").notNull(),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("tournament_fair_play_logs_tournament_idx").on(table.tournamentId),
  ]
);

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category", { enum: ACHIEVEMENT_CATEGORIES }).notNull(),
  tier: text("tier", { enum: ACHIEVEMENT_TIERS }).notNull(),
  criteria: text("criteria", { mode: "json" })
    .$type<{ type: string; value: number }>()
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(nowMs),
});

export const userAchievements = sqliteTable(
  "user_achievements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: integer("unlocked_at", { mode: "timestamp_ms" }),
    progress: integer("progress").notNull().default(0),
  },
  (table) => [
    index("user_achievements_user_idx").on(table.userId),
    uniqueIndex("user_achievements_uq").on(table.userId, table.achievementId),
  ]
);

export const eloHistory = sqliteTable(
  "elo_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    change: integer("change").notNull(),
    gameId: text("game_id"),
    timestamp: integer("timestamp", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("elo_history_user_idx").on(table.userId)]
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: PAYMENT_TYPES }).notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    referenceId: text("reference_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("payments_user_idx").on(table.userId)]
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    link: text("link"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("notifications_user_idx").on(table.userId)]
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
    refId: text("ref_id"),
    message: text("message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [
    index("activities_user_idx").on(table.userId),
    index("activities_type_idx").on(table.type),
  ]
);

export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    startTime: integer("start_time", { mode: "timestamp_ms" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp_ms" }),
    location: text("location"),
    tournamentId: text("tournament_id").references(() => tournaments.id, {
      onDelete: "cascade",
    }),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(nowMs),
  },
  (table) => [index("calendar_events_start_idx").on(table.startTime)]
);
