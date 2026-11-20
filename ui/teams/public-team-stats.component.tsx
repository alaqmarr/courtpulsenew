import Link from "next/link";
import { calculateSessionTrend } from "@courtpulse/helpers/analytics.helpers";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import type { PairStatRow, PlayerStatRow } from "@courtpulse/helpers/stats.helpers";
import { TeamStatsPanel } from "./team-stats-panel.component";

interface PublicTeamStatsProps {
  team: {
    name: string;
    slug: string;
    createdAt: Date | string;
  };
  ownerName: string;
  memberCount: number;
  sessionCount: number;
  totalGames: number;
  sessions: any[];
  games: any[];
  members: any[];
  playerStats: PlayerStatRow[];
  winningPairs: PairStatRow[];
  canManage: boolean;
}

export function PublicTeamStats({
  team,
  ownerName,
  memberCount,
  sessionCount,
  totalGames,
  sessions,
  games,
  members,
  playerStats,
  winningPairs,
  canManage,
}: PublicTeamStatsProps) {
  const topPlayer = playerStats.find((p) => p.games > 0) || playerStats[0] || null;
  const sessionTrend = calculateSessionTrend(sessions);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900">
            {team.name} standings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Owner: {ownerName} · Started {formatDateIST(team.createdAt)} ·{" "}
            {memberCount} players · {sessionCount} sessions
          </p>
        </div>

        {canManage && (
          <Link
            href={`/team/${team.slug}`}
            className="px-3.5 py-2 text-[13px] font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 rounded-lg shadow-2xs self-start sm:self-auto"
          >
            Manage team
          </Link>
        )}
      </div>

      <section className="w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl overflow-hidden shadow-[0_12px_32px_-12px_rgba(6,78,59,0.4)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Top player
            </div>
            <div className="font-display text-xl font-bold text-emerald-100 mt-1 truncate">
              {topPlayer ? `${topPlayer.name} (${topPlayer.wins}W)` : "None yet"}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Total matches
            </div>
            <div className="font-display text-2xl font-bold tracking-[-0.03em] text-white mt-1">
              {totalGames}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Best doubles pair
            </div>
            <div className="font-display text-xl font-bold text-white mt-1 truncate">
              {winningPairs[0]
                ? `${winningPairs[0].pairLabel} (${winningPairs[0].wins}W)`
                : "None yet"}
            </div>
          </div>
        </div>
      </section>

      <TeamStatsPanel
        playerStats={playerStats}
        winningPairs={winningPairs}
        games={games}
        members={members}
        sessionTrend={sessionTrend}
      />
    </div>
  );
}
