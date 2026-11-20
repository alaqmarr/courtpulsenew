import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users, type UserRecord } from "@courtpulse/database";
import { auth } from "./auth.config";

export const getCurrentUser = cache(async (): Promise<UserRecord | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();

  if (!userId && !email) return null;

  if (userId) {
    const byId = db.select().from(users).where(eq(users.id, userId)).get();
    if (byId) return byId;
  }

  if (email) {
    const byEmail = db.select().from(users).where(eq(users.email, email)).get();
    if (byEmail) return byEmail;
  }

  return null;
});

export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
