"use server";

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import {
  db,
  sqlite,
  tournamentEnrollments,
  tournamentPlayers,
  tournaments,
} from "@courtpulse/database";
import { emailSchema } from "@courtpulse/helpers/validation.helpers";
import { resolveTournamentAccess } from "./tournament.helpers";

export async function submitTournamentEnrollmentAction(input: {
  tournamentSlug: string;
  name: string;
  email: string;
  mobile: string;
  category?: string;
  skillTier?: string;
  notes?: string;
  paymentMode: "UPI" | "CASH";
  transactionId?: string;
  paymentScreenshotUrl?: string;
}): Promise<{ ok: boolean; status?: string; message?: string }> {
  const currentUser = await getCurrentUser();
  const tournament = db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, input.tournamentSlug))
    .get();

  if (!tournament) return { ok: false, message: "Tournament not found." };
  if (!tournament.isActive || !tournament.registrationOpen) {
    return {
      ok: false,
      message: "Registrations are currently closed for this tournament.",
    };
  }

  const parsedEmail = emailSchema.safeParse(input.email);
  if (!parsedEmail.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    return { ok: false, message: "Enter your full name." };
  }

  const cleanMobile = input.mobile.trim();
  if (cleanMobile.length < 8) {
    return { ok: false, message: "Enter a valid phone number." };
  }

  if (
    tournament.entryFee > 0 &&
    input.paymentMode === "UPI" &&
    !input.transactionId?.trim() &&
    !input.paymentScreenshotUrl
  ) {
    return {
      ok: false,
      message: "Provide a UPI transaction reference ID or payment screenshot.",
    };
  }

  // Prevent accidental duplicate submissions with identical email
  const existing = db
    .select()
    .from(tournamentEnrollments)
    .where(
      and(
        eq(tournamentEnrollments.tournamentId, tournament.id),
        eq(tournamentEnrollments.email, parsedEmail.data)
      )
    )
    .get();

  if (existing && existing.status !== "REJECTED") {
    return {
      ok: false,
      message: `You have already registered with this email (status: ${existing.status}).`,
    };
  }

  if (existing && existing.status === "REJECTED") {
    db.update(tournamentEnrollments)
      .set({
        name: cleanName,
        mobile: cleanMobile,
        category: input.category?.trim() || "All-Rounder",
        skillTier: input.skillTier?.trim() || "Tier B",
        notes: input.notes?.trim() || null,
        paymentMode: input.paymentMode,
        transactionId: input.transactionId?.trim() || null,
        paymentScreenshotUrl: input.paymentScreenshotUrl || null,
        status: "PENDING",
        adminNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(tournamentEnrollments.id, existing.id))
      .run();
  } else {
    db.insert(tournamentEnrollments)
      .values({
        id: crypto.randomUUID(),
        tournamentId: tournament.id,
        userId: currentUser?.id ?? null,
        name: cleanName,
        email: parsedEmail.data,
        mobile: cleanMobile,
        category: input.category?.trim() || "All-Rounder",
        skillTier: input.skillTier?.trim() || "Tier B",
        notes: input.notes?.trim() || null,
        paymentMode: input.paymentMode,
        transactionId: input.transactionId?.trim() || null,
        paymentScreenshotUrl: input.paymentScreenshotUrl || null,
        status: "PENDING",
      })
      .run();
  }

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/register`);
  return { ok: true, status: "PENDING" };
}

export async function lookupEnrollmentStatusAction(input: {
  tournamentSlug: string;
  query: string;
}): Promise<{
  ok: boolean;
  found?: boolean;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  name?: string;
  paymentMode?: string;
  adminNotes?: string | null;
  teamName?: string | null;
  soldPrice?: number;
  message?: string;
}> {
  const tournament = db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, input.tournamentSlug))
    .get();
  if (!tournament) return { ok: false, message: "Tournament not found." };

  const clean = input.query.trim().toLowerCase();
  if (clean.length < 3) {
    return { ok: false, message: "Enter your email or mobile number." };
  }

  const allEnrollments = db
    .select()
    .from(tournamentEnrollments)
    .where(eq(tournamentEnrollments.tournamentId, tournament.id))
    .all();

  const match = allEnrollments.find(
    (e) =>
      e.email.toLowerCase() === clean ||
      e.mobile.replace(/\s+/g, "").endsWith(clean.replace(/\s+/g, ""))
  );
  if (!match) {
    return { ok: true, found: false };
  }

  const player = db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, tournament.id),
        eq(tournamentPlayers.email, match.email)
      )
    )
    .get();

  return {
    ok: true,
    found: true,
    status: match.status,
    name: match.name,
    paymentMode: match.paymentMode,
    adminNotes: match.adminNotes,
    soldPrice: player?.soldPrice ?? 0,
  };
}

export async function reviewTournamentEnrollmentAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  enrollmentId: string;
  status: "APPROVED" | "REJECTED";
  adminNotes?: string;
  basePrice?: number;
  skillTier?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access) return { ok: false, message: "Tournament not found." };
  if (!access.isAdmin) {
    return { ok: false, message: "Only organizers or co-admins can verify registrations." };
  }

  const { tournament } = access;
  const enrollment = db
    .select()
    .from(tournamentEnrollments)
    .where(
      and(
        eq(tournamentEnrollments.id, input.enrollmentId),
        eq(tournamentEnrollments.tournamentId, tournament.id)
      )
    )
    .get();
  if (!enrollment) return { ok: false, message: "Registration not found." };

  const tx = sqlite.transaction(() => {
    db.update(tournamentEnrollments)
      .set({
        status: input.status,
        adminNotes: input.adminNotes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(tournamentEnrollments.id, enrollment.id))
      .run();

    if (input.status === "APPROVED") {
      const existingPlayer = db
        .select()
        .from(tournamentPlayers)
        .where(
          and(
            eq(tournamentPlayers.tournamentId, tournament.id),
            eq(tournamentPlayers.email, enrollment.email)
          )
        )
        .get();

      if (!existingPlayer) {
        db.insert(tournamentPlayers)
          .values({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            userId: enrollment.userId,
            name: enrollment.name,
            email: enrollment.email,
            mobile: enrollment.mobile,
            category: enrollment.category,
            skillTier: input.skillTier?.trim() || enrollment.skillTier,
            basePrice: Math.max(
              0,
              Number(input.basePrice ?? tournament.auctionBasePrice)
            ),
            auctionStatus: "PENDING",
          })
          .run();
      }
    }
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  revalidatePath(`/tournament/${input.tournamentSlug}/auction`);
  revalidatePath(`/tournament/${input.tournamentSlug}/register`);
  return { ok: true };
}

export async function deleteTournamentEnrollmentAction(input: {
  tournamentSlug: string;
  adminToken?: string | null;
  enrollmentId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const access = await resolveTournamentAccess(input.tournamentSlug, {
    adminToken: input.adminToken,
  });
  if (!access) return { ok: false, message: "Tournament not found." };
  if (!access.isAdmin) {
    return { ok: false, message: "Organizer permissions required." };
  }

  db.delete(tournamentEnrollments)
    .where(
      and(
        eq(tournamentEnrollments.id, input.enrollmentId),
        eq(tournamentEnrollments.tournamentId, access.tournament.id)
      )
    )
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/tournament/${input.tournamentSlug}`);
  return { ok: true };
}
