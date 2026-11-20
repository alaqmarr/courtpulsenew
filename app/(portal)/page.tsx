import { redirect } from "next/navigation";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { getDashboardData } from "@courtpulse/teams/team.queries";
import { DashboardView } from "@courtpulse/ui/dashboard/dashboard-view.component";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  if (!data) redirect("/sign-in");

  return (
    <DashboardView
      user={data.user}
      teams={data.teams}
      tournaments={data.tournaments}
      recentSessions={data.recentSessions}
      recentMatches={data.recentMatches}
      stats={data.stats}
      teamChartStats={data.teamChartStats}
    />
  );
}
