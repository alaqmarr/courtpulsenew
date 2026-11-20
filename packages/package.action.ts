"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { invalidateAllAppCaches } from "@courtpulse/connections/cache.connection";
import { db, users, type PackageType } from "@courtpulse/database";
import { PACKAGE_PLANS } from "@courtpulse/helpers/quota.helpers";

export async function updatePackageAction(
  packageType: PackageType
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const plan = PACKAGE_PLANS.find((p) => p.type === packageType);
  if (!plan) {
    return { ok: false, message: "Invalid plan selected." };
  }

  db.update(users)
    .set({
      packageType: plan.type,
      teamQuota: plan.teamQuota,
      tournamentQuota: plan.tournamentQuota,
    })
    .where(eq(users.id, user.id))
    .run();

  await invalidateAllAppCaches();
  revalidatePath("/");
  revalidatePath("/packages");
  return { ok: true };
}
