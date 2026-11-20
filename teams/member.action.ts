"use server";

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import { db, sqlite, teamMembers, teams, users } from "@courtpulse/database";
import { addMemberSchema } from "@courtpulse/helpers/validation.helpers";

export async function addTeamMemberAction(input: {
  teamSlug: string;
  email: string;
  displayName?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const current = await requireUser();
  const parsed = addMemberSchema.safeParse({
    email: input.email,
    displayName: input.displayName,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Enter a valid member email.",
    };
  }

  const team = db.select().from(teams).where(eq(teams.slug, input.teamSlug)).get();
  if (!team) return { ok: false, message: "Team not found." };
  if (team.ownerId !== current.id) {
    return { ok: false, message: "Only the team owner can add players." };
  }

  const email = parsed.data.email;
  const duplicate = db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.email, email)))
    .get();

  if (duplicate) {
    return { ok: false, message: "This player is already in the team." };
  }

  const tx = sqlite.transaction(() => {
    let targetUser = db.select().from(users).where(eq(users.email, email)).get();
    const cleanName = parsed.data.displayName?.trim() || undefined;

    if (!targetUser) {
      const newUserId = crypto.randomUUID();
      db.insert(users)
        .values({
          id: newUserId,
          email,
          name: cleanName ?? email.split("@")[0],
          displayName: cleanName ?? null,
          mustResetPassword: true,
          packageType: "FREE",
          teamQuota: 0,
          tournamentQuota: 0,
        })
        .run();
      targetUser = db.select().from(users).where(eq(users.id, newUserId)).get()!;
    }

    db.insert(teamMembers)
      .values({
        id: crypto.randomUUID(),
        teamId: team.id,
        userId: targetUser.id,
        email,
        displayName: cleanName ?? targetUser.displayName ?? targetUser.name ?? email.split("@")[0],
        role: "MEMBER",
      })
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}`);
  return { ok: true };
}

export async function bulkAddTeamMembersAction(input: {
  teamSlug: string;
  rows: { email: string; displayName?: string }[];
}): Promise<{ ok: boolean; added: number; skipped: number; message?: string }> {
  const current = await requireUser();
  const team = db.select().from(teams).where(eq(teams.slug, input.teamSlug)).get();
  if (!team) return { ok: false, added: 0, skipped: 0, message: "Team not found." };
  if (team.ownerId !== current.id) {
    return { ok: false, added: 0, skipped: 0, message: "Only the team owner can add players." };
  }

  let added = 0;
  let skipped = 0;

  const tx = sqlite.transaction(() => {
    for (const row of input.rows) {
      const parsed = addMemberSchema.safeParse(row);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const email = parsed.data.email;
      const existing = db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.email, email)))
        .get();

      if (existing) {
        skipped += 1;
        continue;
      }

      let targetUser = db.select().from(users).where(eq(users.email, email)).get();
      const cleanName = parsed.data.displayName?.trim() || undefined;
      if (!targetUser) {
        const newUserId = crypto.randomUUID();
        db.insert(users)
          .values({
            id: newUserId,
            email,
            name: cleanName ?? email.split("@")[0],
            displayName: cleanName ?? null,
            mustResetPassword: true,
            packageType: "FREE",
            teamQuota: 0,
            tournamentQuota: 0,
          })
          .run();
        targetUser = db.select().from(users).where(eq(users.id, newUserId)).get()!;
      }

      db.insert(teamMembers)
        .values({
          id: crypto.randomUUID(),
          teamId: team.id,
          userId: targetUser.id,
          email,
          displayName: cleanName ?? targetUser.displayName ?? targetUser.name ?? email.split("@")[0],
          role: "MEMBER",
        })
        .run();
      added += 1;
    }
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}`);
  return { ok: true, added, skipped };
}

export async function removeTeamMemberAction(input: {
  teamSlug: string;
  memberId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const team = db.select().from(teams).where(eq(teams.slug, input.teamSlug)).get();
  if (!team) return { ok: false, message: "Team not found." };
  if (team.ownerId !== user.id) {
    return { ok: false, message: "Only the team owner can remove players." };
  }

  db.delete(teamMembers)
    .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, team.id)))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}`);
  return { ok: true };
}

export async function updateTeamMemberDisplayNameAction(input: {
  teamSlug: string;
  memberId: string;
  displayName: string;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const cleanName = input.displayName.trim();
  if (cleanName.length < 1) {
    return { ok: false, message: "Enter a display name." };
  }
  if (cleanName.length > 60) {
    return { ok: false, message: "Display name must be 60 characters or fewer." };
  }

  const team = db.select().from(teams).where(eq(teams.slug, input.teamSlug)).get();
  if (!team) return { ok: false, message: "Team not found." };

  const callerMember = db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, user.id)))
    .get();
  const isAdmin =
    team.ownerId === user.id ||
    callerMember?.role === "OWNER" ||
    callerMember?.role === "MANAGER";

  if (!isAdmin) {
    return { ok: false, message: "Only a team admin can edit display names." };
  }

  const target = db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, team.id)))
    .get();
  if (!target) {
    return { ok: false, message: "Player not found in this team." };
  }

  db.update(teamMembers)
    .set({ displayName: cleanName })
    .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, team.id)))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}`, "layout");
  revalidatePath(`/team/${input.teamSlug}/stats`);
  revalidatePath("/");
  return { ok: true };
}

export async function toggleTeamMemberActiveAction(input: {
  teamSlug: string;
  memberId: string;
  isActive: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const team = db.select().from(teams).where(eq(teams.slug, input.teamSlug)).get();
  if (!team) return { ok: false, message: "Team not found." };

  const callerMember = db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, user.id)))
    .get();
  const isAdmin =
    team.ownerId === user.id ||
    callerMember?.role === "OWNER" ||
    callerMember?.role === "MANAGER";

  if (!isAdmin) {
    return { ok: false, message: "Only a team admin can update player status." };
  }

  const target = db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, team.id)))
    .get();
  if (!target) {
    return { ok: false, message: "Player not found in this team." };
  }

  db.update(teamMembers)
    .set({ isActive: input.isActive })
    .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, team.id)))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}`, "layout");
  revalidatePath(`/team/${input.teamSlug}/session/new`);
  revalidatePath(`/team/${input.teamSlug}/stats`);
  revalidatePath("/");
  return { ok: true };
}
