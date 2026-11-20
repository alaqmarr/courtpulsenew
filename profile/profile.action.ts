"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import { db, teamMembers, users } from "@courtpulse/database";

export async function updateProfileAction(input: {
  displayName: string;
  bio: string;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const cleanName = input.displayName.trim();
  if (cleanName.length < 2) {
    return { ok: false, message: "Display name must be at least 2 characters." };
  }

  const cleanBio = input.bio.trim().slice(0, 300);

  db.update(users)
    .set({
      displayName: cleanName,
      name: cleanName,
      bio: cleanBio || null,
    })
    .where(eq(users.id, user.id))
    .run();

  db.update(teamMembers)
    .set({ displayName: cleanName })
    .where(eq(teamMembers.userId, user.id))
    .run();

  await invalidateAllAppCaches();
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
