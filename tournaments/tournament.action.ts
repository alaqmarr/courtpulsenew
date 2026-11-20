"use server";

import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import {
  db,
  sqlite,
  stages,
  teams,
  tournamentFairPlayLogs,
  tournamentGames,
  tournamentMembers,
  tournamentPlayers,
  tournamentPoints,
  tournaments,
  tournamentTeams,
  users,
} from "@courtpulse/database";
import { canCreateTournament } from "@courtpulse/helpers/quota.helpers";
import { toSlug } from "@courtpulse/helpers/slug.helpers";
import { createTournamentSchema } from "@courtpulse/helpers/validation.helpers";
import {
  generateSmartTournamentFixtures,
  resolveTournamentAccess,
} from "./tournament.helpers";

export async function createTournamentAction(input: {
  name: string;
  minGamesPerPlayer: number;
  bannerUrl?: string;
  entryFee?: number;
  auctionPurse?: number;
  courts?: number;
  paymentUpi?: string;
  description?: string;
}): Promise<{ ok: boolean; slug?: string; message?: string }> {
  const user = await requireUser();
  const parsed = createTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Enter valid tournament details.",
    };
  }

  if (
    !canCreateTournament(
      user.packageType,
      user.tournamentCount,
      user.tournamentQuota
    )
  ) {
    return {
      ok: false,
      message: "Your current plan does not allow creating another tournament.",
    };
  }

  const slug = toSlug(parsed.data.name);
  const existing = db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .get();
  if (existing) {
    return { ok: false, message: "A tournament with that name already exists." };
  }

  const tx = sqlite.transaction(() => {
    db.insert(tournaments)
      .values({
        id: crypto.randomUUID(),
        name: parsed.data.name,
        slug,
        ownerId: user.id,
        adminToken: crypto.randomBytes(12).toString("hex"),
        minGamesPerPlayer: parsed.data.minGamesPerPlayer,
        bannerUrl: parsed.data.bannerUrl || null,
        entryFee: Math.max(0, Number(input.entryFee ?? 0)),
        auctionPurse: Math.max(0, Number(input.auctionPurse ?? 10000)),
        courts: Math.max(1, Number(input.courts ?? 1)),
        paymentUpi: input.paymentUpi?.trim() || null,
        description: input.description?.trim() || null,
        isActive: true,
        registrationOpen: true,
      })
      .run();

    db.update(users)
      .set({ tournamentCount: user.tournamentCount + 1 })
      .where(eq(users.id, user.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath("/");
  return { ok: true, slug };
}

export async function updateTournamentSettingsAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  name: string;
  description?: string | null;
  rules?: string | null;
  bannerUrl?: string | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
  registrationOpen: boolean;
  minGamesPerPlayer: number;
  courts: number;
  entryFee: number;
  paymentUpi?: string | null;
  paymentQrCode?: string | null;
  cashContactName?: string | null;
  cashContactNumber?: string | null;
  contactPhone?: string | null;
  auctionPurse: number;
  auctionBasePrice: number;
  auctionBidIncrement: number;
  auctionMinSquadSize: number;
  auctionMaxSquadSize: number;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  pointsToWin: number;
  fairPlayPenaltyPoints: number;
  useCustomStats: boolean;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can edit settings." };
  }

  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    return { ok: false, message: "Tournament name must be at least 2 characters." };
  }

  const parsedStart = input.startDate ? new Date(input.startDate) : null;
  const parsedEnd = input.endDate ? new Date(input.endDate) : null;

  db.update(tournaments)
    .set({
      name: cleanName,
      description: input.description?.trim() || null,
      rules: input.rules?.trim() || null,
      bannerUrl: input.bannerUrl?.trim() || null,
      thumbnailUrl: input.thumbnailUrl?.trim() || null,
      isActive: input.isActive,
      registrationOpen: input.registrationOpen,
      minGamesPerPlayer: Math.max(0, Number(input.minGamesPerPlayer || 0)),
      courts: Math.max(1, Math.min(20, Number(input.courts || 1))),
      entryFee: Math.max(0, Number(input.entryFee || 0)),
      paymentUpi: input.paymentUpi?.trim() || null,
      paymentQrCode: input.paymentQrCode?.trim() || null,
      cashContactName: input.cashContactName?.trim() || null,
      cashContactNumber: input.cashContactNumber?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      auctionPurse: Math.max(0, Number(input.auctionPurse || 0)),
      auctionBasePrice: Math.max(0, Number(input.auctionBasePrice || 0)),
      auctionBidIncrement: Math.max(10, Number(input.auctionBidIncrement || 100)),
      auctionMinSquadSize: Math.max(1, Number(input.auctionMinSquadSize || 1)),
      auctionMaxSquadSize: Math.max(
        Math.max(1, Number(input.auctionMinSquadSize || 1)),
        Number(input.auctionMaxSquadSize || 10)
      ),
      winPoints: Math.max(0, Number(input.winPoints || 2)),
      drawPoints: Math.max(0, Number(input.drawPoints || 1)),
      lossPoints: Math.max(0, Number(input.lossPoints || 0)),
      pointsToWin: Math.max(5, Math.min(50, Number(input.pointsToWin || 21))),
      fairPlayPenaltyPoints: Math.max(0, Number(input.fairPlayPenaltyPoints || 1)),
      useCustomStats: input.useCustomStats,
      startDate:
        parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : null,
      endDate:
        parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd : null,
    })
    .where(eq(tournaments.id, access.tournament.id))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  revalidatePath(`/tournament/${input.tournamentSlug}/register`);
  revalidatePath("/");
  return { ok: true };
}

