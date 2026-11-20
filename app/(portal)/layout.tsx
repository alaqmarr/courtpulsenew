import type { ReactNode } from "react";
import { getCurrentUser } from "@courtpulse/auth/auth.helpers";
import { AppShell } from "@courtpulse/ui/layout/app-shell.component";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
