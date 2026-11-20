"use server";

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import {
  db,
  sessionParticipants,
  sessions,
  sqlite,
  teamMembers,
  teams,
} from "@courtpulse/database";
import { generateSlug } from "@courtpulse/helpers/slug.helpers";
import { createSessionSchema } from "@courtpulse/helpers/validation.helpers";
import { resolveTeamPermissionsBySlug } from "./permissions.helpers";

export async function createSessionAction(input: {
  teamSlug: string;
  name?: string;
  date: string;
  includedMemberIds?: string[];
}): Promise<{ ok: boolean; sessionSlug?: string; message?: string }> {
  const user = await requireUser();
  const parsed = createSessionSchema.safeParse({
    name: input.name,
    date: input.date,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid session details.",
    };
  }

  const access = resolveTeamPermissionsBySlug(input.teamSlug, user.id, user.email);
  if (!access) return { ok: false, message: "Team not found." };
  if (!access.perms.canCreateSessions) {
    return { ok: false, message: "You do not have permission to create sessions." };
  }
  const { team } = access;

  const parsedDate = new Date(parsed.data.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { ok: false, message: "Invalid date." };
  }

  const datePart = parsedDate.toISOString().split("T")[0];
  const base = `${team.slug}-${datePart}${parsed.data.name ? `-${parsed.data.name}` : ""}`;
  const sessionSlug = generateSlug(base);

  const members = db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id))
    .all();

  const includedSet = input.includedMemberIds
    ? new Set(input.includedMemberIds)
    : null;

  const tx = sqlite.transaction(() => {
    db.insert(sessions)
      .values({
        id: sessionSlug,
        slug: sessionSlug,
        teamId: team.id,
        name: parsed.data.name || null,
        date: parsedDate,
      })
      .run();

    for (const m of members) {
      db.insert(sessionParticipants)
        .values({
          id: crypto.randomUUID(),
          sessionId: sessionSlug,
          memberId: m.id,
          isSelected: m.isActive
            ? includedSet
              ? includedSet.has(m.id)
              : true
            : false,
        })
        .onConflictDoNothing()
        .run();
    }
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}`);
  return { ok: true, sessionSlug };
}

export async function toggleSessionParticipantAction(input: {
  teamSlug: string;
  sessionSlug: string;
  memberId: string;
  isSelected: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const access = resolveTeamPermissionsBySlug(input.teamSlug, user.id, user.email);
  if (!access) return { ok: false, message: "Team not found." };
  if (!access.perms.canManageAttendance) {
    return {
      ok: false,
      message: "You do not have permission to manage session players.",
    };
  }
  const { team } = access;

  const session = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.slug, input.sessionSlug), eq(sessions.teamId, team.id)))
    .get();
  if (!session) return { ok: false, message: "Session not found." };

  const existing = db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, session.id),
        eq(sessionParticipants.memberId, input.memberId)
      )
    )
    .get();

  if (existing) {
    db.update(sessionParticipants)
      .set({ isSelected: input.isSelected })
      .where(eq(sessionParticipants.id, existing.id))
      .run();
  } else {
    db.insert(sessionParticipants)
      .values({
        id: crypto.randomUUID(),
        sessionId: session.id,
        memberId: input.memberId,
        isSelected: input.isSelected,
      })
      .run();
  }

  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}/session/${input.sessionSlug}`);
  return { ok: true };
}

export async function setSessionParticipantsBulkAction(input: {
  teamSlug: string;
  sessionSlug: string;
  isSelected: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const access = resolveTeamPermissionsBySlug(input.teamSlug, user.id, user.email);
  if (!access) return { ok: false, message: "Team not found." };
  if (!access.perms.canManageAttendance) {
    return {
      ok: false,
      message: "You do not have permission to manage session players.",
    };
  }
  const { team } = access;

  const session = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.slug, input.sessionSlug), eq(sessions.teamId, team.id)))
    .get();
  if (!session) return { ok: false, message: "Session not found." };

  const members = db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id))
    .all();

  const tx = sqlite.transaction(() => {
    for (const m of members) {
      const existing = db
        .select()
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.sessionId, session.id),
            eq(sessionParticipants.memberId, m.id)
          )
        )
        .get();

      const nextSelected = m.isActive ? input.isSelected : false;
      if (existing) {
        db.update(sessionParticipants)
          .set({ isSelected: nextSelected })
          .where(eq(sessionParticipants.id, existing.id))
          .run();
      } else {
        db.insert(sessionParticipants)
          .values({
            id: crypto.randomUUID(),
            sessionId: session.id,
            memberId: m.id,
            isSelected: nextSelected,
          })
          .run();
      }
    }
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}/session/${input.sessionSlug}`);
  return { ok: true };
}

export async function deleteSessionAction(input: {
  teamSlug: string;
  sessionSlug: string;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const access = resolveTeamPermissionsBySlug(input.teamSlug, user.id, user.email);
  if (!access) return { ok: false, message: "Team not found." };
  if (!access.perms.isManager) {
    return { ok: false, message: "Only team owners or managers can delete sessions." };
  }
  const { team } = access;

  db.delete(sessions)
    .where(and(eq(sessions.slug, input.sessionSlug), eq(sessions.teamId, team.id)))
    .run();

  await invalidateAllAppCaches();
  revalidatePath(`/team/${input.teamSlug}`);
  return { ok: true };
}
