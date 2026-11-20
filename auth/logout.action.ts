"use server";

import { signOut } from "./auth.config";

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/sign-in" });
}
