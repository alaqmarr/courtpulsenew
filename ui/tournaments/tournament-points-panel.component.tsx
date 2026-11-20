"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Minus, Play, Plus, RotateCcw, Trophy } from "lucide-react";
import { sileo } from "sileo";
import type {
  TournamentPlayerStatRow,
  TournamentStandingRow,
} from "@courtpulse/tournaments/tournament.helpers";
import {
  recordTournamentPointAction,
  setTournamentWinnerAction,
  undoTournamentPointAction,
  updateTournamentGameScoreAction,
} from "@courtpulse/tournaments/tournament.action";
import { DataTable } from "@courtpulse/ui/primitives/data-table.component";

export function TournamentPointsPanel({
  tournamentSlug,
  adminToken,
  isAdmin,
  pointsConfig,
  standings,
  playerStats,
  teams,
  games,
  stages,
}: {
  tournamentSlug: string;
  adminToken?: string | null;
  isAdmin: boolean;
  pointsConfig: {
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    pointsToWin: number;
  };
  standings: TournamentStandingRow[];
  playerStats: TournamentPlayerStatRow[];
  teams: { id: string; teamName: string; color: string }[];
  games: {
    id: string;
    stageId: string | null;
    teamAId: string;
    teamBId: string;
    teamAPlayers: string[];
    teamBPlayers: string[];
    courtNumber: number;
    slotLabel: string | null;
    status: "SCHEDULED" | "LIVE" | "COMPLETED";
    teamAScore: number;
    teamBScore: number;
    winningTeam: "A" | "B" | "DRAW" | null;
  }[];
  stages: { id: string; name: string }[];
}) {
  const router = useRouter();
  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );
  const stageMap = useMemo(
    () => new Map(stages.map((s) => [s.id, s.name])),
    [stages]
  );

  const pointMutation = useMutation({
    mutationFn: (input: { gameId: string; scoringSide: "A" | "B" }) =>
      recordTournamentPointAction({
        tournamentSlug,
        adminToken,
        ...input,
      }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Could not score point." });
      else router.refresh();
    },
  });

  const undoMutation = useMutation({
    mutationFn: (gameId: string) =>
      undoTournamentPointAction({ tournamentSlug, adminToken, gameId }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Nothing to undo." });
      else router.refresh();
    },
  });

  const adjustScoreMutation = useMutation({
    mutationFn: (input: {
      gameId: string;
      teamAScore: number;
      teamBScore: number;
      status?: "SCHEDULED" | "LIVE" | "COMPLETED";
    }) =>
      updateTournamentGameScoreAction({
        tournamentSlug,
        adminToken,
        ...input,
      }),
    onSuccess: () => router.refresh(),
  });

  const finalizeMutation = useMutation({
    mutationFn: (input: {
      gameId: string;
      winningTeam: "A" | "B" | "DRAW";
      teamAScore: number;
      teamBScore: number;
    }) =>
      setTournamentWinnerAction({
        tournamentSlug,
        adminToken,
        ...input,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not finalize match." });
        return;
      }
      sileo.success({ title: "Match finalized & standings updated" });
      router.refresh();
    },
  });

  const standingColumns = useMemo<ColumnDef<TournamentStandingRow>[]>(
    () => [
      {
        accessorKey: "teamName",
        header: "Team",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: row.color || "#059669" }}
              />
              {row.teamSlug ? (
                <Link
                  href={`/team/${row.teamSlug}/stats`}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  {row.teamName}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900">{row.teamName}</span>
              )}
            </div>
          );
        },
      },
      { accessorKey: "played", header: "P" },
      { accessorKey: "wins", header: "W" },
      { accessorKey: "losses", header: "L" },
      { accessorKey: "draws", header: "D" },
      {
        id: "pfPa",
        header: "PF / PA",
        cell: (info) => (
          <span className="font-mono-nums text-xs text-slate-600">
            {info.row.original.pointsFor} / {info.row.original.pointsAgainst}
          </span>
        ),
      },
      {
        accessorKey: "pointDiff",
        header: "+/-",
        cell: (info) => {
          const v = info.getValue<number>();
          return (
            <span
              className={`font-mono-nums text-xs font-semibold ${
                v > 0 ? "text-emerald-700" : v < 0 ? "text-rose-600" : "text-slate-400"
              }`}
            >
              {v > 0 ? `+${v}` : v}
            </span>
          );
        },
      },
      {
        accessorKey: "fairPlayScore",
        header: "Fair Play",
        cell: (info) => (
          <span className="font-mono-nums text-xs font-semibold text-emerald-700">
            {info.getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: "points",
        header: "Pts",
        cell: (info) => (
          <span className="inline-flex px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono-nums font-bold text-xs">
            {info.getValue<number>()}
          </span>
        ),
      },
    ],
    []
  );

  const playerMvpColumns = useMemo<ColumnDef<TournamentPlayerStatRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Player",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              {row.teamColor && (
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: row.teamColor }}
                />
              )}
              <span className="font-semibold text-slate-900">{row.name}</span>
              {row.isCaptain && (
                <span className="text-[10px] font-bold text-amber-600">(C)</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "teamName",
        header: "Team",
        cell: (info) => (
          <span className="text-xs text-slate-600">
            {info.getValue<string | null>() || "Unassigned"}
          </span>
        ),
      },
      { accessorKey: "played", header: "Played" },
      { accessorKey: "wins", header: "Wins" },
      {
        accessorKey: "pointDiff",
        header: "Diff",
        cell: (info) => {
          const v = info.getValue<number>();
          return (
            <span
              className={`font-mono-nums text-xs font-semibold ${
                v > 0 ? "text-emerald-700" : v < 0 ? "text-rose-600" : "text-slate-400"
              }`}
            >
              {v > 0 ? `+${v}` : v}
            </span>
          );
        },
      },
      {
        accessorKey: "winRate",
        header: "Win %",
        cell: (info) => (
          <span className="font-mono-nums text-xs font-bold text-slate-800">
            {info.getValue<number>()}%
          </span>
        ),
      },
    ],
    []
  );

  const liveOrUpcoming = games.filter((g) => g.status !== "COMPLETED");
  const completedGames = games.filter((g) => g.status === "COMPLETED");

  return (
    <div className="space-y-6 cp-fade-up">
      {/* Points System Rules Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="font-semibold text-slate-900">
          Points table scoring rules
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono-nums text-slate-600">
          <span>
            Win: <strong className="text-emerald-700">+{pointsConfig.winPoints}</strong>
          </span>
          <span>
            Draw: <strong className="text-slate-900">+{pointsConfig.drawPoints}</strong>
          </span>
          <span>
            Loss: <strong className="text-slate-500">+{pointsConfig.lossPoints}</strong>
          </span>
          <span>
            Set target: <strong className="text-slate-900">{pointsConfig.pointsToWin} pts</strong>
          </span>
        </div>
      </div>

      {/* Live & Upcoming Court Scoring Cards */}
      {liveOrUpcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Live &amp; active court scoring ({liveOrUpcoming.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveOrUpcoming.map((g) => {
              const tA = teamMap.get(g.teamAId);
              const tB = teamMap.get(g.teamBId);
              const stageLabel = g.stageId ? stageMap.get(g.stageId) : null;
              const derivedWinner: "A" | "B" | "DRAW" =
                g.teamAScore > g.teamBScore
                  ? "A"
                  : g.teamBScore > g.teamAScore
                  ? "B"
                  : "DRAW";
              const targetReached =
                g.teamAScore >= pointsConfig.pointsToWin ||
                g.teamBScore >= pointsConfig.pointsToWin;

              return (
                <div
                  key={g.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 space-y-3.5 border shadow-sm ${
                    g.status === "LIVE"
                      ? "border-emerald-300 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.24)]"
                      : "border-slate-200/90"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {g.status === "LIVE" && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                      <span className="font-mono-nums font-bold text-slate-700">
                        Court {g.courtNumber}
                      </span>
                      {stageLabel && (
                        <span className="text-emerald-700 font-semibold">
                          · {stageLabel}
                        </span>
                      )}
                    </div>
                    {isAdmin && g.status === "SCHEDULED" && (
                      <button
                        type="button"
                        onClick={() =>
                          adjustScoreMutation.mutate({
                            gameId: g.id,
                            teamAScore: g.teamAScore,
                            teamBScore: g.teamBScore,
                            status: "LIVE",
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Start match</span>
                      </button>
                    )}
                    {targetReached && (
                      <span className="cp-pop-in px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                        Target reached
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <div className="font-display text-sm font-bold text-slate-900 truncate">
                        {tA?.teamName || "Team A"}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {g.teamAPlayers.join(" + ") || "Team A players"}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              adjustScoreMutation.mutate({
                                gameId: g.id,
                                teamAScore: Math.max(0, g.teamAScore - 1),
                                teamBScore: g.teamBScore,
                                status: "LIVE",
                              })
                            }
                            className="h-9 w-9 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 active:scale-95 flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="font-display text-3xl font-extrabold text-slate-900 mx-auto">
                          {g.teamAScore}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              pointMutation.mutate({
                                gameId: g.id,
                                scoringSide: "A",
                              })
                            }
                            className="h-9 w-11 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white active:scale-95 flex items-center justify-center shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl p-3 bg-sky-50/70 border border-sky-200 space-y-2">
                      <div className="font-display text-sm font-bold text-slate-900 truncate">
                        {tB?.teamName || "Team B"}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {g.teamBPlayers.join(" + ") || "Team B players"}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              adjustScoreMutation.mutate({
                                gameId: g.id,
                                teamAScore: g.teamAScore,
                                teamBScore: Math.max(0, g.teamBScore - 1),
                                status: "LIVE",
                              })
                            }
                            className="h-9 w-9 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 active:scale-95 flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="font-display text-3xl font-extrabold text-slate-900 mx-auto">
                          {g.teamBScore}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              pointMutation.mutate({
                                gameId: g.id,
                                scoringSide: "B",
                              })
                            }
                            className="h-9 w-11 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 text-white active:scale-95 flex items-center justify-center shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => undoMutation.mutate(g.id)}
                        className="px-3 py-2 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        title="Undo last logged point"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Undo</span>
                      </button>
                      <button
                        type="button"
                        disabled={finalizeMutation.isPending}
                        onClick={() =>
                          finalizeMutation.mutate({
                            gameId: g.id,
                            winningTeam: derivedWinner,
                            teamAScore: g.teamAScore,
                            teamBScore: g.teamBScore,
                          })
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {derivedWinner === "DRAW"
                            ? `Finalize draw (${g.teamAScore} - ${g.teamBScore})`
                            : `Finalize: ${
                                derivedWinner === "A"
                                  ? tA?.teamName || "Team A"
                                  : tB?.teamName || "Team B"
                              } wins`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Team Standings Table */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Team points table</h2>
        </div>
        <DataTable
          data={standings}
          columns={standingColumns}
          searchPlaceholder="Search teams..."
          emptyMessage="No teams enrolled yet."
          initialSort={[{ id: "points", desc: true }]}
        />
      </section>

      {/* Player MVP Standings */}
      {playerStats.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900">
            Player MVP leaderboard
          </h2>
          <DataTable
            data={playerStats}
            columns={playerMvpColumns}
            searchPlaceholder="Search players..."
            emptyMessage="No players recorded yet."
            initialSort={[{ id: "wins", desc: true }]}
          />
        </section>
      )}

      {/* Recent Completed Results */}
      {completedGames.length > 0 && (
        <section className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
            <h3 className="text-sm font-bold text-slate-900">
              Completed results ({completedGames.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {completedGames.map((g) => {
              const tA = teamMap.get(g.teamAId);
              const tB = teamMap.get(g.teamBId);
              return (
                <div
                  key={g.id}
                  className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="font-display font-bold text-slate-900">
                    <span
                      className={
                        g.winningTeam === "A" ? "text-emerald-700" : "text-slate-500"
                      }
                    >
                      {tA?.teamName || "Team A"}
                    </span>
                    <span className="mx-2 font-mono-nums px-2 py-0.5 rounded bg-slate-100 text-slate-900">
                      {g.teamAScore} - {g.teamBScore}
                    </span>
                    <span
                      className={
                        g.winningTeam === "B" ? "text-emerald-700" : "text-slate-500"
                      }
                    >
                      {tB?.teamName || "Team B"}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    {g.winningTeam === "DRAW"
                      ? "Draw"
                      : `${
                          g.winningTeam === "A"
                            ? tA?.teamName || "Team A"
                            : tB?.teamName || "Team B"
                        } won`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
