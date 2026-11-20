import Link from "next/link";
import type { ReactNode } from "react";
import { getNavSidebarData } from "@courtpulse/teams/nav.queries";
import { BrandLogo } from "@courtpulse/ui/primitives/brand-logo.component";
import { SidebarShell } from "./sidebar-nav.component";

interface AppShellProps {
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
  } | null;
  children: ReactNode;
}

export async function AppShell({ user, children }: AppShellProps) {
  if (!user) {
    return (
      <div className="min-h-screen w-full text-[#0f172a] flex flex-col">
        <header className="w-full h-14 px-3.5 sm:px-8 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <Link href="/" className="flex items-center">
            <BrandLogo size="sm" textClassName="font-bold text-base text-[#0f172a]" />
          </Link>
          <Link
            href="/sign-in"
            className="px-3.5 py-1.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm transition-all"
          >
            Sign in
          </Link>
        </header>
        <main className="w-full flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </main>
      </div>
    );
  }

  const navData = await getNavSidebarData(user.id);

  return (
    <SidebarShell user={user} navData={navData}>
      {children}
    </SidebarShell>
  );
}
