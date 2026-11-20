"use server";

import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import {
  db,
  eloHistory,
  games,
  matchEvents,
  pairStats,
  sessionPairHistory,
  sessionPlayerStats,
  sessions,
  sqlite,
  teams,
  users,
} from "@courtpulse/database";
import { generateSlug } from "@courtpulse/helpers/slug.helpers";
import { resolveTeamPermissionsById } from "./permissions.helpers";

export async function createGameAction(input: {
  teamSlug: string;
  sessionSlug: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAScore?: number;
  teamBScore?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();

  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.slug, input.sessionSlug))
    .get();
  if (!session) return { ok: false, message: "Session not found." };

  const access = resolveTeamPermissionsById(session.teamId, user.id, user.email);
  if (!access || access.team.slug !== input.teamSlug) {
    return { ok: false, message: "Team not found." };
  }
  if (!access.perms.canCreateGames) {
    return { ok: false, message: "You do not have permission to create matches." };
  }

  const teamA = input.teamAPlayers.map((p) => p.trim().toLowerCase());
  const teamB = input.teamBPlayers.map((p) => p.trim().toLowerCase());

  const validSingles = teamA.length === 1 && teamB.length === 1;
  const validDoubles = teamA.length === 2 && teamB.length === 2;
  if (!validSingles && !validDoubles) {
    return {
      ok: false,
      message: "Choose 1 player per side for singles, or 2 per side for doubles.",
    };
  }

  const overlap = teamA.filter((p) => teamB.includes(p));
  if (overlap.length > 0) {
    return { ok: false, message: "A player cannot be on both sides." };
  }

  const scoreA = Math.max(0, Number(input.teamAScore ?? 0));
  const scoreB = Math.max(0, Number(input.teamBScore ?? 0));
  const slug = generateSlug(`${input.sessionSlug}-game`);

  db.insert(games)
    .values({
      id: crypto.randomUUID(),
      slug,
      sessionId: session.id,
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      teamAScore: scoreA,
      teamBScore: scoreB,
      winner: null,
    })
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}/session/${input.sessionSlug}`);
  return { ok: true };
}

export async function setGameWinnerAction(input: {
  teamSlug: string;
  sessionSlug: string;
  gameSlug: string;
  winner?: "A" | "B";
  teamAScore?: number;
  teamBScore?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();

  const game = db.select().from(games).where(eq(games.slug, input.gameSlug)).get();
  if (!game) return { ok: false, message: "Match not found." };
  if (game.winner) return { ok: false, message: "Winner is already recorded." };

  const session = db.select().from(sessions).where(eq(sessions.id, game.sessionId)).get();
  if (!session) return { ok: false, message: "Session not found." };

  const access = resolveTeamPermissionsById(session.teamId, user.id, user.email);
  if (!access) return { ok: false, message: "Team not found." };
  if (!access.perms.canScoreGames) {
    return { ok: false, message: "You do not have permission to finalize match scores." };
  }
  const { team } = access;

  const scoreA = Math.max(0, Number(input.teamAScore ?? game.teamAScore ?? 0));
  const scoreB = Math.max(0, Number(input.teamBScore ?? game.teamBScore ?? 0));

  if (scoreA === scoreB) {
    return { ok: false, message: "Scores are tied. Break the tie before finalizing." };
  }

  const resolvedWinner: "A" | "B" = scoreA > scoreB ? "A" : "B";
  const winningPlayers = resolvedWinner === "A" ? game.teamAPlayers : game.teamBPlayers;
  const losingPlayers = resolvedWinner === "A" ? game.teamBPlayers : game.teamAPlayers;

  const tx = sqlite.transaction(() => {
    db.update(games)
      .set({
        winner: resolvedWinner,
        teamAScore: scoreA,
        teamBScore: scoreB,
      })
      .where(eq(games.id, game.id))
      .run();

    db.update(teams)
      .set({
        gamesPlayed: sql`${teams.gamesPlayed} + 1`,
        gamesWon: sql`${teams.gamesWon} + 1`,
      })
      .where(eq(teams.id, team.id))
      .run();

    // Update ELO ratings (K=24)
    const getAvgElo = (emails: string[]) => {
      const ratings = emails.map((email) => {
        const u = db.select({ elo: users.eloRating }).from(users).where(eq(users.email, email.toLowerCase())).get();
        return u?.elo ?? 1200;
      });
      return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 1200;
    };

    const winAvg = getAvgElo(winningPlayers);
    const loseAvg = getAvgElo(losingPlayers);
    const expectedWin = 1 / (1 + Math.pow(10, (loseAvg - winAvg) / 400));
    const delta = Math.max(4, Math.round(24 * (1 - expectedWin)));

    for (const token of winningPlayers) {
      const target = db.select().from(users).where(eq(users.email, token.toLowerCase())).get();
      if (target) {
        const nextElo = target.eloRating + delta;
        db.update(users)
          .set({
            points: target.points + 10,
            wins: target.wins + 1,
            eloRating: nextElo,
          })
          .where(eq(users.id, target.id))
          .run();
        db.insert(eloHistory)
          .values({
            id: crypto.randomUUID(),
            userId: target.id,
            rating: nextElo,
            change: delta,
            gameId: game.id,
          })
          .run();
      }
    }

    for (const token of losingPlayers) {
      const target = db.select().from(users).where(eq(users.email, token.toLowerCase())).get();
      if (target) {
        const nextElo = Math.max(800, target.eloRating - delta);
        db.update(users)
          .set({
            points: target.points + 2,
            losses: target.losses + 1,
            eloRating: nextElo,
          })
          .where(eq(users.id, target.id))
          .run();
        db.insert(eloHistory)
          .values({
            id: crypto.randomUUID(),
            userId: target.id,
            rating: nextElo,
            change: -delta,
            gameId: game.id,
          })
          .run();
      }
    }

    // Update session player stats (plays, totalPoints, pointDiff)
    const updateSessionStats = (players: string[], ownScore: number, oppScore: number) => {
      const diff = ownScore - oppScore;
      for (const token of players) {
        const email = token.toLowerCase();
        const existing = db
          .select()
          .from(sessionPlayerStats)
          .where(
            and(
              eq(sessionPlayerStats.sessionId, session.id),
              eq(sessionPlayerStats.player, email)
            )
          )
          .get();

        if (existing) {
          db.update(sessionPlayerStats)
            .set({
              plays: existing.plays + 1,
              totalPoints: existing.totalPoints + ownScore,
              pointDiff: existing.pointDiff + diff,
              updatedAt: new Date(),
            })
            .where(eq(sessionPlayerStats.id, existing.id))
            .run();
        } else {
          db.insert(sessionPlayerStats)
            .values({
              id: crypto.randomUUID(),
              sessionId: session.id,
              player: email,
              plays: 1,
              totalPoints: ownScore,
              pointDiff: diff,
            })
            .run();
        }
      }
    };

    updateSessionStats(game.teamAPlayers, scoreA, scoreB);
    updateSessionStats(game.teamBPlayers, scoreB, scoreA);

    const upsertPair = (players: string[], isWinner: boolean) => {
      if (players.length !== 2) return;
      const [p1, p2] = [...players].map((p) => p.toLowerCase()).sort();
      const existing = db
        .select()
        .from(pairStats)
        .where(
          and(
            eq(pairStats.teamId, team.id),
            eq(pairStats.playerA, p1),
            eq(pairStats.playerB, p2)
          )
        )
        .get();

      if (existing) {
        db.update(pairStats)
          .set({
            plays: existing.plays + 1,
            wins: isWinner ? existing.wins + 1 : existing.wins,
          })
          .where(eq(pairStats.id, existing.id))
          .run();
      } else {
        db.insert(pairStats)
          .values({
            id: crypto.randomUUID(),
            teamId: team.id,
            playerA: p1,
            playerB: p2,
            plays: 1,
            wins: isWinner ? 1 : 0,
          })
          .run();
      }

      db.insert(sessionPairHistory)
        .values({
          id: crypto.randomUUID(),
          sessionId: session.id,
          playerA: p1,
          playerB: p2,
        })
        .run();
    };

    upsertPair(winningPlayers, true);
    upsertPair(losingPlayers, false);
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}/session/${input.sessionSlug}`);
  revalidatePath(`/team/${input.teamSlug}`);
  revalidatePath(`/team/${input.teamSlug}/stats`);
  revalidatePath("/");
  return { ok: true };
}

