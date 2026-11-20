"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CalendarClock, Layers, Plus, Sparkles, Trash2 } from "lucide-react";
import { sileo } from "sileo";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import {
  createStageAction,
  createTournamentGameAction,
  deleteTournamentGameAction,
  generateSmartScheduleAction,
} from "@courtpulse/tournaments/tournament.action";

export function TournamentScheduler({
  tournamentSlug,
  adminToken,
  courtsCount,
  minGamesPerPlayer,
  isAdmin,
  teams,
  players,
  stages,
  games,
}: {
  tournamentSlug: string;
  adminToken?: string | null;
  courtsCount: number;
  minGamesPerPlayer: number;
  isAdmin: boolean;
  teams: { id: string; teamName: string; color: string }[];
  players: { id: string; name: string; teamId: string | null }[];
  stages: { id: string; name: string; order: number }[];
  games: {
    id: string;
    stageId: string | null;
    teamAId: string;
    teamBId: string;
    teamAPlayers: string[];
    teamBPlayers: string[];
    round: number;
    courtNumber: number;
    slotLabel: string | null;
    isFairPlayCatchup: boolean;
    status: "SCHEDULED" | "LIVE" | "COMPLETED";
    teamAScore: number;
    teamBScore: number;
    winningTeam: "A" | "B" | "DRAW" | null;
    scheduleTime: Date | string | null;
  }[];
}) {
  const router = useRouter();
  const [stageName, setStageName] = useState("");
  const [schedMode, setSchedMode] = useState<"ROUND_ROBIN" | "FAIR_PLAY_CATCHUP">(
    "ROUND_ROBIN"
  );
  const [matchFormat, setMatchFormat] = useState<"DOUBLES" | "SINGLES">(
    "DOUBLES"
  );
  const [schedStageId, setSchedStageId] = useState("");
  const [slotMinutes, setSlotMinutes] = useState("20");
  const [doubleRR, setDoubleRR] = useState(false);
  const [clearUnplayed, setClearUnplayed] = useState(false);

  // Manual fixture builder
  const [teamAId, setTeamAId] = useState(teams[0]?.id || "");
  const [teamBId, setTeamBId] = useState(teams[1]?.id || "");
  const [manualStageId, setManualStageId] = useState("");
  const [manualCourt, setManualCourt] = useState("1");
  const [manualSideA, setManualSideA] = useState<string[]>([]);
  const [manualSideB, setManualSideB] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "SCHEDULED" | "LIVE" | "COMPLETED"
  >("ALL");

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );
  const stageMap = useMemo(
    () => new Map(stages.map((s) => [s.id, s.name])),
    [stages]
  );

  const rosterA = players.filter((p) => p.teamId === teamAId);
  const rosterB = players.filter((p) => p.teamId === teamBId);

  const addStageMutation = useMutation({
    mutationFn: () =>
      createStageAction({ tournamentSlug, adminToken, name: stageName }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not create round." });
        return;
      }
      sileo.success({ title: "Stage added" });
      setStageName("");
      router.refresh();
    },
  });

  const smartGenMutation = useMutation({
    mutationFn: () =>
      generateSmartScheduleAction({
        tournamentSlug,
        adminToken,
        stageId: schedStageId || null,
        mode: schedMode,
        matchFormat,
        slotMinutes: Number(slotMinutes || 20),
        doubleRoundRobin: doubleRR,
        clearUnplayedFirst: clearUnplayed,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Scheduler could not generate matches." });
        return;
      }
      sileo.success({
        title: `Generated ${res.count} fixtures across ${courtsCount} court${
          courtsCount === 1 ? "" : "s"
        }`,
      });
      router.refresh();
    },
  });

  const addManualMutation = useMutation({
    mutationFn: () =>
      createTournamentGameAction({
        tournamentSlug,
        adminToken,
        stageId: manualStageId || undefined,
        teamAId,
        teamBId,
        teamAPlayers: manualSideA,
        teamBPlayers: manualSideB,
        courtNumber: Number(manualCourt || 1),
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not create match." });
        return;
      }
      sileo.success({ title: "Fixture added" });
      setManualSideA([]);
      setManualSideB([]);
      router.refresh();
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: (gameId: string) =>
      deleteTournamentGameAction({ tournamentSlug, adminToken, gameId }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not delete fixture." });
        return;
      }
      sileo.success({ title: "Match removed" });
      router.refresh();
    },
  });

  const filteredGames = useMemo(
    () =>
      games.filter((g) =>
        filterStatus === "ALL" ? true : g.status === filterStatus
      ),
    [games, filterStatus]
  );

  const togglePlayerPick = (
    list: string[],
    setter: (next: string[]) => void,
    name: string
  ) => {
    setter(
      list.includes(name) ? list.filter((n) => n !== name) : [...list, name]
    );
  };

  return (
    <div className="space-y-6 cp-fade-up">
      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Smart Scheduler */}
          <div className="xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Smart match &amp; court scheduler</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generates conflict-free waves across {courtsCount} court
                  {courtsCount === 1 ? "" : "s"}, rotating rested players first.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Generator mode
                </label>
                <select
                  value={schedMode}
                  onChange={(e) =>
                    setSchedMode(
                      e.target.value as "ROUND_ROBIN" | "FAIR_PLAY_CATCHUP"
                    )
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
                >
                  <option value="ROUND_ROBIN">Round-Robin League</option>
                  <option value="FAIR_PLAY_CATCHUP">
                    Fair Play Catch-Up (Min {minGamesPerPlayer})
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Match format
                </label>
                <select
                  value={matchFormat}
                  onChange={(e) =>
                    setMatchFormat(e.target.value as "DOUBLES" | "SINGLES")
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
                >
                  <option value="DOUBLES">Doubles (2v2 per tie)</option>
                  <option value="SINGLES">Singles (1v1 per tie)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Minutes / slot
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {stages.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Assign to stage (optional)
                </label>
                <select
                  value={schedStageId}
                  onChange={(e) => setSchedStageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
                >
                  <option value="">All / default stage</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-slate-700">
              {schedMode === "ROUND_ROBIN" && (
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doubleRR}
                    onChange={(e) => setDoubleRR(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>Double round-robin (home &amp; away)</span>
                </label>
              )}
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearUnplayed}
                  onChange={(e) => setClearUnplayed(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Replace unplayed scheduled matches</span>
              </label>
            </div>

            <button
              type="button"
              disabled={smartGenMutation.isPending || teams.length < 2}
              onClick={() => smartGenMutation.mutate()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-lg shadow-sm cursor-pointer"
            >
              <CalendarClock className="w-4 h-4" />
              <span>
                {smartGenMutation.isPending
                  ? "Scheduling fixtures..."
                  : "Generate smart schedule"}
              </span>
            </button>
          </div>

          {/* Stages + Quick Custom Fixture */}
          <div className="xl:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Stages &amp; rounds</span>
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addStageMutation.mutate();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="League, Quarterfinal, Final..."
                  className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={addStageMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                >
                  Add round
                </button>
              </form>
              {stages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {stages.map((s) => (
                    <span
                      key={s.id}
                      className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full"
                    >
                      {s.order}. {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h3 className="text-sm font-bold text-slate-900">
                Add manual fixture
              </h3>
              {teams.length < 2 ? (
                <p className="text-xs text-slate-500">Add at least 2 teams first.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={teamAId}
                      onChange={(e) => {
                        setTeamAId(e.target.value);
                        setManualSideA([]);
                      }}
                      className="px-2.5 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teamName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={teamBId}
                      onChange={(e) => {
                        setTeamBId(e.target.value);
                        setManualSideB([]);
                      }}
                      className="px-2.5 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teamName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(rosterA.length > 0 || rosterB.length > 0) && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-emerald-700">
                          Side A players
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rosterA.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                togglePlayerPick(manualSideA, setManualSideA, p.name)
                              }
                              className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer ${
                                manualSideA.includes(p.name)
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-sky-700">
                          Side B players
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rosterB.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                togglePlayerPick(manualSideB, setManualSideB, p.name)
                              }
                              className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer ${
                                manualSideB.includes(p.name)
                                  ? "bg-sky-600 text-white border-sky-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={manualCourt}
                      onChange={(e) => setManualCourt(e.target.value)}
                      className="px-2.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg"
                    >
                      {Array.from({ length: courtsCount }, (_, i) => i + 1).map(
                        (c) => (
                          <option key={c} value={c}>
                            Court {c}
                          </option>
                        )
                      )}
                    </select>
                    <select
                      value={manualStageId}
                      onChange={(e) => setManualStageId(e.target.value)}
                      className="px-2.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg"
                    >
                      <option value="">No specific round</option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={addManualMutation.isPending}
                    onClick={() => addManualMutation.mutate()}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule fixture</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixtures Timeline */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Schedule &amp; fixtures ({filteredGames.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", "LIVE", "SCHEDULED", "COMPLETED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer ${
                  filterStatus === st
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No fixtures match this filter yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGames.map((g) => {
              const tA = teamMap.get(g.teamAId);
              const tB = teamMap.get(g.teamBId);
              const stageLabel = g.stageId ? stageMap.get(g.stageId) : null;

              return (
                <div
                  key={g.id}
                  className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-mono-nums font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Court {g.courtNumber}
                      </span>
                      {g.slotLabel && (
                        <span className="text-slate-500 font-medium">
                          {g.slotLabel}
                        </span>
                      )}
                      {stageLabel && (
                        <span className="text-emerald-700 font-semibold">
                          {stageLabel}
                        </span>
                      )}
                      {g.isFairPlayCatchup && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                          Fair Play Catch-Up
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          g.status === "LIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : g.status === "COMPLETED"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {g.status}
                      </span>
                      {g.scheduleTime && (
                        <span className="text-slate-400 font-mono-nums">
                          {formatDateIST(g.scheduleTime, "MMM dd, HH:mm")}
                        </span>
                      )}
                    </div>

                    <div className="font-display text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                      <span>{tA?.teamName || "Team A"}</span>
                      <span className="font-mono-nums text-xs px-2 py-0.5 rounded bg-slate-100">
                        {g.teamAScore} - {g.teamBScore}
                      </span>
                      <span>{tB?.teamName || "Team B"}</span>
                    </div>

                    {(g.teamAPlayers.length > 0 || g.teamBPlayers.length > 0) && (
                      <div className="text-xs text-slate-500">
                        {g.teamAPlayers.join(" + ") || "TBD"} vs{" "}
                        {g.teamBPlayers.join(" + ") || "TBD"}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => deleteMatchMutation.mutate(g.id)}
                      className="self-end sm:self-center p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete fixture"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