export async function rotateAdminTokenAction(input: {
  tournamentSlug: string;
}): Promise<{ ok: boolean; adminToken?: string; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug);
  if (!access || !access.isOwner) {
    return { ok: false, message: "Only the primary organizer can reset the co-admin key." };
  }

  const nextToken = crypto.randomBytes(12).toString("hex");
  db.update(tournaments)
    .set({ adminToken: nextToken })
    .where(eq(tournaments.id, access.tournament.id))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true, adminToken: nextToken };
}

export async function addTournamentCoAdminAction(input: {
  tournamentSlug: string;
  email: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug);
  if (!access || !access.isOwner) {
    return { ok: false, message: "Only the primary organizer can add co-admins." };
  }

  const cleanEmail = input.email.trim().toLowerCase();
  const targetUser = db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .get();
  if (!targetUser) {
    return {
      ok: false,
      message: "No registered CourtPulse account found with that email yet. Use the shareable Co-Admin link instead.",
    };
  }

  const existing = db
    .select()
    .from(tournamentMembers)
    .where(
      and(
        eq(tournamentMembers.tournamentId, access.tournament.id),
        eq(tournamentMembers.userId, targetUser.id)
      )
    )
    .get();
  if (existing) {
    return { ok: false, message: "That user already has co-admin access." };
  }

  db.insert(tournamentMembers)
    .values({
      id: crypto.randomUUID(),
      tournamentId: access.tournament.id,
      userId: targetUser.id,
      role: "MANAGER",
    })
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function removeTournamentCoAdminAction(input: {
  tournamentSlug: string;
  memberId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug);
  if (!access || !access.isOwner) {
    return { ok: false, message: "Only the primary organizer can remove co-admins." };
  }

  db.delete(tournamentMembers)
    .where(
      and(
        eq(tournamentMembers.id, input.memberId),
        eq(tournamentMembers.tournamentId, access.tournament.id)
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function addTournamentTeamAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  teamId?: string;
  name?: string;
  color?: string;
  ownerName?: string;
  ownerEmail?: string;
  purseBudget?: number | null;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can add teams." };
  }

  const { tournament } = access;
  let teamName = input.name?.trim() || "";
  if (input.teamId) {
    const clubTeam = db
      .select()
      .from(teams)
      .where(eq(teams.id, input.teamId))
      .get();
    if (!clubTeam) return { ok: false, message: "Club team not found." };
    teamName = teamName || clubTeam.name;

    const existing = db
      .select()
      .from(tournamentTeams)
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournament.id),
          eq(tournamentTeams.teamId, input.teamId)
        )
      )
      .get();
    if (existing) return { ok: false, message: "Team is already added." };
  }

  if (teamName.length < 2) {
    return { ok: false, message: "Enter a team name (at least 2 characters)." };
  }

  db.insert(tournamentTeams)
    .values({
      id: crypto.randomUUID(),
      tournamentId: tournament.id,
      teamId: input.teamId || null,
      name: teamName,
      color: input.color || "#059669",
      ownerName: input.ownerName?.trim() || null,
      ownerEmail: input.ownerEmail?.trim().toLowerCase() || null,
      ownerToken: crypto.randomBytes(10).toString("hex"),
      purseBudget:
        input.purseBudget !== undefined && input.purseBudget !== null
          ? Math.max(0, Number(input.purseBudget))
          : null,
    })
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function updateTournamentTeamAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  teamId: string;
  name: string;
  color: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  purseBudget?: number | null;
  regenerateToken?: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can edit teams." };
  }

  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    return { ok: false, message: "Team name must be at least 2 characters." };
  }

  db.update(tournamentTeams)
    .set({
      name: cleanName,
      color: input.color || "#059669",
      ownerName: input.ownerName?.trim() || null,
      ownerEmail: input.ownerEmail?.trim().toLowerCase() || null,
      purseBudget:
        input.purseBudget !== undefined && input.purseBudget !== null
          ? Math.max(0, Number(input.purseBudget))
          : null,
      ...(input.regenerateToken
        ? { ownerToken: crypto.randomBytes(10).toString("hex") }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tournamentTeams.id, input.teamId),
        eq(tournamentTeams.tournamentId, access.tournament.id)
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function removeTournamentTeamAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  teamId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can remove teams." };
  }

  const tx = sqlite.transaction(() => {
    db.update(tournamentPlayers)
      .set({ teamId: null, soldPrice: 0, isCaptain: false, auctionStatus: "PENDING" })
      .where(
        and(
          eq(tournamentPlayers.teamId, input.teamId),
          eq(tournamentPlayers.tournamentId, access.tournament.id)
        )
      )
      .run();

    db.delete(tournamentTeams)
      .where(
        and(
          eq(tournamentTeams.id, input.teamId),
          eq(tournamentTeams.tournamentId, access.tournament.id)
        )
      )
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function createStageAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  name: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can add rounds." };
  }

  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    return { ok: false, message: "Round name must be at least 2 characters." };
  }

  const currentStages = db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, access.tournament.id))
    .all();

  db.insert(stages)
    .values({
      id: crypto.randomUUID(),
      tournamentId: access.tournament.id,
      name: cleanName,
      order: currentStages.length + 1,
    })
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function generateSmartScheduleAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  stageId?: string | null;
  mode: "ROUND_ROBIN" | "FAIR_PLAY_CATCHUP";
  matchFormat: "DOUBLES" | "SINGLES";
  slotMinutes: number;
  startIso?: string;
  doubleRoundRobin?: boolean;
  clearUnplayedFirst?: boolean;
}): Promise<{ ok: boolean; count?: number; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can run the scheduler." };
  }

  const { tournament } = access;
  const teamsList = db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournament.id))
    .all();
  if (teamsList.length < 2) {
    return { ok: false, message: "Add at least 2 teams before generating fixtures." };
  }

  const playersList = db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournament.id))
    .all();

  const existingGamesBefore = db
    .select()
    .from(tournamentGames)
    .where(eq(tournamentGames.tournamentId, tournament.id))
    .all();

  const keptGames = input.clearUnplayedFirst
    ? existingGamesBefore.filter((g) => g.status === "COMPLETED" || g.status === "LIVE")
    : existingGamesBefore;

  const startAt =
    input.startIso && !Number.isNaN(new Date(input.startIso).getTime())
      ? new Date(input.startIso)
      : tournament.startDate ?? new Date();

  const planned = generateSmartTournamentFixtures({
    teams: teamsList,
    players: playersList,
    existingGames: keptGames,
    courtsCount: tournament.courts,
    minGamesPerPlayer: tournament.minGamesPerPlayer,
    mode: input.mode,
    matchFormat: input.matchFormat,
    startAt,
    slotMinutes: Math.max(5, Math.min(180, Number(input.slotMinutes || 20))),
    doubleRoundRobin: input.doubleRoundRobin,
  });

  if (planned.length === 0) {
    return {
      ok: false,
      message:
        input.mode === "FAIR_PLAY_CATCHUP"
          ? "All rostered players already meet the Fair Play minimum games quota."
          : "No fixtures could be generated.",
    };
  }

  const tx = sqlite.transaction(() => {
    if (input.clearUnplayedFirst) {
      db.delete(tournamentGames)
        .where(
          and(
            eq(tournamentGames.tournamentId, tournament.id),
            eq(tournamentGames.status, "SCHEDULED")
          )
        )
        .run();
    }

    for (const fx of planned) {
      db.insert(tournamentGames)
        .values({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          stageId: input.stageId || null,
          teamAId: fx.teamAId,
          teamBId: fx.teamBId,
          teamAPlayers: fx.teamAPlayers,
          teamBPlayers: fx.teamBPlayers,
          round: fx.round,
          courtNumber: fx.courtNumber,
          slotLabel: fx.slotLabel,
          isFairPlayCatchup: fx.isFairPlayCatchup,
          status: "SCHEDULED",
          scheduleTime: fx.scheduleTime,
          teamAScore: 0,
          teamBScore: 0,
          winningTeam: null,
        })
        .run();
    }
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true, count: planned.length };
}

