import "dotenv/config";
import { Pool } from "pg";
import { eq, isNull } from "drizzle-orm";
import {
  achievements,
  activities,
  calendarEvents,
  db,
  eloHistory,
  games,
  matchEvents,
  notifications,
  pairStats,
  payments,
  sessionPairHistory,
  sessionParticipants,
  sessionPlayerStats,
  sessions,
  sqlite,
  stages,
  teamMembers,
  teams,
  tournamentEnrollments,
  tournamentGames,
  tournamentMembers,
  tournamentPlayers,
  tournamentPoints,
  tournaments,
  tournamentTeams,
  userAchievements,
  users,
} from "../database";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function toNullableDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function importFromPostgres() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (!sourceUrl) throw new Error("SOURCE_DATABASE_URL is missing in .env");

  const analyticsUrl = process.env.SOURCE_ANALYTICS_DATABASE_URL;
  const mainPool = new Pool({ connectionString: sourceUrl });
  const analyticsPool = analyticsUrl
    ? new Pool({ connectionString: analyticsUrl })
    : null;

  try {
    const [
      pgUsers,
      pgTeams,
      pgTeamMembers,
      pgSessions,
      pgSessionParticipants,
      pgSessionPlayerStats,
      pgSessionPairHistory,
      pgGames,
      pgMatchEvents,
      pgPairStats,
      pgTournaments,
      pgStages,
      pgTournamentTeams,
      pgTournamentMembers,
      pgTournamentPlayers,
      pgTournamentEnrollments,
      pgTournamentGames,
      pgTournamentPoints,
      pgPayments,
      pgNotifications,
      pgActivities,
      pgCalendarEvents,
    ] = await Promise.all([
      mainPool.query(`SELECT * FROM "User"`),
      mainPool.query(`SELECT * FROM "Team"`),
      mainPool.query(`SELECT * FROM "TeamMember"`),
      mainPool.query(`SELECT * FROM "Session"`),
      mainPool.query(`SELECT * FROM "SessionParticipant"`),
      mainPool.query(`SELECT * FROM "SessionPlayerStats"`),
      mainPool.query(`SELECT * FROM "SessionPairHistory"`),
      mainPool.query(`SELECT * FROM "Game"`),
      mainPool.query(`SELECT * FROM "MatchEvent"`),
      mainPool.query(`SELECT * FROM "PairStat"`),
      mainPool.query(`SELECT * FROM "Tournament"`),
      mainPool.query(`SELECT * FROM "Stage"`),
      mainPool.query(`SELECT * FROM "TournamentTeam"`),
      mainPool.query(`SELECT * FROM "TournamentMember"`),
      mainPool.query(`SELECT * FROM "TournamentPlayer"`),
      mainPool.query(`SELECT * FROM "TournamentEnrollment"`),
      mainPool.query(`SELECT * FROM "TournamentGame"`),
      mainPool.query(`SELECT * FROM "TournamentPoint"`),
      mainPool.query(`SELECT * FROM "Payment"`),
      mainPool.query(`SELECT * FROM "Notification"`),
      mainPool.query(`SELECT * FROM "Activity"`),
      mainPool.query(`SELECT * FROM "CalendarEvent"`),
    ]);

    const pgAchievements = analyticsPool
      ? await analyticsPool.query(`SELECT * FROM "Achievement"`)
      : { rows: [], rowCount: 0 };
    const pgUserAchievements = analyticsPool
      ? await analyticsPool.query(`SELECT * FROM "UserAchievement"`)
      : { rows: [], rowCount: 0 };
    const pgEloHistory = analyticsPool
      ? await analyticsPool.query(`SELECT * FROM "EloHistory"`)
      : { rows: [], rowCount: 0 };

    const tx = sqlite.transaction(() => {
      for (const u of pgUsers.rows) {
        const email = String(u.email).toLowerCase().trim();
        db.insert(users)
          .values({
            id: String(u.id),
            email,
            passwordHash: null,
            mustResetPassword: true,
            emailVerifiedAt: null,
            name: u.name ?? null,
            image: u.image ?? null,
            avatarUrl: u.avatarUrl ?? null,
            displayName: u.displayName ?? null,
            bio: u.bio ?? null,
            eloRating: Number(u.eloRating ?? 1200),
            createdAt: toDate(u.createdAt),
            points: Number(u.points ?? 0),
            wins: Number(u.wins ?? 0),
            losses: Number(u.losses ?? 0),
            packageType: u.packageType ?? "FREE",
            teamQuota: Number(u.teamQuota ?? 1),
            tournamentQuota: Number(u.tournamentQuota ?? 1),
            teamCount: Number(u.teamCount ?? 0),
            tournamentCount: Number(u.tournamentCount ?? 0),
            planExpiresAt: toNullableDate(u.planExpiresAt),
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email,
              name: u.name ?? null,
              image: u.image ?? null,
              avatarUrl: u.avatarUrl ?? null,
              displayName: u.displayName ?? null,
              bio: u.bio ?? null,
              eloRating: Number(u.eloRating ?? 1200),
            },
          })
          .run();
      }

      for (const t of pgTeams.rows) {
        db.insert(teams)
          .values({
            id: String(t.id),
            name: String(t.name),
            slug: String(t.slug),
            ownerId: String(t.ownerId),
            createdAt: toDate(t.createdAt),
            gamesPlayed: Number(t.gamesPlayed ?? 0),
            gamesWon: Number(t.gamesWon ?? 0),
          })
          .onConflictDoUpdate({
            target: teams.id,
            set: {
              name: String(t.name),
              slug: String(t.slug),
              ownerId: String(t.ownerId),
              gamesPlayed: Number(t.gamesPlayed ?? 0),
              gamesWon: Number(t.gamesWon ?? 0),
            },
          })
          .run();
      }

      for (const m of pgTeamMembers.rows) {
        db.insert(teamMembers)
          .values({
            id: String(m.id),
            teamId: String(m.teamId),
            userId: m.userId ? String(m.userId) : null,
            displayName: m.displayName ?? null,
            email: String(m.email).toLowerCase().trim(),
            role: m.role ?? "MEMBER",
            joinedAt: toDate(m.joinedAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const s of pgSessions.rows) {
        db.insert(sessions)
          .values({
            id: String(s.id),
            slug: String(s.slug || s.id),
            teamId: String(s.teamId),
            name: s.name ?? null,
            date: toDate(s.date),
            createdAt: toDate(s.createdAt),
          })
          .onConflictDoUpdate({
            target: sessions.id,
            set: {
              slug: String(s.slug || s.id),
              name: s.name ?? null,
              date: toDate(s.date),
            },
          })
          .run();
      }

      for (const sp of pgSessionParticipants.rows) {
        db.insert(sessionParticipants)
          .values({
            id: String(sp.id),
            sessionId: String(sp.sessionId),
            memberId: String(sp.memberId),
            isSelected: Boolean(sp.isSelected),
          })
          .onConflictDoUpdate({
            target: sessionParticipants.id,
            set: { isSelected: Boolean(sp.isSelected) },
          })
          .run();
      }

      for (const sps of pgSessionPlayerStats.rows) {
        db.insert(sessionPlayerStats)
          .values({
            id: String(sps.id),
            sessionId: String(sps.sessionId),
            player: String(sps.player).toLowerCase().trim(),
            plays: Number(sps.plays ?? 0),
            pointDiff: Number(sps.pointDiff ?? 0),
            totalPoints: Number(sps.totalPoints ?? 0),
            createdAt: toDate(sps.createdAt),
            updatedAt: toDate(sps.updatedAt),
          })
          .onConflictDoUpdate({
            target: sessionPlayerStats.id,
            set: {
              plays: Number(sps.plays ?? 0),
              pointDiff: Number(sps.pointDiff ?? 0),
              totalPoints: Number(sps.totalPoints ?? 0),
              updatedAt: toDate(sps.updatedAt),
            },
          })
          .run();
      }

      for (const sph of pgSessionPairHistory.rows) {
        db.insert(sessionPairHistory)
          .values({
            id: String(sph.id),
            sessionId: String(sph.sessionId),
            playerA: String(sph.playerA).toLowerCase().trim(),
            playerB: String(sph.playerB).toLowerCase().trim(),
            createdAt: toDate(sph.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const g of pgGames.rows) {
        db.insert(games)
          .values({
            id: String(g.id),
            slug: String(g.slug),
            sessionId: String(g.sessionId),
            teamAPlayers: toStringArray(g.teamAPlayers),
            teamBPlayers: toStringArray(g.teamBPlayers),
            teamAScore: Number(g.teamAScore ?? 0),
            teamBScore: Number(g.teamBScore ?? 0),
            winner: g.winner === "A" || g.winner === "B" ? g.winner : null,
            createdAt: toDate(g.createdAt),
          })
          .onConflictDoUpdate({
            target: games.id,
            set: {
              teamAPlayers: toStringArray(g.teamAPlayers),
              teamBPlayers: toStringArray(g.teamBPlayers),
              teamAScore: Number(g.teamAScore ?? 0),
              teamBScore: Number(g.teamBScore ?? 0),
              winner: g.winner === "A" || g.winner === "B" ? g.winner : null,
            },
          })
          .run();
      }

      for (const me of pgMatchEvents.rows) {
        db.insert(matchEvents)
          .values({
            id: String(me.id),
            gameId: String(me.gameId),
            type: String(me.type),
            playerId: me.playerId ?? null,
            scoreA: Number(me.scoreA ?? 0),
            scoreB: Number(me.scoreB ?? 0),
            metadata: me.metadata ?? null,
            timestamp: toDate(me.timestamp),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const p of pgPairStats.rows) {
        db.insert(pairStats)
          .values({
            id: String(p.id),
            teamId: String(p.teamId),
            playerA: String(p.playerA),
            playerB: String(p.playerB),
            plays: Number(p.plays ?? 0),
            wins: Number(p.wins ?? 0),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const tr of pgTournaments.rows) {
        db.insert(tournaments)
          .values({
            id: String(tr.id),
            name: String(tr.name),
            slug: String(tr.slug),
            ownerId: String(tr.ownerId),
            createdAt: toDate(tr.createdAt),
            isActive: Boolean(tr.isActive),
            minGamesPerPlayer: Number(tr.minGamesPerPlayer ?? 0),
            bannerUrl: tr.bannerUrl ?? null,
            thumbnailUrl: tr.thumbnailUrl ?? null,
            description: tr.description ?? null,
            rules: tr.rules ?? null,
            startDate: toNullableDate(tr.startDate),
            endDate: toNullableDate(tr.endDate),
            matchDays: Array.isArray(tr.matchDays) ? tr.matchDays : null,
            courts: Number(tr.courts ?? 1),
            entryFee: Number(tr.entryFee ?? 0),
            auctionPurse: Number(tr.auctionPurse ?? 10000),
            paymentUpi: tr.paymentUpi ?? null,
            paymentQrCode: tr.paymentQrCode ?? null,
            cashContactName: tr.cashContactName ?? null,
            cashContactNumber: tr.cashContactNumber ?? null,
            contactPhone: tr.contactPhone ?? null,
            useCustomStats: Boolean(tr.useCustomStats),
            galleryImages: Array.isArray(tr.galleryImages) ? tr.galleryImages : null,
          })
          .onConflictDoUpdate({
            target: tournaments.id,
            set: {
              name: String(tr.name),
              isActive: Boolean(tr.isActive),
              minGamesPerPlayer: Number(tr.minGamesPerPlayer ?? 0),
              bannerUrl: tr.bannerUrl ?? null,
              thumbnailUrl: tr.thumbnailUrl ?? null,
              description: tr.description ?? null,
              rules: tr.rules ?? null,
              startDate: toNullableDate(tr.startDate),
              endDate: toNullableDate(tr.endDate),
              matchDays: Array.isArray(tr.matchDays) ? tr.matchDays : null,
              courts: Number(tr.courts ?? 1),
              entryFee: Number(tr.entryFee ?? 0),
              auctionPurse: Number(tr.auctionPurse ?? 10000),
              paymentUpi: tr.paymentUpi ?? null,
              paymentQrCode: tr.paymentQrCode ?? null,
              cashContactName: tr.cashContactName ?? null,
              cashContactNumber: tr.cashContactNumber ?? null,
              contactPhone: tr.contactPhone ?? null,
              useCustomStats: Boolean(tr.useCustomStats),
              galleryImages: Array.isArray(tr.galleryImages) ? tr.galleryImages : null,
            },
          })
          .run();
      }

      for (const st of pgStages.rows) {
        db.insert(stages)
          .values({
            id: String(st.id),
            tournamentId: String(st.tournamentId),
            name: String(st.name),
            order: Number(st.order ?? 0),
            createdAt: toDate(st.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const tt of pgTournamentTeams.rows) {
        db.insert(tournamentTeams)
          .values({
            id: String(tt.id),
            tournamentId: String(tt.tournamentId),
            teamId: tt.teamId ? String(tt.teamId) : null,
            name: String(tt.name ?? "Team"),
            color: String(tt.color ?? "#22c55e"),
            logoUrl: tt.logoUrl ?? null,
            matchesPlayed: Number(tt.matchesPlayed ?? 0),
            wins: Number(tt.wins ?? 0),
            losses: Number(tt.losses ?? 0),
            draws: Number(tt.draws ?? 0),
            points: Number(tt.points ?? 0),
            purseSpent: Number(tt.purseSpent ?? 0),
            createdAt: toDate(tt.createdAt),
            updatedAt: toDate(tt.updatedAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const tm of pgTournamentMembers.rows) {
        db.insert(tournamentMembers)
          .values({
            id: String(tm.id),
            tournamentId: String(tm.tournamentId),
            userId: String(tm.userId),
            role: tm.role ?? "MANAGER",
            createdAt: toDate(tm.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const tp of pgTournamentPlayers.rows) {
        db.insert(tournamentPlayers)
          .values({
            id: String(tp.id),
            tournamentId: String(tp.tournamentId),
            teamId: tp.teamId ? String(tp.teamId) : null,
            userId: tp.userId ? String(tp.userId) : null,
            name: String(tp.name),
            email: tp.email ?? null,
            soldPrice: Number(tp.soldPrice ?? 0),
            isCaptain: Boolean(tp.isCaptain),
            matchesPlayed: Number(tp.matchesPlayed ?? 0),
            customRating: tp.customRating ?? null,
            customMatches: tp.customMatches ?? null,
            customWins: tp.customWins ?? null,
            isCheckedIn: Boolean(tp.isCheckedIn),
            checkInTime: toNullableDate(tp.checkInTime),
            createdAt: toDate(tp.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const te of pgTournamentEnrollments.rows) {
        db.insert(tournamentEnrollments)
          .values({
            id: String(te.id),
            tournamentId: String(te.tournamentId),
            userId: te.userId ? String(te.userId) : null,
            name: String(te.name),
            email: String(te.email),
            mobile: String(te.mobile),
            paymentMode: te.paymentMode ?? "UPI",
            paymentScreenshotUrl: te.paymentScreenshotUrl ?? null,
            transactionId: te.transactionId ?? null,
            status: te.status ?? "PENDING",
            adminNotes: te.adminNotes ?? null,
            createdAt: toDate(te.createdAt),
            updatedAt: toDate(te.updatedAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const tg of pgTournamentGames.rows) {
        db.insert(tournamentGames)
          .values({
            id: String(tg.id),
            tournamentId: String(tg.tournamentId),
            stageId: tg.stageId ? String(tg.stageId) : null,
            teamAId: String(tg.teamAId),
            teamBId: String(tg.teamBId),
            teamAPlayers: toStringArray(tg.teamAPlayers),
            teamBPlayers: toStringArray(tg.teamBPlayers),
            round: Number(tg.round ?? 1),
            status: tg.status ?? "SCHEDULED",
            teamAScore: Number(tg.teamAScore ?? 0),
            teamBScore: Number(tg.teamBScore ?? 0),
            currentSet: Number(tg.currentSet ?? 1),
            winningTeam: tg.winningTeam ?? null,
            scheduleTime: toNullableDate(tg.scheduleTime),
            completedAt: toNullableDate(tg.completedAt),
            createdAt: toDate(tg.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const tpt of pgTournamentPoints.rows) {
        db.insert(tournamentPoints)
          .values({
            id: String(tpt.id),
            gameId: String(tpt.gameId),
            scorerId: tpt.scorerId ?? null,
            pointType: String(tpt.pointType),
            tournamentTeamId: tpt.tournamentTeamId ? String(tpt.tournamentTeamId) : null,
            timestamp: toDate(tpt.timestamp),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const ach of pgAchievements.rows) {
        db.insert(achievements)
          .values({
            id: String(ach.id),
            key: String(ach.key),
            name: String(ach.name),
            description: String(ach.description),
            icon: String(ach.icon),
            category: ach.category,
            tier: ach.tier,
            criteria: ach.criteria,
            createdAt: toDate(ach.createdAt),
          })
          .onConflictDoUpdate({
            target: achievements.key,
            set: {
              name: String(ach.name),
              description: String(ach.description),
              icon: String(ach.icon),
              category: ach.category,
              tier: ach.tier,
              criteria: ach.criteria,
            },
          })
          .run();
      }

      for (const ua of pgUserAchievements.rows) {
        db.insert(userAchievements)
          .values({
            id: String(ua.id),
            userId: String(ua.userId),
            achievementId: String(ua.achievementId),
            unlockedAt: toNullableDate(ua.unlockedAt),
            progress: Number(ua.progress ?? 0),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const eh of pgEloHistory.rows) {
        db.insert(eloHistory)
          .values({
            id: String(eh.id),
            userId: String(eh.userId),
            rating: Number(eh.rating),
            change: Number(eh.change),
            gameId: eh.gameId ?? null,
            timestamp: toDate(eh.timestamp),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const pay of pgPayments.rows) {
        db.insert(payments)
          .values({
            id: String(pay.id),
            userId: String(pay.userId),
            type: pay.type,
            amount: Number(pay.amount),
            currency: String(pay.currency ?? "INR"),
            referenceId: pay.referenceId ?? null,
            createdAt: toDate(pay.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const n of pgNotifications.rows) {
        db.insert(notifications)
          .values({
            id: String(n.id),
            userId: String(n.userId),
            title: String(n.title),
            message: String(n.message),
            isRead: Boolean(n.isRead),
            link: n.link ?? null,
            createdAt: toDate(n.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const act of pgActivities.rows) {
        db.insert(activities)
          .values({
            id: String(act.id),
            userId: String(act.userId),
            type: act.type,
            refId: act.refId ?? null,
            message: act.message ?? null,
            createdAt: toDate(act.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      for (const ev of pgCalendarEvents.rows) {
        db.insert(calendarEvents)
          .values({
            id: String(ev.id),
            title: String(ev.title),
            description: ev.description ?? null,
            startTime: toDate(ev.startTime),
            endTime: toNullableDate(ev.endTime),
            location: ev.location ?? null,
            tournamentId: ev.tournamentId ? String(ev.tournamentId) : null,
            teamId: ev.teamId ? String(ev.teamId) : null,
            createdAt: toDate(ev.createdAt),
          })
          .onConflictDoNothing()
          .run();
      }

      const orphanMembers = db
        .select()
        .from(teamMembers)
        .where(isNull(teamMembers.userId))
        .all();

      for (const member of orphanMembers) {
        const matched = db
          .select()
          .from(users)
          .where(eq(users.email, member.email.toLowerCase()))
          .get();
        if (matched) {
          db.update(teamMembers)
            .set({
              userId: matched.id,
              displayName: member.displayName || matched.name || null,
            })
            .where(eq(teamMembers.id, member.id))
            .run();
        }
      }
    });

    tx();

    console.log("Full import complete:");
    console.log(`- Users: ${pgUsers.rowCount}`);
    console.log(`- Teams: ${pgTeams.rowCount}`);
    console.log(`- TeamMembers: ${pgTeamMembers.rowCount}`);
    console.log(`- Sessions: ${pgSessions.rowCount}`);
    console.log(`- SessionParticipants: ${pgSessionParticipants.rowCount}`);
    console.log(`- SessionPlayerStats: ${pgSessionPlayerStats.rowCount}`);
    console.log(`- SessionPairHistory: ${pgSessionPairHistory.rowCount}`);
    console.log(`- Games (with scores): ${pgGames.rowCount}`);
    console.log(`- PairStats: ${pgPairStats.rowCount}`);
    console.log(`- Tournaments (with auction/UPI/rules): ${pgTournaments.rowCount}`);
    console.log(`- Achievements: ${pgAchievements.rowCount}`);
  } finally {
    await mainPool.end();
    if (analyticsPool) await analyticsPool.end();
  }
}

importFromPostgres()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
