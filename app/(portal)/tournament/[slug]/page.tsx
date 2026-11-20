import { notFound } from "next/navigation";
import { resolveTournamentAccess } from "@courtpulse/tournaments/tournament.helpers";
import {
  getLiveAuctionSnapshot,
  getTournamentDetailBySlug,
} from "@courtpulse/tournaments/tournament.queries";
import {
  TournamentDetail,
  type TournamentTab,
} from "@courtpulse/ui/tournaments/tournament-detail.component";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    adminToken?: string;
    ownerToken?: string;
    tab?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const [data, access] = await Promise.all([
    getTournamentDetailBySlug(slug),
    resolveTournamentAccess(slug, {
      adminToken: query.adminToken,
      ownerToken: query.ownerToken,
    }),
  ]);
  if (!data || !access) notFound();

  const auctionSnapshot = getLiveAuctionSnapshot(slug);
  const ownerName =
    data.owner?.displayName ||
    data.owner?.name ||
    data.owner?.email.split("@")[0] ||
    "Organizer";

  // Security hygiene: only reveal secret share tokens to verified admins (or the team's own owner)
  const sanitizedTeams = data.enrolledTeams.map((tm) => ({
    ...tm,
    ownerToken:
      access.isAdmin || access.ownerTeam?.id === tm.id ? tm.ownerToken : null,
  }));

  const allowedTabs: TournamentTab[] = [
    "points",
    "scheduler",
    "auction",
    "register",
    "teams",
    "fairplay",
    "settings",
  ];
  const initialTab = allowedTabs.includes(query.tab as TournamentTab)
    ? (query.tab as TournamentTab)
    : "points";

  return (
    <TournamentDetail
      tournament={data.tournament}
      ownerName={ownerName}
      isOwner={access.isOwner}
      isAdmin={access.isAdmin}
      adminToken={access.isAdmin ? access.tournament.adminToken : null}
      ownerToken={query.ownerToken ?? access.ownerTeam?.ownerToken ?? null}
      ownerTeamId={access.ownerTeam?.id ?? null}
      initialTab={initialTab}
      stages={data.stages}
      enrolledTeams={sanitizedTeams}
      availableTeams={data.availableTeams}
      players={data.players}
      enrollments={access.isAdmin ? data.enrollments : []}
      games={data.games}
      fairPlayLogs={data.fairPlayLogs}
      members={access.isOwner ? data.members : []}
      standings={data.standings}
      playerStats={data.playerStats}
      fairPlaySummary={data.fairPlaySummary}
      auctionSnapshot={auctionSnapshot}
    />
  );
}
