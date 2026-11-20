"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { sileo } from "sileo";
import {
  deleteGameAction,
  setGameWinnerAction,
  updateGameScoreAction,
} from "@courtpulse/teams/game.action";

interface LiveScoreboardCardProps {
  game: {
    id: string;
    slug: string;
    teamAPlayers: string[];
    teamBPlayers: string[];
    teamAScore: number;
    teamBScore: number;
  };
  matchNumber: number;
  sideALabel: string;
  sideBLabel: string;
  teamSlug: string;
  sessionSlug: string;
  canManage: boolean;
  canDelete?: boolean;
}

export function LiveScoreboardCard({
  game,
  matchNumber,
  sideALabel,
  sideBLabel,
  teamSlug,
  sessionSlug,
  canManage,
  canDelete,
}: LiveScoreboardCardProps) {
  const allowDelete = canDelete ?? canManage;
  const router = useRouter();
  const [scoreA, setScoreA] = useState(game.teamAScore);
  const [scoreB, setScoreB] = useState(game.teamBScore);

  const scoreMutation = useMutation({
    mutationFn: ({ nextA, nextB }: { nextA: number; nextB: number }) =>
      updateGameScoreAction({
        teamSlug,
        sessionSlug,
        gameSlug: game.slug,
        teamAScore: nextA,
        teamBScore: nextB,
      }),
    onSuccess: () => router.refresh(),
    onError: () => sileo.error({ title: "Could not save point." }),
  });

  const winnerMutation = useMutation({
    mutationFn: () =>
      setGameWinnerAction({
        teamSlug,
        sessionSlug,
        gameSlug: game.slug,
        teamAScore: scoreA,
        teamBScore: scoreB,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not finish match." });
        return;
      }
      sileo.success({ title: "Match result saved" });
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not finish match." }),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteGameAction({ teamSlug, sessionSlug, gameSlug: game.slug }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not delete match." });
        return;
      }
      sileo.success({ title: "Match deleted" });
      router.refresh();
    },
  });

  const stepScore = (side: "A" | "B", delta: number) => {
    if (!canManage) return;
    const nextA = side === "A" ? Math.max(0, scoreA + delta) : scoreA;
    const nextB = side === "B" ? Math.max(0, scoreB + delta) : scoreB;
    setScoreA(nextA);
    setScoreB(nextB);
    scoreMutation.mutate({ nextA, nextB });
  };

  const applyScoreInput = (side: "A" | "B", raw: string) => {
    const clean = Math.max(0, Math.min(99, Number(raw.replace(/\D/g, "") || 0)));
    const nextA = side === "A" ? clean : scoreA;
    const nextB = side === "B" ? clean : scoreB;
    setScoreA(nextA);
    setScoreB(nextB);
    scoreMutation.mutate({ nextA, nextB });
  };

  const bwfLeadA = (scoreA >= 21 && scoreA - scoreB >= 2) || scoreA === 30;
  const bwfLeadB = (scoreB >= 21 && scoreB - scoreA >= 2) || scoreB === 30;
  const derivedWinner: "A" | "B" | null =
    scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;
  const leadingLabel = derivedWinner === "A" ? sideALabel : sideBLabel;

  return (
    <div className="cp-fade-up bg-white border border-emerald-200 rounded-2xl p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.22)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-emerald-700">
            In progress · Match #{matchNumber}
          </span>
        </div>
        {allowDelete && (
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            title="Delete match"
            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-stretch">
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-emerald-700">
              Side A
            </span>
            {bwfLeadA && (
              <span className="cp-pop-in text-[11px] font-semibold text-emerald-700">
                Game point reached
              </span>
            )}
          </div>

          <div className="font-display text-[15px] font-bold text-slate-900 leading-snug">
            {sideALabel}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {canManage && (
              <button
                type="button"
                onClick={() => stepScore("A", -1)}
                className="h-11 w-11 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 active:scale-95 transition-transform duration-150 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}

            <input
              type="text"
              inputMode="numeric"
              readOnly={!canManage}
              value={scoreA}
              onChange={(e) => applyScoreInput("A", e.target.value)}
              className="w-20 text-center font-display text-4xl font-extrabold tracking-[-0.04em] bg-transparent text-slate-900 focus:outline-none"
            />

            {canManage && (
              <button
                type="button"
                onClick={() => stepScore("A", 1)}
                className="h-11 w-16 sm:w-14 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all duration-150 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="hidden md:flex md:col-span-1 items-center justify-center text-xs font-mono-nums font-semibold text-slate-400">
          VS
        </div>

        <div className="md:col-span-5 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/40 border border-sky-200 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-700">
              Side B
            </span>
            {bwfLeadB && (
              <span className="cp-pop-in text-[11px] font-semibold text-sky-700">
                Game point reached
              </span>
            )}
          </div>

          <div className="font-display text-[15px] font-bold text-slate-900 leading-snug">
            {sideBLabel}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {canManage && (
              <button
                type="button"
                onClick={() => stepScore("B", -1)}
                className="h-11 w-11 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 active:scale-95 transition-transform duration-150 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}

            <input
              type="text"
              inputMode="numeric"
              readOnly={!canManage}
              value={scoreB}
              onChange={(e) => applyScoreInput("B", e.target.value)}
              className="w-20 text-center font-display text-4xl font-extrabold tracking-[-0.04em] bg-transparent text-slate-900 focus:outline-none"
            />

            {canManage && (
              <button
                type="button"
                onClick={() => stepScore("B", 1)}
                className="h-11 w-16 sm:w-14 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 active:scale-95 transition-all duration-150 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="pt-1">
          <button
            type="button"
            disabled={!derivedWinner || winnerMutation.isPending}
            onClick={() => derivedWinner && winnerMutation.mutate()}
            className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-[13px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed ${
              derivedWinner === "A"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                : derivedWinner === "B"
                ? "bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white"
                : "bg-slate-100 text-slate-400 border border-slate-200 shadow-none"
            } disabled:opacity-75`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>
              {winnerMutation.isPending
                ? "Finalizing match..."
                : derivedWinner
                ? `Finalize match: ${leadingLabel} wins (${scoreA} - ${scoreB})`
                : "Scores are tied - break tie to finalize"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
