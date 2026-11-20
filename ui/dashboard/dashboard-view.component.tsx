import Link from "next/link";
import { ArrowRight, Plus, Trophy } from "lucide-react";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import type { UserTeamSummary } from "@courtpulse/helpers/stats.helpers";
import { WinRing } from "@courtpulse/ui/primitives/win-ring.component";
import { WinRateChart } from "./win-rate-chart.component";

interface DashboardTeam {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  memberCount: number;
  sessionCount: number;
  totalMatches: number;
  userSummary: UserTeamSummary;
}

interface DashboardTournament {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  createdAt: Date | string;
}

interface RecentSessionItem {
  id: string;
  slug: string;
  name: string | null;
  date: Date | string;
  teamName: string;
  teamSlug: string;
  gameCount: number;
}

interface RecentMatchItem {
  id: string;
  teamName: string;
  teamSlug: string;
  sessionSlug: string;
  teamA: string[];
  teamB: string[];
  teamAScore: number;
  teamBScore: number;
  winner: "A" | "B" | null;
}

interface DashboardViewProps {
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
    packageType: string;
    teamQuota: number;
    tournamentQuota: number;
  };
  teams: DashboardTeam[];
  tournaments: DashboardTournament[];
  recentSessions: RecentSessionItem[];
  recentMatches: RecentMatchItem[];
  stats: {
    totalWins: number;
    totalLosses: number;
    totalGamesPlayed: number;
    winRate: number;
  };
  teamChartStats: UserTeamSummary[];
}

export function DashboardView({
  user,
  teams,
  tournaments,
  recentSessions,
  recentMatches,
  stats,
  teamChartStats,
}: DashboardViewProps) {
  const firstName =
    (user.displayName || user.name)?.split(" ")[0] || user.email.split("@")[0];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900">
            {firstName}&apos;s overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {teams.length} team{teams.length === 1 ? "" : "s"}, {tournaments.length}{" "}
            tournament{tournaments.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/create-team"
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-[13px] font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New team</span>
          </Link>
          <Link
            href="/create-tournament"
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-[13px] font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 rounded-lg shadow-2xs transition-colors"
          >
            <Trophy className="w-4 h-4 text-emerald-600" />
            <span>New tournament</span>
          </Link>
        </div>
      </div>

      {/* Court-gradient performance banner */}
      <section className="cp-fade-up w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl p-4 sm:p-6 shadow-[0_12px_32px_-12px_rgba(6,78,59,0.45)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <WinRing
            percent={stats.winRate}
            size={70}
            strokeWidth={5}
            label="win"
            tone="on-gradient"
          />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Overall form
            </div>
            <div className="font-display text-xl sm:text-2xl font-bold tracking-[-0.02em] text-white mt-0.5">
              {stats.totalWins} wins, {stats.totalLosses} losses
            </div>
            <div className="text-xs text-emerald-100/80 mt-0.5">
              Across {stats.totalGamesPlayed} completed matches
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-10 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/15">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Matches
            </div>
            <div className="font-display text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-white mt-0.5">
              {stats.totalGamesPlayed}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Wins
            </div>
            <div className="font-display text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-emerald-200 mt-0.5">
              {stats.totalWins}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Losses
            </div>
            <div className="font-display text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-rose-200 mt-0.5">
              {stats.totalLosses}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Teams
            </div>
            <div className="font-display text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-white mt-0.5">
              {teams.length}
            </div>
          </div>
        </div>
      </section>

      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Teams</h2>
            {teams.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                No teams yet. Create a team or ask an organizer to add your email.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const isOwner = team.ownerId === user.id;
                  const userWinPct =
                    team.userSummary.plays > 0
                      ? Math.round((team.userSummary.wins / team.userSummary.plays) * 100)
                      : 0;

                  return (
                    <div
                      key={team.id}
                      className="cp-card-lift bg-gradient-to-br from-white via-white to-emerald-50/40 border border-slate-200/90 hover:border-emerald-300 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_20px_-10px_rgba(15,23,42,0.07)] hover:shadow-[0_12px_28px_-12px_rgba(6,78,59,0.18)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Link
                            href={`/team/${team.slug}`}
                            className="text-base font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                          >
                            {team.name}
                          </Link>
                          <div className="text-xs text-slate-500 font-mono-nums">
                            {team.memberCount} players · {team.sessionCount} sessions ·{" "}
                            {team.totalMatches} matches
                          </div>
                        </div>
                        <WinRing percent={userWinPct} size={48} strokeWidth={4} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                        <span className="font-mono-nums font-medium text-slate-700">
                          {team.userSummary.plays > 0
                            ? `${team.userSummary.wins}W / ${team.userSummary.losses}L`
                            : "No games yet"}
                        </span>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/team/${team.slug}/stats`}
                            className="hover:text-slate-900 transition-colors"
                          >
                            Standings
                          </Link>
                          {isOwner && (
                            <Link
                              href={`/team/${team.slug}/session/new`}
                              className="hover:text-slate-900 transition-colors"
                            >
                              New session
                            </Link>
                          )}
                          <Link
                            href={`/team/${team.slug}`}
                            className="text-emerald-700 font-semibold hover:underline"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {recentMatches.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">
                Recent matches
              </h2>
              <div className="bg-white border border-slate-200/90 rounded-xl divide-y divide-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                {recentMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/team/${m.teamSlug}/session/${m.sessionSlug}`}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-emerald-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-[13px] min-w-0">
                      <span
                        className={
                          m.winner === "A"
                            ? "font-semibold text-emerald-700 truncate"
                            : "text-slate-700 truncate"
                        }
                      >
                        {m.teamA.join(" + ")}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-mono-nums font-semibold text-slate-700 shrink-0">
                        {m.teamAScore > 0 || m.teamBScore > 0
                          ? `${m.teamAScore} - ${m.teamBScore}`
                          : "vs"}
                      </span>
                      <span
                        className={
                          m.winner === "B"
                            ? "font-semibold text-emerald-700 truncate"
                            : "text-slate-700 truncate"
                        }
                      >
                        {m.teamB.join(" + ")}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">
                      {m.teamName}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Tournaments</h2>
            {tournaments.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                No tournaments yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournament/${t.slug}`}
                    className="bg-gradient-to-br from-white to-teal-50/40 border border-slate-200/90 hover:border-emerald-300 rounded-xl p-4 flex items-center justify-between gap-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all group"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {t.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t.isActive ? "Open" : "Finished"} · {formatDateIST(t.createdAt)}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-700">
                Recent sessions
              </h2>
            </div>

            {recentSessions.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                No sessions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/team/${s.teamSlug}/session/${s.slug}`}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-emerald-50/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-900 truncate">
                        {s.name || "Match session"}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {s.teamName} · {formatDateIST(s.date)}
                      </div>
                    </div>
                    <span className="text-xs font-mono-nums font-medium text-slate-600 shrink-0">
                      {s.gameCount}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {teamChartStats.length > 0 && (
            <section className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h2 className="text-xs font-semibold text-slate-700">
                Wins and losses by team
              </h2>
              <WinRateChart stats={teamChartStats} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
