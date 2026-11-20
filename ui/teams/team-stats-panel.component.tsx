"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Crown, Flame, Medal, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateTeamInsights,
  type SessionTrendPoint,
} from "@courtpulse/helpers/analytics.helpers";
import type {
  GameLike,
  MemberIdentity,
  PairStatRow,
  PlayerStatRow,
} from "@courtpulse/helpers/stats.helpers";
import { DataTable } from "@courtpulse/ui/primitives/data-table.component";
import { WinRing } from "@courtpulse/ui/primitives/win-ring.component";
import { PlayerInspectorDrawer } from "./player-inspector-drawer.component";
import { TeamInsightsSection } from "./team-insights-section.component";

function getTrailingWinStreak(recentForm: ("W" | "L")[]): number {
  let streak = 0;
  for (let i = recentForm.length - 1; i >= 0; i--) {
    if (recentForm[i] === "W") streak++;
    else break;
  }
  return streak;
}

function getWinBarGradient(pct: number): string {
  if (pct >= 60) return "from-emerald-500 to-teal-500";
  if (pct >= 40) return "from-sky-500 to-cyan-500";
  return "from-rose-400 to-amber-400";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-amber-950 font-display font-extrabold text-xs shadow-xs">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 text-slate-800 font-display font-bold text-xs">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-orange-200 to-amber-300 text-orange-950 font-display font-bold text-xs">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center h-7 w-7 text-xs font-mono-nums font-semibold text-slate-400">
      #{rank}
    </span>
  );
}

