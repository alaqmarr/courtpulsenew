import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gavel } from "lucide-react";
import { resolveTournamentAccess } from "@courtpulse/tournaments/tournament.helpers";
import { getLiveAuctionSnapshot } from "@courtpulse/tournaments/tournament.queries";
import { TournamentAuction } from "@courtpulse/ui/tournaments/tournament-auction.component";

export const dynamic = "force-dynamic";

export default async function TournamentAuctionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ adminToken?: string; ownerToken?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const [access, snapshot] = await Promise.all([
    resolveTournamentAccess(slug, {
      adminToken: query.adminToken,
      ownerToken: query.ownerToken,
    }),
    Promise.resolve(getLiveAuctionSnapshot(slug)),
  ]);
  if (!access || !snapshot) notFound();

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/tournament/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {access.tournament.name}</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Gavel className="w-3.5 h-3.5 text-emerald-600" />
          <span>Live Auction Stage</span>
        </div>
      </div>

      <TournamentAuction
        tournamentSlug={slug}
        adminToken={access.isAdmin ? access.tournament.adminToken : null}
        ownerToken={query.ownerToken ?? access.ownerTeam?.ownerToken ?? null}
        initialOwnerTeamId={access.ownerTeam?.id ?? null}
        isAdmin={access.isAdmin}
        initialSnapshot={snapshot}
        standalone
      />
    </div>
  );
}
