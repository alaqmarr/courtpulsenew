"use server";

import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import {
  auctionBids,
  db,
  sqlite,
  tournamentPlayers,
  tournaments,
  tournamentTeams,
} from "@courtpulse/database";
import type { AuctionStatus } from "@courtpulse/database/schema.enums";
import { resolveTournamentAccess } from "./tournament.helpers";

function recalculateTeamPurseSpent(tournamentId: string) {
  const teamsList = db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId))
    .all();
  const playersList = db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournamentId))
    .all();

  for (const tm of teamsList) {
    const spent = playersList
      .filter((p) => p.teamId === tm.id)
      .reduce((sum, p) => sum + p.soldPrice, 0);
    db.update(tournamentTeams)
      .set({ purseSpent: spent, updatedAt: new Date() })
      .where(eq(tournamentTeams.id, tm.id))
      .run();
  }
}

export async function setAuctionStatusAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  status: AuctionStatus;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Organizer or co-admin permissions required." };
  }

  db.update(tournaments)
    .set({ auctionStatus: input.status })
    .where(eq(tournaments.id, access.tournament.id))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function bringPlayerToBlockAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  playerId?: string;
}): Promise<{ ok: boolean; playerName?: string; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Organizer or co-admin permissions required." };
  }

  const { tournament } = access;
  const allPlayers = db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournament.id))
    .all();

  let target = input.playerId
    ? allPlayers.find((p) => p.id === input.playerId)
    : undefined;

  if (!target) {
    // Pick randomly among PENDING first, then UNSOLD
    const pendingPool = allPlayers.filter(
      (p) => !p.teamId && p.auctionStatus === "PENDING"
    );
    const pool =
      pendingPool.length > 0
        ? pendingPool
        : allPlayers.filter((p) => !p.teamId && p.auctionStatus === "UNSOLD");
    if (pool.length === 0) {
      return { ok: false, message: "No unassigned players left in the pool." };
    }
    target = pool[Math.floor(Math.random() * pool.length)];
  }

  const chosen = target;
  const tx = sqlite.transaction(() => {
    // Clear any previous ON_BLOCK back to PENDING if still unsold
    if (
      tournament.currentAuctionPlayerId &&
      tournament.currentAuctionPlayerId !== chosen.id
    ) {
      db.update(tournamentPlayers)
        .set({ auctionStatus: "PENDING" })
        .where(
          and(
            eq(tournamentPlayers.id, tournament.currentAuctionPlayerId),
            eq(tournamentPlayers.auctionStatus, "ON_BLOCK")
          )
        )
        .run();
    }

    db.update(tournamentPlayers)
      .set({ auctionStatus: "ON_BLOCK", teamId: null, soldPrice: 0 })
      .where(eq(tournamentPlayers.id, chosen.id))
      .run();

    db.update(tournaments)
      .set({
        auctionStatus: "LIVE",
        currentAuctionPlayerId: chosen.id,
        currentHighestBid: 0,
        currentHighestTeamId: null,
      })
      .where(eq(tournaments.id, tournament.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true, playerName: chosen.name };
}

export async function placeAuctionBidAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  ownerToken?: string | null;
  teamId?: string;
  amount: number;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
    ownerToken: input.ownerToken,
  });
  if (!access) return { ok: false, message: "Tournament not found." };

  const { tournament, isAdmin, ownerTeam } = access;
  const resolvedTeamId = isAdmin
    ? input.teamId || ownerTeam?.id || ""
    : ownerTeam?.id || "";

  if (!isAdmin && !ownerTeam) {
    return { ok: false, message: "Only verified team owners or admins can bid." };
  }
  if (!resolvedTeamId) {
    return { ok: false, message: "Select a team to place a bid." };
  }
  if (tournament.auctionStatus !== "LIVE") {
    return { ok: false, message: "Auction is currently paused or not live." };
  }
  if (!tournament.currentAuctionPlayerId) {
    return { ok: false, message: "No player is currently on the block." };
  }

  const player = db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.id, tournament.currentAuctionPlayerId),
        eq(tournamentPlayers.tournamentId, tournament.id)
      )
    )
    .get();
  if (!player) return { ok: false, message: "Player on the block was not found." };

  const team = db
    .select()
    .from(tournamentTeams)
    .where(
      and(
        eq(tournamentTeams.id, resolvedTeamId),
        eq(tournamentTeams.tournamentId, tournament.id)
      )
    )
    .get();
  if (!team) return { ok: false, message: "Team not found in this tournament." };

  if (tournament.currentHighestTeamId === team.id && tournament.currentHighestBid > 0) {
    return { ok: false, message: `${team.name} already holds the highest bid.` };
  }

  const minAllowedBid =
    tournament.currentHighestBid > 0
      ? tournament.currentHighestBid + tournament.auctionBidIncrement
      : player.basePrice || tournament.auctionBasePrice;

  const bidAmount = Math.round(Number(input.amount || 0));
  if (bidAmount < minAllowedBid) {
    return {
      ok: false,
      message: `Minimum valid bid is Rs. ${minAllowedBid}.`,
    };
  }

  const squadPlayers = db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, tournament.id),
        eq(tournamentPlayers.teamId, team.id)
      )
    )
    .all();

  if (squadPlayers.length >= tournament.auctionMaxSquadSize) {
    return {
      ok: false,
      message: `${team.name} has reached the max squad size (${tournament.auctionMaxSquadSize}).`,
    };
  }

  const teamBudget = team.purseBudget ?? tournament.auctionPurse;
  const spent = squadPlayers.reduce((sum, p) => sum + p.soldPrice, 0);
  const remaining = Math.max(0, teamBudget - spent);

  // Reserve minimum base price for any remaining mandatory squad slots
  const slotsLeftAfterThis = Math.max(
    0,
    tournament.auctionMinSquadSize - (squadPlayers.length + 1)
  );
  const maxSafeBid = Math.max(
    0,
    remaining - slotsLeftAfterThis * tournament.auctionBasePrice
  );

  if (bidAmount > remaining) {
    return {
      ok: false,
      message: `Insufficient purse for ${team.name} (remaining Rs. ${remaining}).`,
    };
  }
  if (bidAmount > maxSafeBid) {
    return {
      ok: false,
      message: `Max safe bid for ${team.name} is Rs. ${maxSafeBid} (must keep reserve for ${slotsLeftAfterThis} more mandatory slot${slotsLeftAfterThis === 1 ? "" : "s"}).`,
    };
  }

  const bidderLabel = isAdmin && !ownerTeam
    ? `Auctioneer (${team.name})`
    : `${team.ownerName || team.name}`;

  const tx = sqlite.transaction(() => {
    db.insert(auctionBids)
      .values({
        id: crypto.randomUUID(),
        tournamentId: tournament.id,
        playerId: player.id,
        teamId: team.id,
        amount: bidAmount,
        bidderRole: isAdmin && !ownerTeam ? "ADMIN" : "OWNER",
        bidderLabel,
      })
      .run();

    db.update(tournaments)
      .set({
        currentHighestBid: bidAmount,
        currentHighestTeamId: team.id,
      })
      .where(eq(tournaments.id, tournament.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function undoLastAuctionBidAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Organizer or co-admin permissions required." };
  }

  const { tournament } = access;
  if (!tournament.currentAuctionPlayerId) {
    return { ok: false, message: "No active lot on the block." };
  }

  const bids = db
    .select()
    .from(auctionBids)
    .where(
      and(
        eq(auctionBids.tournamentId, tournament.id),
        eq(auctionBids.playerId, tournament.currentAuctionPlayerId)
      )
    )
    .orderBy(desc(auctionBids.createdAt))
    .all();

  if (bids.length === 0) {
    return { ok: false, message: "No bids to undo for this player." };
  }

  const [latest, previous] = bids;
  const tx = sqlite.transaction(() => {
    db.delete(auctionBids).where(eq(auctionBids.id, latest.id)).run();
    db.update(tournaments)
      .set({
        currentHighestBid: previous ? previous.amount : 0,
        currentHighestTeamId: previous ? previous.teamId : null,
      })
      .where(eq(tournaments.id, tournament.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function finalizeAuctionLotAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  outcome: "SOLD" | "UNSOLD";
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Organizer or co-admin permissions required." };
  }

  const { tournament } = access;
  if (!tournament.currentAuctionPlayerId) {
    return { ok: false, message: "No player is currently on the block." };
  }

  if (
    input.outcome === "SOLD" &&
    (!tournament.currentHighestTeamId || tournament.currentHighestBid <= 0)
  ) {
    return {
      ok: false,
      message: "Place at least one valid bid before marking SOLD.",
    };
  }

  const playerId = tournament.currentAuctionPlayerId;
  const tx = sqlite.transaction(() => {
    if (input.outcome === "SOLD" && tournament.currentHighestTeamId) {
      db.update(tournamentPlayers)
        .set({
          teamId: tournament.currentHighestTeamId,
          soldPrice: tournament.currentHighestBid,
          auctionStatus: "SOLD",
        })
        .where(eq(tournamentPlayers.id, playerId))
        .run();
      recalculateTeamPurseSpent(tournament.id);
    } else {
      db.update(tournamentPlayers)
        .set({
          teamId: null,
          soldPrice: 0,
          isCaptain: false,
          auctionStatus: "UNSOLD",
        })
        .where(eq(tournamentPlayers.id, playerId))
        .run();
    }

    db.update(tournaments)
      .set({
        currentAuctionPlayerId: null,
        currentHighestBid: 0,
        currentHighestTeamId: null,
      })
      .where(eq(tournaments.id, tournament.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true };
}

export async function requeueUnsoldPlayersAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
}): Promise<{ ok: boolean; count?: number; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Organizer or co-admin permissions required." };
  }

  const unsold = db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, access.tournament.id),
        eq(tournamentPlayers.auctionStatus, "UNSOLD")
      )
    )
    .all();

  if (unsold.length === 0) {
    return { ok: false, message: "No unsold players to re-queue." };
  }

  db.update(tournamentPlayers)
    .set({ auctionStatus: "PENDING" })
    .where(
      and(
        eq(tournamentPlayers.tournamentId, access.tournament.id),
        eq(tournamentPlayers.auctionStatus, "UNSOLD")
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  return { ok: true, count: unsold.length };
}

export async function updateTournamentPlayerMetaAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  playerId: string;
  name?: string;
  category?: string;
  skillTier?: string;
  basePrice?: number;
  customRating?: number | null;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access || !access.isAdmin) {
    return { ok: false, message: "Organizer or co-admin permissions required." };
  }

  db.update(tournamentPlayers)
    .set({
      ...(input.name && input.name.trim().length >= 2
        ? { name: input.name.trim() }
        : {}),
      ...(input.category ? { category: input.category.trim() } : {}),
      ...(input.skillTier ? { skillTier: input.skillTier.trim() } : {}),
      ...(input.basePrice !== undefined
        ? { basePrice: Math.max(0, Number(input.basePrice)) }
        : {}),
      ...(input.customRating !== undefined
        ? { customRating: input.customRating }
        : {}),
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
