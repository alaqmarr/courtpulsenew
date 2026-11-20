"use server";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import { db, sqlite, teamMembers, teams, users } from "@courtpulse/database";
import { canCreateTeam } from "@courtpulse/helpers/quota.helpers";
import { toSlug } from "@courtpulse/helpers/slug.helpers";
import { createTeamSchema } from "@courtpulse/helpers/validation.helpers";

export async function createTeamAction(input: {
  name: string;
}): Promise<{ ok: boolean; slug?: string; message?: string }> {
  const user = await requireUser();
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Enter a valid team name.",
    };
  }

  if (!canCreateTeam(user.packageType, user.teamCount, user.teamQuota)) {
    return {
      ok: false,
      message: "Your current plan does not allow creating another team.",
    };
  }

  const slug = toSlug(parsed.data.name);
  const existing = db.select().from(teams).where(eq(teams.slug, slug)).get();
  if (existing) {
    return { ok: false, message: "A team with that name already exists." };
  }

  const teamId = crypto.randomUUID();
  const displayName = user.displayName || user.name || user.email.split("@")[0];

  const tx = sqlite.transaction(() => {
    db.insert(teams)
      .values({
        id: teamId,
        name: parsed.data.name,
        slug,
        ownerId: user.id,
      })
      .run();

    db.insert(teamMembers)
      .values({
        id: crypto.randomUUID(),
        teamId,
        userId: user.id,
        email: user.email,
        displayName,
        role: "OWNER",
      })
      .run();

    db.update(users)
      .set({ teamCount: user.teamCount + 1 })
      .where(eq(users.id, user.id))
      .run();
  });

  tx();
  await invalidateAllAppCaches();
  revalidatePath("/");
  return { ok: true, slug };
}
