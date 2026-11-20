import { notFound } from "next/navigation";
import { getCurrentUser } from "@courtpulse/auth/auth.helpers";
import { getTeamDetailBySlug } from "@courtpulse/teams/team.queries";
import { PublicTeamStats } from "@courtpulse/ui/teams/public-team-stats.component";

export const dynamic = "force-dynamic";

export default async function TeamStatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  const { slug } = await params;

  const data = await getTeamDetailBySlug(slug);
  if (!data) notFound();

  const ownerName =
    data.owner?.displayName ||
    data.owner?.name ||
    data.owner?.email.split("@")[0] ||
    "Owner";

  return (
    <PublicTeamStats
      team={data.team}
      ownerName={ownerName}
      memberCount={data.members.length}
      sessionCount={data.sessions.length}
      totalGames={data.games.length}
      sessions={data.sessions}
      games={data.games}
      members={data.members}
      playerStats={data.playerStats}
      winningPairs={data.winningPairs}
      canManage={Boolean(user && user.id === data.team.ownerId)}
    />
  );
}
