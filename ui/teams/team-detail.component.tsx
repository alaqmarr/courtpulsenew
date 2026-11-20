"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Calendar, Users } from "lucide-react";
import { calculateSessionTrend } from "@courtpulse/helpers/analytics.helpers";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import type { PairStatRow, PlayerStatRow } from "@courtpulse/helpers/stats.helpers";
import { AddMemberPanel } from "./add-member-panel.component";
import { MemberList } from "./member-list.component";
import { SessionsList } from "./sessions-list.component";
import { TeamStatsPanel } from "./team-stats-panel.component";

type TabKey = "sessions" | "stats" | "players";

interface TeamDetailProps {
  team: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date | string;
  };
  ownerName: string;
  isOwner: boolean;
  members: any[];
  sessions: any[];
  games: any[];
  playerStats: PlayerStatRow[];
  winningPairs: PairStatRow[];
  totalGames: number;
}

export function TeamDetail({
  team,
  ownerName,
  isOwner,
  members,
  sessions,
  games,
  playerStats,
  winningPairs,
  totalGames,
}: TeamDetailProps) {
  const [tab, setTab] = useState<TabKey>("sessions");
  const topPlayer = playerStats.find((p) => p.games > 0) || null;
  const bestPair = winningPairs[0] || null;
  const sessionTrend = calculateSessionTrend(sessions);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900">
            {team.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Owner: {ownerName} · Started {formatDateIST(team.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/team/${team.slug}/stats`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 rounded-lg shadow-2xs transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Public link</span>
          </Link>
          {isOwner && <AddMemberPanel teamSlug={team.slug} />}
        </div>
      </div>

      <section className="w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl overflow-hidden shadow-[0_12px_32px_-12px_rgba(6,78,59,0.4)]">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/15">
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Total matches
            </div>
            <div className="font-display text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-white mt-1">
              {totalGames}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Sessions
            </div>
            <div className="font-display text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-white mt-1">
              {sessions.length}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Top player
            </div>
            <div className="font-display text-lg font-bold text-emerald-100 mt-1.5 truncate">
              {topPlayer ? `${topPlayer.name} (${topPlayer.wins}W)` : "None yet"}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Best pair
            </div>
            <div className="font-display text-lg font-bold text-white mt-1.5 truncate">
              {bestPair ? `${bestPair.pairLabel} (${bestPair.wins}W)` : "None yet"}
            </div>
          </div>
        </div>
      </section>

      <div className="w-full sm:w-auto inline-flex p-1 bg-white border border-slate-200 rounded-xl gap-1 shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab("sessions")}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            tab === "sessions"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Sessions ({sessions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("stats")}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            tab === "stats"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          <span>Standings &amp; pairs</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("players")}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            tab === "players"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Players ({members.length})</span>
        </button>
      </div>

      {tab === "sessions" && (
        <SessionsList
          sessions={sessions}
          teamSlug={team.slug}
          isOwner={isOwner}
        />
      )}

      {tab === "stats" && (
        <TeamStatsPanel
          playerStats={playerStats}
          winningPairs={winningPairs}
          games={games}
          members={members}
          sessionTrend={sessionTrend}
        />
      )}

      {tab === "players" && (
        <MemberList
          members={members}
          teamSlug={team.slug}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