export function TeamStatsPanel({
  playerStats,
  winningPairs,
  games = [],
  members = [],
  sessionTrend = [],
}: {
  playerStats: PlayerStatRow[];
  winningPairs: PairStatRow[];
  games?: GameLike[];
  members?: MemberIdentity[];
  sessionTrend?: SessionTrendPoint[];
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStatRow | null>(null);
  const [showPairsTable, setShowPairsTable] = useState(false);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    playerStats.forEach((p, idx) => map.set(p.key, idx + 1));
    return map;
  }, [playerStats]);

  const pairRankMap = useMemo(() => {
    const map = new Map<string, number>();
    winningPairs.forEach((p, idx) => map.set(p.pairKey, idx + 1));
    return map;
  }, [winningPairs]);

  const playerColumns = useMemo<ColumnDef<PlayerStatRow>[]>(
    () => [
      {
        id: "rank",
        header: "Rank",
        accessorFn: (row) => rankMap.get(row.key) ?? 0,
        cell: (info) => <RankBadge rank={info.getValue<number>()} />,
      },
      {
        accessorKey: "name",
        header: "Player",
        cell: (info) => {
          const row = info.row.original;
          const rank = rankMap.get(row.key) ?? 99;
          const streak = getTrailingWinStreak(row.recentForm);
          const initials = row.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("");

          const avatarStyle =
            rank === 1
              ? "from-amber-200 to-amber-400 border-amber-400 text-amber-950 ring-2 ring-amber-200/70"
              : rank === 2
              ? "from-slate-100 to-slate-300 border-slate-300 text-slate-800"
              : rank === 3
              ? "from-orange-100 to-amber-200 border-orange-300 text-orange-950"
              : "from-emerald-100 to-teal-100 border-emerald-200 text-emerald-900";

          return (
            <div className="flex items-center gap-3">
              <span
                className={`h-8 w-8 rounded-full bg-gradient-to-br border flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarStyle}`}
              >
                {initials || "P"}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-display font-bold text-[14px] text-slate-900 truncate">
                  {row.name}
                </span>
                {streak >= 2 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100/90 text-amber-800 text-[10px] font-bold shrink-0">
                    <Flame className="w-2.5 h-2.5 text-amber-600" />
                    {streak}W
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "games",
        header: "Matches",
        cell: (info) => (
          <span className="font-medium text-slate-700">{info.getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "wins",
        header: "W - L",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="inline-flex items-center gap-1.5 font-mono-nums text-xs">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">
                {row.wins}W
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 font-semibold">
                {row.losses}L
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "pointDiff",
        header: "Diff",
        cell: (info) => {
          const val = info.getValue<number>();
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                val > 0
                  ? "bg-emerald-50/70 text-emerald-700"
                  : val < 0
                  ? "bg-rose-50/70 text-rose-600"
                  : "text-slate-400"
              }`}
            >
              {val > 0 ? `+${val}` : val}
            </span>
          );
        },
      },
      {
        accessorKey: "winRate",
        header: "Win rate",
        cell: (info) => {
          const pct = info.getValue<number>();
          return (
            <div className="flex items-center gap-2.5 min-w-[136px]">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getWinBarGradient(pct)} rounded-full transition-[width] duration-700 ease-out`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="text-xs text-slate-900 font-bold w-10 text-right">
                {pct}%
              </span>
            </div>
          );
        },
      },
      {
        id: "recentForm",
        header: "Last 5",
        enableSorting: false,
        cell: (info) => {
          const form = info.row.original.recentForm;
          if (form.length === 0) return <span className="text-slate-400">None</span>;
          return (
            <div className="flex items-center gap-1">
              {form.map((res, idx) => (
                <span
                  key={idx}
                  title={res === "W" ? "Win" : "Loss"}
                  className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center ${
                    res === "W"
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-500/90 text-white"
                  }`}
                >
                  {res}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "points",
        header: "Pts",
        cell: (info) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-900 font-bold text-xs">
            {info.getValue<number>()}
          </span>
        ),
      },
    ],
    [rankMap]
  );

  const pairColumns = useMemo<ColumnDef<PairStatRow>[]>(
    () => [
      {
        id: "rank",
        header: "Rank",
        accessorFn: (row) => pairRankMap.get(row.pairKey) ?? 0,
        cell: (info) => <RankBadge rank={info.getValue<number>()} />,
      },
      {
        accessorKey: "pairLabel",
        header: "Doubles pair",
        cell: (info) => (
          <span className="font-display font-bold text-[14px] text-slate-900">
            {info.getValue<string>()}
          </span>
        ),
      },
      { accessorKey: "plays", header: "Matches" },
      {
        accessorKey: "wins",
        header: "Wins",
        cell: (info) => (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">
            {info.getValue<number>()}W
          </span>
        ),
      },
      {
        accessorKey: "winRate",
        header: "Win rate",
        cell: (info) => {
          const pct = info.getValue<number>();
          return (
            <div className="flex items-center gap-2.5 min-w-[136px]">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getWinBarGradient(pct)} rounded-full transition-[width] duration-700 ease-out`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="text-xs text-slate-900 font-bold w-10 text-right">
                {pct}%
              </span>
            </div>
          );
        },
      },
    ],
    [pairRankMap]
  );

  const podium = playerStats.filter((p) => p.games > 0).slice(0, 3);
  const topPairs = winningPairs.slice(0, 3);
  const topChartPlayers = playerStats.filter((p) => p.games > 0).slice(0, 12);
  const insights = useMemo(
    () => calculateTeamInsights(games, members, playerStats, winningPairs),
    [games, members, playerStats, winningPairs]
  );

  return (
    <div className="w-full space-y-7">
      {podium.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Top performers</h2>
            <span className="text-xs text-slate-500">
              Click any card for partner chemistry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {podium.map((player, index) => {
              const isChamp = index === 0;
              const orderClass =
                index === 0
                  ? "md:order-2"
                  : index === 1
                  ? "md:order-1"
                  : "md:order-3";

              if (isChamp) {
                return (
                  <button
                    key={player.key}
                    type="button"
                    onClick={() => setSelectedPlayer(player)}
                    className={`${orderClass} cp-fade-up cp-card-lift text-left rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white shadow-[0_14px_34px_-12px_rgba(6,78,59,0.5)] border border-emerald-500/40 hover:brightness-105 cursor-pointer space-y-4`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-amber-300">
                        <Crown className="w-3.5 h-3.5" />
                        <span>Rank #1 Champion</span>
                      </span>
                      <span className="text-xs font-mono-nums font-bold text-emerald-100/90">
                        {player.points} pts
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-display text-xl sm:text-2xl font-extrabold text-white truncate">
                          {player.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono-nums text-emerald-100/90 mt-1.5">
                          <span>
                            {player.wins}W / {player.losses}L
                          </span>
                          <span>·</span>
                          <span>
                            Diff{" "}
                            {player.pointDiff > 0
                              ? `+${player.pointDiff}`
                              : player.pointDiff}
                          </span>
                        </div>
                      </div>
                      <WinRing
                        percent={player.winRate}
                        size={64}
                        strokeWidth={5}
                        tone="on-gradient"
                      />
                    </div>
                  </button>
                );
              }

              const isSecond = index === 1;
              return (
                <button
                  key={player.key}
                  type="button"
                  onClick={() => setSelectedPlayer(player)}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className={`${orderClass} cp-fade-up cp-card-lift text-left rounded-2xl p-5 border shadow-[0_4px_18px_-8px_rgba(15,23,42,0.1)] hover:border-emerald-300 cursor-pointer space-y-3 ${
                    isSecond
                      ? "bg-gradient-to-br from-slate-100/90 via-white to-emerald-50/30 border-slate-300/80"
                      : "bg-gradient-to-br from-orange-50/80 via-white to-amber-50/30 border-orange-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] ${
                        isSecond ? "text-slate-600" : "text-orange-700"
                      }`}
                    >
                      <Medal className="w-3.5 h-3.5" />
                      <span>Rank #{index + 1}</span>
                    </span>
                    <span className="text-xs font-mono-nums font-semibold text-slate-600">
                      {player.points} pts
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold text-slate-900 truncate">
                        {player.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono-nums text-slate-500 mt-1">
                        <span>
                          {player.wins}W / {player.losses}L
                        </span>
                        <span>·</span>
                        <span
                          className={
                            player.pointDiff > 0
                              ? "text-emerald-700 font-semibold"
                              : player.pointDiff < 0
                              ? "text-rose-600 font-semibold"
                              : ""
                          }
                        >
                          {player.pointDiff > 0
                            ? `+${player.pointDiff}`
                            : player.pointDiff}
                        </span>
                      </div>
                    </div>
                    <WinRing percent={player.winRate} size={56} strokeWidth={4} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Leaderboard standings
          </h3>
          <span className="text-xs text-slate-500">
            Click a player to inspect matchups &amp; partners
          </span>
        </div>
        <DataTable
          data={playerStats}
          columns={playerColumns}
          searchPlaceholder="Filter players..."
          emptyMessage="No players recorded yet."
          initialSort={[{ id: "wins", desc: true }]}
          onRowClick={(row) => setSelectedPlayer(row)}
          rowClassName={(row) => {
            const rank = rankMap.get(row.key) ?? 99;
            if (rank === 1) return "bg-amber-50/40";
            if (rank === 2) return "bg-slate-50/60";
            return "";
          }}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {topChartPlayers.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-slate-900">
              Wins vs losses
            </h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topChartPlayers}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "10px",
                      color: "#0f172a",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="wins" name="Wins" fill="#059669" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="losses" name="Losses" fill="#e11d48" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {sessionTrend.length > 1 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-slate-900">
              Matches per recent session
            </h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sessionTrend}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cpGreenLightArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "10px",
                      color: "#0f172a",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="matches"
                    name="Matches"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cpGreenLightArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">Top doubles pairs</h3>
          <button
            type="button"
            aria-expanded={showPairsTable}
            onClick={() => setShowPairsTable((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <span>
              {showPairsTable
                ? `Hide full pairs table`
                : `View all ${winningPairs.length} doubles pairs`}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showPairsTable ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {topPairs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPairs.map((pair, idx) => (
              <div
                key={pair.pairKey}
                className={`rounded-xl p-4 border flex items-center justify-between gap-3 ${
                  idx === 0
                    ? "bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 border-emerald-300 shadow-[0_6px_20px_-10px_rgba(6,78,59,0.2)]"
                    : "bg-white border-slate-200/90"
                }`}
              >
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-700">
                    <Users className="w-3 h-3" />
                    <span>Pair #{idx + 1}</span>
                  </div>
                  <div className="font-display text-base font-bold text-slate-900 truncate mt-1">
                    {pair.pairLabel}
                  </div>
                  <div className="text-xs font-mono-nums text-slate-500 mt-0.5">
                    {pair.wins}W in {pair.plays} matches
                  </div>
                </div>
                <WinRing percent={pair.winRate} size={50} strokeWidth={4} />
              </div>
            ))}
          </div>
        )}

        {showPairsTable && (
          <div className="pt-1 cp-fade-up">
            <DataTable
              data={winningPairs}
              columns={pairColumns}
              searchPlaceholder="Search pairs..."
              emptyMessage="No doubles matches recorded yet."
              initialSort={[{ id: "wins", desc: true }]}
              rowClassName={(row) =>
                pairRankMap.get(row.pairKey) === 1 ? "bg-emerald-50/40" : ""
              }
            />
          </div>
        )}
      </section>

      <TeamInsightsSection insights={insights} />

      <PlayerInspectorDrawer
        player={selectedPlayer}
        games={games}
        members={members}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
