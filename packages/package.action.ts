"use server";

import { requireUser } from "@courtpulse/auth/auth.helpers";
import type { PackageType } from "@courtpulse/database/schema.enums";

export async function updatePackageAction(
  _packageType: PackageType
): Promise<{ ok: boolean; message?: string }> {
  await requireUser();
  return {
    ok: false,
    message:
      "Self-service plan switching is disabled. Use Request upgrade or contact support.",
  };
}
