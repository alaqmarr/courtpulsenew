"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  Copy,
  Gavel,
  Radio,
  Settings,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { sileo } from "sileo";
import type { AuctionStatus } from "@courtpulse/database/schema.enums";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import type {
  TournamentPlayerStatRow,
  TournamentStandingRow,
} from "@courtpulse/tournaments/tournament.helpers";
import { toggleTournamentStatusAction } from "@courtpulse/tournaments/tournament.action";
import { TournamentAuction } from "./tournament-auction.component";
import {
  TournamentEnrollments,
  type EnrollmentItem,
} from "./tournament-enrollments.component";
import { TournamentFairPlay } from "./tournament-fairplay.component";
import { TournamentPointsPanel } from "./tournament-points-panel.component";
import { TournamentScheduler } from "./tournament-scheduler.component";
import { TournamentSettingsForm } from "./tournament-settings-form.component";
import {
  TournamentTeamsLinks,
  type TeamHubItem,
} from "./tournament-teams-links.component";

export type TournamentTab =
  | "points"
  | "scheduler"
  | "auction"
  | "register"
  | "teams"
  | "fairplay"
  | "settings";

export function TournamentDetail({
  tournament,
  ownerName,
  isOwner,
  isAdmin,
  adminToken,
  ownerToken,
  ownerTeamId,
  initialTab = "points",
  stages,
  enrolledTeams,
  availableTeams,
  players,
  enrollments,
  games,
  fairPlayLogs,
  members,
  standings,
  playerStats,
  fairPlaySummary,
  auctionSnapshot,
}: {
  tournament: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    rules: string | null;
    bannerUrl: string | null;
    thumbnailUrl: string | null;
    isActive: boolean;
    registrationOpen: boolean;
    minGamesPerPlayer: number;
    courts: number;
    entryFee: number;
    paymentUpi: string | null;
    paymentQrCode: string | null;
    cashContactName: string | null;
    cashContactNumber: string | null;
    contactPhone: string | null;
    auctionPurse: number;
    auctionBasePrice: number;
    auctionBidIncrement: number;
    auctionMinSquadSize: number;
    auctionMaxSquadSize: number;
    auctionStatus: AuctionStatus;
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    pointsToWin: number;
    fairPlayPenaltyPoints: number;
    useCustomStats: boolean;
    startDate: Date | string | null;
    endDate: Date | string | null;
    createdAt: Date | string;
  };
  ownerName: string;
  isOwner: boolean;
  isAdmin: boolean;
  adminToken?: string | null;
  ownerToken?: string | null;
  ownerTeamId?: string | null;
  initialTab?: TournamentTab;
  stages: { id: string; name: string; order: number }[];
  enrolledTeams: TeamHubItem[];
  availableTeams: { id: string; name: string }[];
  players: any[];
  enrollments: EnrollmentItem[];
  games: any[];
  fairPlayLogs: any[];
  members: {
    id: string;
    userId: string;
    role: string;
    name: string | null;
    email: string | null;
  }[];
  standings: TournamentStandingRow[];
  playerStats: TournamentPlayerStatRow[];
  fairPlaySummary: {
    minGamesPerPlayer: number;
    totalPlayers: number;
    rosteredCount: number;
    checkedInCount: number;
    behindQuotaCount: number;
    projectedBehindCount: number;
    complianceRate: number;
  };
  auctionSnapshot: any;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TournamentTab>(initialTab);
  const [copiedReg, setCopiedReg] = useState(false);

  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      toggleTournamentStatusAction({
        tournamentSlug: tournament.slug,
        adminToken,
        isActive: !tournament.isActive,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update status." });
        return;
      }
      sileo.success({
        title: tournament.isActive
          ? "Tournament marked finished"
          : "Tournament reopened",
      });
      router.refresh();
    },
  });

  const copyQuickLink = (path: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    setCopiedReg(true);
    sileo.success({ title: "Link copied" });
    setTimeout(() => setCopiedReg(false), 1600);
  };

  const tabs: { key: TournamentTab; label: string; icon: any }[] = [
    { key: "points", label: "Points & standings", icon: Trophy },
    { key: "scheduler", label: `Scheduler (${games.length})`, icon: CalendarClock },
    { key: "auction", label: `Auction (${players.length})`, icon: Gavel },
    {
      key: "register",
      label: `Registrations (${enrollments.length})`,
      icon: UserPlus,
    },
    { key: "teams", label: `Teams & links (${enrolledTeams.length})`, icon: Users },
    { key: "fairplay", label: "Fair play", icon: ShieldCheck },
    ...(isAdmin
      ? [{ key: "settings" as const, label: "Settings", icon: Settings }]
      : []),
  ];

  return (
    <div className="w-full space-y-5">
      {tournament.bannerUrl && (
        <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <img
            src={tournament.bannerUrl}
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Hero Header */}
      <section className="cp-fade-up w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_-12px_rgba(6,78,59,0.4)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  tournament.isActive
                    ? "bg-emerald-300/20 text-emerald-100 border border-emerald-200/30"
                    : "bg-slate-900/40 text-slate-200"
                }`}
              >
                {tournament.isActive ? "Active tournament" : "Finished"}
              </span>
              {tournament.auctionStatus === "LIVE" && (
                <a
                  href={`/tournament/${tournament.slug}/auction`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-300 text-amber-950"
                >
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Live auction</span>
                </a>
              )}
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white">
                  {isOwner ? "Organizer" : "Co-Admin"}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-[30px] font-bold text-white leading-tight">
              {tournament.name}
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/85">
              Host: {ownerName} · Created {formatDateIST(tournament.createdAt)} ·{" "}
              {tournament.courts} court{tournament.courts === 1 ? "" : "s"} ·{" "}
              {tournament.entryFee > 0
                ? `Entry Rs. ${tournament.entryFee}`
                : "Free entry"}{" "}
              · Min {tournament.minGamesPerPlayer} matches/player
            </p>
            {tournament.description && (
              <p className="text-xs text-emerald-50/90 max-w-3xl">
                {tournament.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                copyQuickLink(`/tournament/${tournament.slug}/register`)
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-lg cursor-pointer"
            >
              {copiedReg ? (
                <Check className="w-3.5 h-3.5 text-emerald-200" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copy reg link</span>
            </button>
            <a
              href={`/tournament/${tournament.slug}/auction`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-emerald-950 hover:bg-emerald-50 rounded-lg shadow-2xs"
            >
              <Gavel className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auction stage</span>
            </a>
            {isAdmin && (
              <button
                type="button"
                disabled={toggleStatusMutation.isPending}
                onClick={() => toggleStatusMutation.mutate()}
                className="px-3 py-2 text-xs font-semibold border border-white/25 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer"
              >
                {tournament.isActive ? "Mark finished" : "Reopen"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Scrollable Navigation Tabs */}
      <div className="w-full flex items-center p-1 bg-white border border-slate-200 rounded-xl gap-1 shadow-2xs overflow-x-auto">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "points" && (
        <TournamentPointsPanel
          tournamentSlug={tournament.slug}
          adminToken={adminToken}
          isAdmin={isAdmin}
          pointsConfig={{
            winPoints: tournament.winPoints,
            drawPoints: tournament.drawPoints,
            lossPoints: tournament.lossPoints,
            pointsToWin: tournament.pointsToWin,
          }}
          standings={standings}
          playerStats={playerStats}
          teams={enrolledTeams}
          games={games}
          stages={stages}
        />
      )}

      {tab === "scheduler" && (
        <TournamentScheduler
          tournamentSlug={tournament.slug}
          adminToken={adminToken}
          courtsCount={tournament.courts}
          minGamesPerPlayer={tournament.minGamesPerPlayer}
          isAdmin={isAdmin}
          teams={enrolledTeams}
          players={players}
          stages={stages}
          games={games}
        />
      )}

      {tab === "auction" && (
        <TournamentAuction
          tournamentSlug={tournament.slug}
          adminToken={adminToken}
          ownerToken={ownerToken}
          initialOwnerTeamId={ownerTeamId}
          isAdmin={isAdmin}
          initialSnapshot={auctionSnapshot}
        />
      )}

      {tab === "register" && (
        <TournamentEnrollments
          tournamentSlug={tournament.slug}
          tournamentName={tournament.name}
          adminToken={adminToken}
          entryFee={tournament.entryFee}
          paymentUpi={tournament.paymentUpi}
          paymentQrCode={tournament.paymentQrCode}
          cashContactName={tournament.cashContactName}
          cashContactNumber={tournament.cashContactNumber}
          auctionBasePrice={tournament.auctionBasePrice}
          isActive={tournament.isActive}
          registrationOpen={tournament.registrationOpen}
          isAdmin={isAdmin}
          enrollments={enrollments}
        />
      )}

      {tab === "teams" && (
        <TournamentTeamsLinks
          tournamentSlug={tournament.slug}
          adminToken={adminToken}
          isOwner={isOwner}
          isAdmin={isAdmin}
          defaultPurse={tournament.auctionPurse}
          teams={enrolledTeams}
          availableClubTeams={availableTeams}
          members={members}
        />
      )}

      {tab === "fairplay" && (
        <TournamentFairPlay
          tournamentSlug={tournament.slug}
          adminToken={adminToken}
          isAdmin={isAdmin}
          fairPlaySummary={fairPlaySummary}
          playerStats={playerStats}
          standings={standings}
          logs={fairPlayLogs}
          penaltyStep={tournament.fairPlayPenaltyPoints}
        />
      )}

      {tab === "settings" && isAdmin && (
        <TournamentSettingsForm tournament={tournament} adminToken={adminToken} />
      )}
    </div>
  );
}
