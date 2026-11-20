"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  Check,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { sileo } from "sileo";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import type {
  TournamentPlayerStatRow,
  TournamentStandingRow,
} from "@courtpulse/tournaments/tournament.helpers";
import {
  generateSmartScheduleAction,
  recordFairPlayLogAction,
  toggleTournamentPlayerCheckInAction,
} from "@courtpulse/tournaments/tournament.action";
import { WinRing } from "@courtpulse/ui/primitives/win-ring.component";

export function TournamentFairPlay({
  tournamentSlug,
  adminToken,
  isAdmin,
  fairPlaySummary,
  playerStats,
  standings,
  logs,
  penaltyStep,
}: {
  tournamentSlug: string;
  adminToken?: string | null;
  isAdmin: boolean;
  fairPlaySummary: {
    minGamesPerPlayer: number;
    totalPlayers: number;
    rosteredCount: number;
    checkedInCount: number;
    behindQuotaCount: number;
    projectedBehindCount: number;
    complianceRate: number;
  };
  playerStats: TournamentPlayerStatRow[];
  standings: TournamentStandingRow[];
  logs: {
    id: string;
    teamId: string | null;
    playerId: string | null;
    type: "BONUS" | "WARNING" | "PENALTY" | "CATCHUP";
    pointsDelta: number;
    reason: string;
    createdBy: string | null;
    createdAt: Date | string;
  }[];
  penaltyStep: number;
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(standings[0]?.tournamentTeamId || "");
  const [logType, setLogType] = useState<"BONUS" | "WARNING" | "PENALTY">(
    "BONUS"
  );
  const [pointsDelta, setPointsDelta] = useState("1");
  const [reason, setReason] = useState("");

  const teamNameMap = new Map(
    standings.map((s) => [s.tournamentTeamId, s.teamName])
  );

  const catchupMutation = useMutation({
    mutationFn: () =>
      generateSmartScheduleAction({
        tournamentSlug,
        adminToken,
        mode: "FAIR_PLAY_CATCHUP",
        matchFormat: "DOUBLES",
        slotMinutes: 20,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({
          title: res.message || "Could not schedule catch-up matches.",
        });
        return;
      }
      sileo.success({
        title: `Generated ${res.count} Fair Play catch-up fixture${
          res.count === 1 ? "" : "s"
        }`,
      });
      router.refresh();
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (input: { playerId: string; isCheckedIn: boolean }) =>
      toggleTournamentPlayerCheckInAction({
        tournamentSlug,
        adminToken,
        ...input,
      }),
    onSuccess: () => router.refresh(),
  });

  const logMutation = useMutation({
    mutationFn: () => {
      const signedDelta =
        logType === "PENALTY"
          ? -Math.abs(Number(pointsDelta || penaltyStep))
          : logType === "BONUS"
          ? Math.abs(Number(pointsDelta || 1))
          : 0;
      return recordFairPlayLogAction({
        tournamentSlug,
        adminToken,
        teamId: teamId || null,
        type: logType,
        pointsDelta: signedDelta,
        reason,
      });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not save Fair Play log." });
        return;
      }
      sileo.success({ title: "Fair Play entry recorded" });
      setReason("");
      router.refresh();
    },
  });

  return (
    <div className="space-y-6 cp-fade-up">
      {/* Fair Play Hero Banner */}
      <section className="w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_-12px_rgba(6,78,59,0.4)] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <WinRing
            percent={fairPlaySummary.complianceRate}
            size={68}
            strokeWidth={5}
            label="quota"
            tone="on-gradient"
          />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-100/80 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Fair play &amp; equal court-time monitor</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              Minimum {fairPlaySummary.minGamesPerPlayer} match
              {fairPlaySummary.minGamesPerPlayer === 1 ? "" : "es"} per player
            </h2>
            <p className="text-xs text-emerald-100/85 mt-0.5 font-mono-nums">
              {fairPlaySummary.checkedInCount}/{fairPlaySummary.totalPlayers} checked in ·{" "}
              {fairPlaySummary.behindQuotaCount} currently below minimum
            </p>
          </div>
        </div>

        {isAdmin && fairPlaySummary.minGamesPerPlayer > 0 && (
          <button
            type="button"
            disabled={catchupMutation.isPending}
            onClick={() => catchupMutation.mutate()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl shadow-sm cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>
              {catchupMutation.isPending
                ? "Scheduling..."
                : "Generate catch-up fixtures"}
            </span>
          </button>
        )}
      </section>

      {fairPlaySummary.minGamesPerPlayer > 0 &&
        fairPlaySummary.projectedBehindCount > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>{fairPlaySummary.projectedBehindCount}</strong> player
              {fairPlaySummary.projectedBehindCount === 1 ? "" : "s"} still need
              additional fixtures (even counting scheduled upcoming games) to hit
              the minimum {fairPlaySummary.minGamesPerPlayer}-match Fair Play rule.
            </div>
          </div>
        )}

      {/* Player Court-Time Quota Tracker */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Player quota &amp; check-in status ({playerStats.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono-nums">
            Target: {fairPlaySummary.minGamesPerPlayer} games
          </span>
        </div>

        {playerStats.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Add or approve tournament players to track Fair Play compliance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-2.5 px-4">Checked-In</th>
                  <th className="py-2.5 px-4">Player</th>
                  <th className="py-2.5 px-4">Team</th>
                  <th className="py-2.5 px-4">Played</th>
                  <th className="py-2.5 px-4">Queued</th>
                  <th className="py-2.5 px-4">Quota Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {playerStats.map((p) => (
                  <tr key={p.playerId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() =>
                            checkInMutation.mutate({
                              playerId: p.playerId,
                              isCheckedIn: !p.isCheckedIn,
                            })
                          }
                          className={`h-6 w-6 rounded-md border flex items-center justify-center cursor-pointer ${
                            p.isCheckedIn
                              ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                              : "bg-slate-50 border-slate-200 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.isCheckedIn
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {p.isCheckedIn ? "Present" : "Pending"}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {p.teamName || "Unassigned"}
                    </td>
                    <td className="py-2.5 px-4 font-mono-nums font-bold text-slate-900">
                      {p.played} / {p.minGamesRequired}
                    </td>
                    <td className="py-2.5 px-4 font-mono-nums text-slate-500">
                      {p.scheduledCount}
                    </td>
                    <td className="py-2.5 px-4">
                      {p.quotaMet ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Quota met
                        </span>
                      ) : p.projectedDeficit === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                          Covered by schedule
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Needs {p.projectedDeficit} more
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Sportsmanship Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {isAdmin && standings.length > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              logMutation.mutate();
            }}
            className="xl:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Log sportsmanship / Fair Play decision</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
              >
                {standings.map((t) => (
                  <option key={t.tournamentTeamId} value={t.tournamentTeamId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
              <select
                value={logType}
                onChange={(e) =>
                  setLogType(e.target.value as "BONUS" | "WARNING" | "PENALTY")
                }
                className="px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
              >
                <option value="BONUS">Fair Play Bonus (+pts)</option>
                <option value="WARNING">Official Warning (0 pts)</option>
                <option value="PENALTY">Points Penalty (-pts)</option>
              </select>
            </div>
            {logType !== "WARNING" && (
              <input
                type="number"
                min={1}
                value={pointsDelta}
                onChange={(e) => setPointsDelta(e.target.value)}
                placeholder="Points adjustment"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
              />
            )}
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Prompt reporting & roster rotation bonus"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
            />
            <button
              type="submit"
              disabled={logMutation.isPending}
              className="w-full py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
            >
              Record entry
            </button>
          </form>
        )}

        <div
          className={`${
            isAdmin && standings.length > 0 ? "xl:col-span-7" : "xl:col-span-12"
          } bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]`}
        >
          <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
            <h3 className="text-sm font-bold text-slate-900">
              Fair Play audit trail ({logs.length})
            </h3>
          </div>
          {logs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              All teams start with a 100 Fair Play sportsmanship index.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">
                      {l.teamId ? teamNameMap.get(l.teamId) || "Team" : "General"}{" "}
                      <span
                        className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.type === "BONUS"
                            ? "bg-emerald-100 text-emerald-800"
                            : l.type === "PENALTY"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {l.type}
                      </span>
                    </div>
                    <div className="text-slate-600">{l.reason}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono-nums">
                    <div
                      className={`font-bold ${
                        l.pointsDelta > 0
                          ? "text-emerald-700"
                          : l.pointsDelta < 0
                          ? "text-rose-600"
                          : "text-slate-500"
                      }`}
                    >
                      {l.pointsDelta > 0 ? `+${l.pointsDelta} pts` : `${l.pointsDelta} pts`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDateIST(l.createdAt, "MMM dd, HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
