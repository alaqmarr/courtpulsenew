import { notFound } from "next/navigation";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { computeTeamPermissions } from "@courtpulse/teams/permissions.helpers";
import { getTeamDetailBySlug } from "@courtpulse/teams/team.queries";
import { TeamDetail } from "@courtpulse/ui/teams/team-detail.component";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const data = await getTeamDetailBySlug(slug);
  if (!data) notFound();

  const ownerName =
    data.owner?.displayName ||
    data.owner?.name ||
    data.owner?.email.split("@")[0] ||
    "Owner";

  const permissions = computeTeamPermissions(
    data.team.ownerId,
    data.members,
    user.id,
    user.email
  );

  return (
    <TeamDetail
      team={data.team}
      ownerName={ownerName}
      isOwner={permissions.isManager}
      permissions={permissions}
      members={data.members}
      sessions={data.sessions}
      games={data.games}
      playerStats={data.playerStats}
      winningPairs={data.winningPairs}
      totalGames={data.games.length}
    />
  );
}
