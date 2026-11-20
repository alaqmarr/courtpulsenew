"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Shuffle, SlidersHorizontal, Sparkles } from "lucide-react";
import { sileo } from "sileo";
import { getInitials } from "@courtpulse/helpers/analytics.helpers";
import {
  canonicalMatchupKey,
  canonicalPairKey,
  pickMatchPairing,
} from "@courtpulse/helpers/pairing.helpers";
import { createGameAction } from "@courtpulse/teams/game.action";
import { BadmintonCourt } from "@courtpulse/ui/primitives/badminton-court.component";

interface MemberOption {
  id: string;
  email: string;
  displayName: string;
  isPresent: boolean;
}

export function GameCreator({
  teamSlug,
  sessionSlug,
  members,
  playCountByEmail = {},
  pairPlayCounts = {},
  singlesMatchupCounts = {},
  matchupPlayCounts = {},
  lastGamePlayerEmails = [],
}: {
  teamSlug: string;
  sessionSlug: string;
  members: MemberOption[];
  playCountByEmail?: Record<string, number>;
  pairPlayCounts?: Record<string, number>;
  singlesMatchupCounts?: Record<string, number>;
  matchupPlayCounts?: Record<string, number>;
  lastGamePlayerEmails?: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"DOUBLES" | "SINGLES">("DOUBLES");
  const [selectionMode, setSelectionMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [activeSide, setActiveSide] = useState<"A" | "B">("A");
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [waitingRefresh, setWaitingRefresh] = useState(false);

  const perSideLimit = mode === "DOUBLES" ? 2 : 1;
  const presentMembers = useMemo(
    () => members.filter((m) => m.isPresent),
    [members]
  );
  const presentEmailSet = useMemo(
    () => new Set(presentMembers.map((m) => m.email.toLowerCase())),
    [presentMembers]
  );
  const activeTeamA = teamA.filter((e) => presentEmailSet.has(e));
  const activeTeamB = teamB.filter((e) => presentEmailSet.has(e));

  const labelByEmail = useMemo(
    () => new Map(members.map((m) => [m.email.toLowerCase(), m.displayName])),
    [members]
  );

  const shortName = (email: string) =>
    labelByEmail.get(email.toLowerCase()) || email.split("@")[0];

  const statsSig = JSON.stringify([
    playCountByEmail,
    pairPlayCounts,
    singlesMatchupCounts,
    lastGamePlayerEmails,
    presentMembers.map((m) => m.email),
  ]);
  const prevStatsSigRef = useRef(statsSig);

  useEffect(() => {
    if (prevStatsSigRef.current !== statsSig) {
      prevStatsSigRef.current = statsSig;
      if (waitingRefresh) {
        setWaitingRefresh(false);
      }
    }
  }, [statsSig, waitingRefresh]);

  useEffect(() => {
    if (!waitingRefresh) return;
    const timer = setTimeout(() => setWaitingRefresh(false), 600);
    return () => clearTimeout(timer);
  }, [waitingRefresh]);

  const applyFairRandomise = (notify: boolean) => {
    const result = pickMatchPairing({
      mode,
      strategy: "FAIR",
      presentEmails: presentMembers.map((m) => m.email),
      playCountByEmail,
      pairPlayCounts,
      singlesMatchupCounts,
      matchupPlayCounts,
      lastGamePlayerEmails,
      currentSideA: activeTeamA,
      currentSideB: activeTeamB,
    });

    if (!result.ok) {
      if (notify) sileo.error({ title: result.message });
      return;
    }

    setTeamA(result.teamA);
    setTeamB(result.teamB);

    if (!notify) return;

    if (mode === "DOUBLES") {
      const bothFresh = result.sideAPairPlays === 0 && result.sideBPairPlays === 0;
      sileo.info({
        title: bothFresh ? "Randomised fair fresh pairs" : "Randomised fairest available pairs",
      });
    } else {
      sileo.info({
        title:
          result.matchupPlays === 0
            ? "Randomised a fresh 1v1 matchup"
            : `Matched players (played ${result.matchupPlays}x today)`,
      });
    }
  };

  // Auto pick fills the court whenever in AUTO mode and court is empty (after refresh finishes)
  useEffect(() => {
    if (selectionMode !== "AUTO" || waitingRefresh) return;
    if (activeTeamA.length > 0 || activeTeamB.length > 0) return;
    if (presentMembers.length < perSideLimit * 2) return;

    const result = pickMatchPairing({
      mode,
      strategy: "FAIR",
      presentEmails: presentMembers.map((m) => m.email),
      playCountByEmail,
      pairPlayCounts,
      singlesMatchupCounts,
      matchupPlayCounts,
      lastGamePlayerEmails,
    });

    if (result.ok) {
      setTeamA(result.teamA);
      setTeamB(result.teamB);
    }
  }, [
    selectionMode,
    waitingRefresh,
    activeTeamA.length,
    activeTeamB.length,
    mode,
    perSideLimit,
    presentMembers,
    playCountByEmail,
    pairPlayCounts,
    singlesMatchupCounts,
    matchupPlayCounts,
    lastGamePlayerEmails,
  ]);

  const handleModeChange = (nextMode: "DOUBLES" | "SINGLES") => {
    setMode(nextMode);
    setTeamA([]);
    setTeamB([]);
    setActiveSide("A");
  };

  const handleSelectionModeChange = (next: "AUTO" | "MANUAL") => {
    setSelectionMode(next);
    if (
      next === "AUTO" &&
      (activeTeamA.length < perSideLimit || activeTeamB.length < perSideLimit)
    ) {
      applyFairRandomise(false);
    }
  };

  const handleTapPlayer = (email: string) => {
    const key = email.toLowerCase();

    if (activeTeamA.includes(key)) {
      setTeamA(activeTeamA.filter((p) => p !== key));
      setActiveSide("A");
      return;
    }

    if (activeTeamB.includes(key)) {
      setTeamB(activeTeamB.filter((p) => p !== key));
      setActiveSide("B");
      return;
    }

    if (activeSide === "A") {
      if (activeTeamA.length >= perSideLimit) {
        sileo.info({
          title: `Side A already has ${perSideLimit} player${perSideLimit > 1 ? "s" : ""}`,
        });
        return;
      }
      const nextA = [...activeTeamA, key];
      setTeamA(nextA);
      if (nextA.length === perSideLimit && activeTeamB.length < perSideLimit) {
        setActiveSide("B");
      }
    } else {
      if (activeTeamB.length >= perSideLimit) {
        sileo.info({
          title: `Side B already has ${perSideLimit} player${perSideLimit > 1 ? "s" : ""}`,
        });
        return;
      }
      setTeamB([...activeTeamB, key]);
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createGameAction({
        teamSlug,
        sessionSlug,
        teamAPlayers: activeTeamA,
        teamBPlayers: activeTeamB,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not create match." });
        return;
      }
      sileo.success({ title: "Match started" });
      if (selectionMode === "AUTO") {
        setWaitingRefresh(true);
      }
      setTeamA([]);
      setTeamB([]);
      setActiveSide("A");
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not create match." }),
  });

  const canStart = activeTeamA.length === perSideLimit && activeTeamB.length === perSideLimit;

  const pairStatus = (() => {
    if (!canStart) return null;

    if (mode === "DOUBLES") {
      const playsA = pairPlayCounts[canonicalPairKey(activeTeamA[0], activeTeamA[1])] ?? 0;
      const playsB = pairPlayCounts[canonicalPairKey(activeTeamB[0], activeTeamB[1])] ?? 0;
      const matchupPlays =
        matchupPlayCounts[canonicalMatchupKey(activeTeamA, activeTeamB)] ?? 0;
      const labelA = `${shortName(activeTeamA[0])} & ${shortName(activeTeamA[1])}`;
      const labelB = `${shortName(activeTeamB[0])} & ${shortName(activeTeamB[1])}`;
      const bothNew = playsA === 0 && playsB === 0;

      return {
        allFresh: bothNew && matchupPlays === 0,
        summary: bothNew
          ? `Fresh pairs: ${labelA} (not played yet) vs ${labelB} (not played yet)`
          : `${labelA}: ${
              playsA === 0 ? "Not played yet" : `Played ${playsA}x today`
            } · ${labelB}: ${
              playsB === 0 ? "Not played yet" : `Played ${playsB}x today`
            }${matchupPlays > 0 ? ` · Same matchup ${matchupPlays}x` : ""}`,
      };
    }

    const h2h = singlesMatchupCounts[canonicalPairKey(activeTeamA[0], activeTeamB[0])] ?? 0;
    const labelA = shortName(activeTeamA[0]);
    const labelB = shortName(activeTeamB[0]);
    return {
      allFresh: h2h === 0,
      summary:
        h2h === 0
          ? `Fresh matchup: ${labelA} vs ${labelB} have not played today`
          : `${labelA} vs ${labelB}: Played ${h2h}x today`,
    };
  })();

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex p-0.5 sm:p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => handleModeChange("DOUBLES")}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              mode === "DOUBLES"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Doubles (2v2)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("SINGLES")}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              mode === "SINGLES"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Singles (1v1)
          </button>
        </div>

        <button
          type="button"
          onClick={() => applyFairRandomise(true)}
          title="Fair randomise across eligible players prioritizing unplayed pairs"
          className="group inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 active:scale-95 text-emerald-900 rounded-lg shadow-2xs transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          <Shuffle className="w-3.5 h-3.5 text-emerald-600 transition-transform duration-300 group-hover:rotate-180" />
          <span>Randomise</span>
        </button>
      </div>

      <BadmintonCourt
        sideA={activeTeamA.map((email) => ({
          email,
          name: shortName(email),
        }))}
        sideB={activeTeamB.map((email) => ({
          email,
          name: shortName(email),
        }))}
        activeSide={activeSide}
        perSideLimit={perSideLimit}
        onSelectSide={setActiveSide}
        onRemovePlayer={handleTapPlayer}
      />

      {pairStatus && (
        <div
          key={pairStatus.summary}
          className={`cp-fade-up flex items-start gap-2 px-3 py-2 rounded-lg border text-xs leading-snug ${
            pairStatus.allFresh
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-amber-50/90 border-amber-200 text-amber-900"
          }`}
        >
          {pairStatus.allFresh ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{pairStatus.summary}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-xs font-mono-nums text-slate-500 whitespace-nowrap">
          Pool ({presentMembers.length})
        </span>

        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/70 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectionModeChange("AUTO")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              selectionMode === "AUTO"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Auto pick</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectionModeChange("MANUAL")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              selectionMode === "MANUAL"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-500 shrink-0" />
            <span>
              Manual<span className="hidden sm:inline"> selection</span>
            </span>
          </button>
        </div>
      </div>

      {selectionMode === "MANUAL" && (
        <div className="space-y-2 pt-1 cp-fade-up">
          <div className="text-xs text-slate-500">
            Tap a player to place on{" "}
            <span
              className={
                activeSide === "A"
                  ? "text-emerald-700 font-semibold"
                  : "text-sky-700 font-semibold"
              }
            >
              Side {activeSide}
            </span>
          </div>

          {presentMembers.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-lg text-center">
              No players in this session pool yet. Include players above to start matching.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {presentMembers.map((m) => {
                const key = m.email.toLowerCase();
                const inA = activeTeamA.includes(key);
                const inB = activeTeamB.includes(key);
                const playsToday = playCountByEmail[key] ?? 0;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleTapPlayer(key)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 text-[13px] text-left rounded-lg border transition-all cursor-pointer ${
                      inA
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400 text-emerald-950 font-semibold"
                        : inB
                        ? "bg-gradient-to-r from-sky-50 to-cyan-50 border-sky-400 text-sky-950 font-semibold"
                        : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                        {getInitials(m.displayName)}
                      </span>
                      <span className="truncate">{m.displayName}</span>
                    </div>
                    {playsToday > 0 && (
                      <span className="text-[10px] font-mono-nums text-slate-500 shrink-0">
                        {playsToday}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!canStart || createMutation.isPending}
        onClick={() => createMutation.mutate()}
        className="w-full py-2.5 px-4 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-lg shadow-sm transition-all cursor-pointer"
      >
        {createMutation.isPending ? "Starting match..." : "Start match"}
      </button>
    </div>
  );
}