export async function updateGameScoreAction(input: {
  teamSlug: string;
  sessionSlug: string;
  gameSlug: string;
  teamAScore: number;
  teamBScore: number;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const game = db.select().from(games).where(eq(games.slug, input.gameSlug)).get();
  if (!game) return { ok: false, message: "Match not found." };

  const session = db.select().from(sessions).where(eq(sessions.id, game.sessionId)).get();
  if (!session) return { ok: false, message: "Session not found." };

  const access = resolveTeamPermissionsById(session.teamId, user.id, user.email);
  if (!access) return { ok: false, message: "Team not found." };
  if (!access.perms.canScoreGames) {
    return { ok: false, message: "You do not have permission to update scores." };
  }

  const tx = sqlite.transaction(() => {
    db.update(games)
      .set({
        teamAScore: Math.max(0, input.teamAScore),
        teamBScore: Math.max(0, input.teamBScore),
      })
      .where(eq(games.id, game.id))
      .run();

    db.insert(matchEvents)
      .values({
        id: crypto.randomUUID(),
        gameId: game.id,
        type: "SCORE_UPDATE",
        scoreA: Math.max(0, input.teamAScore),
        scoreB: Math.max(0, input.teamBScore),
      })
      .run();
  });

  tx();

  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}/session/${input.sessionSlug}`);
  revalidatePath(`/team/${input.teamSlug}`);
  revalidatePath(`/team/${input.teamSlug}/stats`);
  return { ok: true };
}

export async function deleteGameAction(input: {
  teamSlug: string;
  sessionSlug: string;
  gameSlug: string;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const game = db.select().from(games).where(eq(games.slug, input.gameSlug)).get();
  if (!game) return { ok: false, message: "Match not found." };

  const session = db.select().from(sessions).where(eq(sessions.id, game.sessionId)).get();
  if (!session) return { ok: false, message: "Session not found." };

  const access = resolveTeamPermissionsById(session.teamId, user.id, user.email);
  if (!access) return { ok: false, message: "Team not found." };
  const canDeleteThisGame =
    access.perms.canDeleteMatches || (!game.winner && access.perms.canCreateGames);
  if (!canDeleteThisGame) {
    return { ok: false, message: "You do not have permission to delete this match." };
  }
  const { team } = access;

  const tx = sqlite.transaction(() => {
    if (game.winner) {
      const winningPlayers = game.winner === "A" ? game.teamAPlayers : game.teamBPlayers;
      const losingPlayers = game.winner === "A" ? game.teamBPlayers : game.teamAPlayers;

      db.update(teams)
        .set({
          gamesPlayed: sql`MAX(0, ${teams.gamesPlayed} - 1)`,
          gamesWon: sql`MAX(0, ${teams.gamesWon} - 1)`,
        })
        .where(eq(teams.id, team.id))
        .run();

      for (const token of winningPlayers) {
        db.update(users)
          .set({
            points: sql`MAX(0, ${users.points} - 10)`,
            wins: sql`MAX(0, ${users.wins} - 1)`,
          })
          .where(eq(users.email, token.toLowerCase()))
          .run();
      }

      for (const token of losingPlayers) {
        db.update(users)
          .set({
            points: sql`MAX(0, ${users.points} - 2)`,
            losses: sql`MAX(0, ${users.losses} - 1)`,
          })
          .where(eq(users.email, token.toLowerCase()))
          .run();
      }

      const reversePair = (players: string[], isWinner: boolean) => {
        if (players.length !== 2) return;
        const [p1, p2] = [...players].map((p) => p.toLowerCase()).sort();
        const existing = db
          .select()
          .from(pairStats)
          .where(
            and(
              eq(pairStats.teamId, team.id),
              eq(pairStats.playerA, p1),
              eq(pairStats.playerB, p2)
            )
          )
          .get();

        if (existing) {
          db.update(pairStats)
            .set({
              plays: Math.max(0, existing.plays - 1),
              wins: isWinner ? Math.max(0, existing.wins - 1) : existing.wins,
            })
            .where(eq(pairStats.id, existing.id))
            .run();
        }
      };

      reversePair(winningPlayers, true);
      reversePair(losingPlayers, false);
    }

    db.delete(games).where(eq(games.id, game.id)).run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}/session/${input.sessionSlug}`);
  revalidatePath(`/team/${input.teamSlug}`);
  revalidatePath(`/team/${input.teamSlug}/stats`);
  revalidatePath("/");
  return { ok: true };
}