export async function createTournamentGameAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  stageId?: string;
  teamAId: string;
  teamBId: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  courtNumber?: number;
  slotLabel?: string;
  scheduleTime?: string;
  isFairPlayCatchup?: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can create matches." };
  }

  if (input.teamAId === input.teamBId) {
    return { ok: false, message: "Select two different teams." };
  }

  const parsedTime = input.scheduleTime ? new Date(input.scheduleTime) : null;

  db.insert(tournamentGames)
    .values({
      id: crypto.randomUUID(),
      tournamentId: access.tournament.id,
      stageId: input.stageId || null,
      teamAId: input.teamAId,
      teamBId: input.teamBId,
      teamAPlayers: input.teamAPlayers,
      teamBPlayers: input.teamBPlayers,
      courtNumber: Math.max(1, Number(input.courtNumber ?? 1)),
      slotLabel: input.slotLabel?.trim() || null,
      scheduleTime:
        parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime : null,
      isFairPlayCatchup: Boolean(input.isFairPlayCatchup),
      status: "SCHEDULED",
      teamAScore: 0,
      teamBScore: 0,
      winningTeam: null,
    })
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function recordTournamentPointAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  gameId: string;
  scoringSide: "A" | "B";
  scorerName?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can score points." };
  }

  const game = db
    .select()
    .from(tournamentGames)
    .where(
      and(
        eq(tournamentGames.id, input.gameId),
        eq(tournamentGames.tournamentId, access.tournament.id)
      )
    )
    .get();
  if (!game) return { ok: false, message: "Match not found." };

  const nextA = input.scoringSide === "A" ? game.teamAScore + 1 : game.teamAScore;
  const nextB = input.scoringSide === "B" ? game.teamBScore + 1 : game.teamBScore;
  const teamId = input.scoringSide === "A" ? game.teamAId : game.teamBId;

  const tx = sqlite.transaction(() => {
    db.insert(tournamentPoints)
      .values({
        id: crypto.randomUUID(),
        gameId: game.id,
        tournamentTeamId: teamId,
        scorerId: input.scorerName?.trim() || null,
        pointType: input.scoringSide === "A" ? "POINT_A" : "POINT_B",
      })
      .run();

    db.update(tournamentGames)
      .set({
        teamAScore: nextA,
        teamBScore: nextB,
        status: game.status === "COMPLETED" ? "COMPLETED" : "LIVE",
      })
      .where(eq(tournamentGames.id, game.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function undoTournamentPointAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  gameId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can edit points." };
  }

  const game = db
    .select()
    .from(tournamentGames)
    .where(
      and(
        eq(tournamentGames.id, input.gameId),
        eq(tournamentGames.tournamentId, access.tournament.id)
      )
    )
    .get();
  if (!game) return { ok: false, message: "Match not found." };

  const lastPoint = db
    .select()
    .from(tournamentPoints)
    .where(eq(tournamentPoints.gameId, game.id))
    .orderBy(desc(tournamentPoints.timestamp))
    .limit(1)
    .get();

  if (!lastPoint) {
    return { ok: false, message: "No logged points to undo." };
  }

  const nextA =
    lastPoint.pointType === "POINT_A"
      ? Math.max(0, game.teamAScore - 1)
      : game.teamAScore;
  const nextB =
    lastPoint.pointType === "POINT_B"
      ? Math.max(0, game.teamBScore - 1)
      : game.teamBScore;

  const tx = sqlite.transaction(() => {
    db.delete(tournamentPoints).where(eq(tournamentPoints.id, lastPoint.id)).run();
    db.update(tournamentGames)
      .set({ teamAScore: nextA, teamBScore: nextB })
      .where(eq(tournamentGames.id, game.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function updateTournamentGameScoreAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  gameId: string;
  teamAScore: number;
  teamBScore: number;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED";
  courtNumber?: number;
  slotLabel?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can update scores." };
  }

  db.update(tournamentGames)
    .set({
      teamAScore: Math.max(0, input.teamAScore),
      teamBScore: Math.max(0, input.teamBScore),
      ...(input.status ? { status: input.status } : {}),
      ...(input.courtNumber !== undefined
        ? { courtNumber: Math.max(1, input.courtNumber) }
        : {}),
      ...(input.slotLabel !== undefined
        ? { slotLabel: input.slotLabel || null }
        : {}),
    })
    .where(
      and(
        eq(tournamentGames.id, input.gameId),
        eq(tournamentGames.tournamentId, access.tournament.id)
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function setTournamentWinnerAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  gameId: string;
  winningTeam: "A" | "B" | "DRAW";
  teamAScore?: number;
  teamBScore?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can finalize matches." };
  }

  db.update(tournamentGames)
    .set({
      winningTeam: input.winningTeam,
      status: "COMPLETED",
      ...(input.teamAScore !== undefined
        ? { teamAScore: Math.max(0, input.teamAScore) }
        : {}),
      ...(input.teamBScore !== undefined
        ? { teamBScore: Math.max(0, input.teamBScore) }
        : {}),
      completedAt: new Date(),
    })
    .where(
      and(
        eq(tournamentGames.id, input.gameId),
        eq(tournamentGames.tournamentId, access.tournament.id)
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function deleteTournamentGameAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  gameId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can delete matches." };
  }

  db.delete(tournamentGames)
    .where(
      and(
        eq(tournamentGames.id, input.gameId),
        eq(tournamentGames.tournamentId, access.tournament.id)
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}

export async function toggleTournamentStatusAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  isActive: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can change status." };
  }

  db.update(tournaments)
    .set({ isActive: input.isActive })
    .where(eq(tournaments.id, access.tournament.id))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath("/");
  return { ok: true };
}

export async function addTournamentPlayerAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  name: string;
  email?: string;
  mobile?: string;
  category?: string;
  skillTier?: string;
  basePrice?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can add players." };
  }

  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    return { ok: false, message: "Player name must be at least 2 characters." };
  }

  db.insert(tournamentPlayers)
    .values({
      id: crypto.randomUUID(),
      tournamentId: access.tournament.id,
      name: cleanName,
      email: input.email?.trim().toLowerCase() || null,
      mobile: input.mobile?.trim() || null,
      category: input.category?.trim() || "All-Rounder",
      skillTier: input.skillTier?.trim() || "Tier B",
      basePrice: Math.max(
        0,
        Number(input.basePrice ?? access.tournament.auctionBasePrice)
      ),
      auctionStatus: "PENDING",
    })
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function assignTournamentPlayerAuctionAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  playerId: string;
  teamId: string | null;
  soldPrice: number;
  isCaptain: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can assign players." };
  }

  const { tournament } = access;
  const player = db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.id, input.playerId),
        eq(tournamentPlayers.tournamentId, tournament.id)
      )
    )
    .get();
  if (!player) return { ok: false, message: "Player not found." };

  const price = Math.max(0, Number(input.soldPrice || 0));

  const tx = sqlite.transaction(() => {
    db.update(tournamentPlayers)
      .set({
        teamId: input.teamId,
        soldPrice: input.teamId ? price : 0,
        isCaptain: input.teamId ? input.isCaptain : false,
        auctionStatus: input.teamId ? "SOLD" : "PENDING",
      })
      .where(eq(tournamentPlayers.id, player.id))
      .run();

    const allTeams = db
      .select()
      .from(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, tournament.id))
      .all();
    const allPlayers = db
      .select()
      .from(tournamentPlayers)
      .where(eq(tournamentPlayers.tournamentId, tournament.id))
      .all();

    for (const tm of allTeams) {
      const spent = allPlayers
        .filter((p) => p.teamId === tm.id)
        .reduce((sum, p) => sum + p.soldPrice, 0);
      db.update(tournamentTeams)
        .set({ purseSpent: spent, updatedAt: new Date() })
        .where(eq(tournamentTeams.id, tm.id))
        .run();
    }
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function toggleTournamentPlayerCheckInAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  playerId: string;
  isCheckedIn: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can update check-in." };
  }

  db.update(tournamentPlayers)
    .set({
      isCheckedIn: input.isCheckedIn,
      checkInTime: input.isCheckedIn ? new Date() : null,
    })
    .where(
      and(
        eq(tournamentPlayers.id, input.playerId),
        eq(tournamentPlayers.tournamentId, access.tournament.id)
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function recordFairPlayLogAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  teamId?: string | null;
  playerId?: string | null;
  type: "BONUS" | "WARNING" | "PENALTY" | "CATCHUP";
  pointsDelta: number;
  reason: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can log Fair Play entries." };
  }

  const cleanReason = input.reason.trim();
  if (cleanReason.length < 3) {
    return { ok: false, message: "Provide a short reason for this Fair Play note." };
  }

  db.insert(tournamentFairPlayLogs)
    .values({
      id: crypto.randomUUID(),
      tournamentId: access.tournament.id,
      teamId: input.teamId || null,
      playerId: input.playerId || null,
      type: input.type,
      pointsDelta: Number(input.pointsDelta || 0),
      reason: cleanReason,
      createdBy: access.currentUserEmail || "Admin",
    })
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}
