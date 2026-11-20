"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { sileo } from "sileo";
import {
  deleteGameAction,
  updateGameScoreAction,
} from "@courtpulse/teams/game.action";
import { CompletedMatchCourt } from "@courtpulse/ui/primitives/badminton-court.component";
import { LiveScoreboardCard } from "./live-scoreboard-card.component";

interface GameItem {
  id: string;
  slug: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAScore: number;
  teamBScore: number;
  winner: "A" | "B" | null;
}

export function GamesList({
  games,
  teamSlug,
  sessionSlug,
  canManage,
  canScore,
  canDeleteActive,
  canDeleteCompleted,
  labelMap,
}: {
  games: GameItem[];
  teamSlug: string;
  sessionSlug: string;
  canManage: boolean;
  canScore?: boolean;
  canDeleteActive?: boolean;
  canDeleteCompleted?: boolean;
  labelMap: Record<string, string>;
}) {
  const allowScore = canScore ?? canManage;
  const allowDeleteActive = canDeleteActive ?? canManage;
  const allowDeleteCompleted = canDeleteCompleted ?? canManage;
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<
    Record<string, { a: string; b: string }>
  >({});
  const touchStartX = useRef<number | null>(null);

  const resolveNameList = (tokens: string[]) =>
    tokens.map((token) => {
      const mapped = labelMap[token.trim().toLowerCase()];
      if (mapped) return mapped;
      return token.includes("@") ? token.split("@")[0] : token;
    });

  const updateScoreMutation = useMutation({
    mutationFn: ({
      gameSlug,
      teamAScore,
      teamBScore,
    }: {
      gameSlug: string;
      teamAScore: number;
      teamBScore: number;
    }) =>
      updateGameScoreAction({
        teamSlug,
        sessionSlug,
        gameSlug,
        teamAScore,
        teamBScore,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update score." });
        return;
      }
      sileo.success({ title: "Score updated" });
      setEditingId(null);
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (gameSlug: string) =>
      deleteGameAction({ teamSlug, sessionSlug, gameSlug }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not delete match." });
        return;
      }
      sileo.success({ title: "Match deleted" });
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not delete match." }),
  });

  const matchIndexMap = new Map<string, number>();
  games.forEach((g, idx) => matchIndexMap.set(g.id, games.length - idx));

  const activeGames = games.filter((g) => !g.winner);
  const completedGames = games.filter((g) => Boolean(g.winner)).reverse();

  const totalCompleted = completedGames.length;
  const safeIndex =
    totalCompleted > 0 ? Math.min(slideIndex, totalCompleted - 1) : 0;
  const activeCompleted = completedGames[safeIndex] ?? null;

  const goToIndex = (nextIdx: number) => {
    if (totalCompleted === 0) return;
    const bounded = Math.max(0, Math.min(totalCompleted - 1, nextIdx));
    setSlideIndex(bounded);
    setEditingId(null);
  };

  // Show at most 7 match selector pills centered around the current slide
  const windowSize = 7;
  const halfWindow = Math.floor(windowSize / 2);
  let startWindow = Math.max(0, safeIndex - halfWindow);
  const endWindow = Math.min(totalCompleted, startWindow + windowSize);
  startWindow = Math.max(0, endWindow - windowSize);
  const visibleSliceIndices = Array.from(
    { length: Math.max(0, endWindow - startWindow) },
    (_, offset) => startWindow + offset
  );

  return (
    <div className="space-y-5">
      {activeGames.length > 0 && (
        <div className="space-y-3 cp-fade-up">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <h2 className="text-xs font-semibold text-emerald-700">
              Live court ({activeGames.length})
            </h2>
          </div>
          {activeGames.map((game) => (
            <LiveScoreboardCard
              key={game.id}
              game={game}
              matchNumber={matchIndexMap.get(game.id) ?? 1}
              sideALabel={resolveNameList(game.teamAPlayers).join(" + ")}
              sideBLabel={resolveNameList(game.teamBPlayers).join(" + ")}
              teamSlug={teamSlug}
              sessionSlug={sessionSlug}
              canManage={allowScore}
              canDelete={allowDeleteActive}
            />
          ))}
        </div>
      )}

      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") goToIndex(safeIndex - 1);
          if (e.key === "ArrowRight") goToIndex(safeIndex + 1);
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
          const deltaX = touchStartX.current - endX;
          if (Math.abs(deltaX) > 45) {
            goToIndex(deltaX > 0 ? safeIndex + 1 : safeIndex - 1);
          }
          touchStartX.current = null;
        }}
        className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-emerald-200"
      >
        <div className="px-3.5 sm:px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 flex items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
            Completed ({totalCompleted})
          </h2>

          {totalCompleted > 0 && (
            <div className="flex items-center gap-2">
              {totalCompleted > 5 && (
                <select
                  aria-label="Jump to match"
                  value={safeIndex}
                  onChange={(e) => goToIndex(Number(e.target.value))}
                  className="px-2 py-1 text-xs font-mono-nums bg-white text-slate-700 border border-slate-200 rounded-md focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {completedGames.map((g, idx) => (
                    <option key={g.id} value={idx}>
                      Match #{matchIndexMap.get(g.id) ?? idx + 1}
                    </option>
                  ))}
                </select>
              )}

              <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  disabled={safeIndex === 0}
                  onClick={() => goToIndex(safeIndex - 1)}
                  aria-label="Previous match"
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-mono-nums font-semibold text-slate-700">
                  {safeIndex + 1} / {totalCompleted}
                </span>
                <button
                  type="button"
                  disabled={safeIndex >= totalCompleted - 1}
                  onClick={() => goToIndex(safeIndex + 1)}
                  aria-label="Next match"
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {!activeCompleted ? (
          <div className="p-8 text-sm text-slate-500 text-center">
            {activeGames.length > 0
              ? "Finish an active match above to record the result."
              : "No matches recorded in this session yet."}
          </div>
        ) : (
          (() => {
            const game = activeCompleted;
            const matchNumber = matchIndexMap.get(game.id) ?? 1;
            const sideANames = resolveNameList(game.teamAPlayers);
            const sideBNames = resolveNameList(game.teamBPlayers);
            const isEditing = editingId === game.id;
            const draft = scoreDrafts[game.id] ?? {
              a: String(game.teamAScore),
              b: String(game.teamBScore),
            };
            const winnerLabel =
              game.winner === "A"
                ? sideANames.join(" & ")
                : sideBNames.join(" & ");

            return (
              <div key={game.id} className="p-4 sm:p-5 space-y-3 cp-slide-swap">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono-nums font-semibold text-slate-500">
                      Match #{matchNumber}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-semibold text-emerald-700 truncate">
                      {winnerLabel} won
                    </span>
                  </div>

                  {(allowScore || allowDeleteCompleted) && (
                    <div className="flex items-center gap-1.5">
                      {allowScore && isEditing && (
                        <div className="inline-flex items-center gap-1 mr-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draft.a}
                            onChange={(e) =>
                              setScoreDrafts((prev) => ({
                                ...prev,
                                [game.id]: {
                                  ...draft,
                                  a: e.target.value.replace(/\D/g, "").slice(0, 2),
                                },
                              }))
                            }
                            className="w-10 py-0.5 text-center text-xs font-mono-nums bg-white text-slate-900 border border-slate-300 rounded"
                          />
                          <span className="text-xs text-slate-400">-</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draft.b}
                            onChange={(e) =>
                              setScoreDrafts((prev) => ({
                                ...prev,
                                [game.id]: {
                                  ...draft,
                                  b: e.target.value.replace(/\D/g, "").slice(0, 2),
                                },
                              }))
                            }
                            className="w-10 py-0.5 text-center text-xs font-mono-nums bg-white text-slate-900 border border-slate-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateScoreMutation.mutate({
                                gameSlug: game.slug,
                                teamAScore: Number(draft.a || 0),
                                teamBScore: Number(draft.b || 0),
                              })
                            }
                            className="px-2 py-0.5 text-xs font-semibold bg-emerald-600 text-white rounded cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      )}
                      {allowScore && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(isEditing ? null : game.id);
                            setScoreDrafts((prev) => ({
                              ...prev,
                              [game.id]: {
                                a: String(game.teamAScore),
                                b: String(game.teamBScore),
                              },
                            }));
                          }}
                          title="Edit score"
                          className="p-1 text-slate-400 hover:text-slate-800 rounded cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {allowDeleteCompleted && (
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(game.slug)}
                          title="Delete match"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {game.winner && (
                  <CompletedMatchCourt
                    sideANames={sideANames}
                    sideBNames={sideBNames}
                    scoreA={game.teamAScore}
                    scoreB={game.teamBScore}
                    winner={game.winner}
                  />
                )}

                {totalCompleted > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    {startWindow > 0 && (
                      <button
                        type="button"
                        onClick={() => goToIndex(0)}
                        className="px-2 py-1 text-[11px] font-mono-nums text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        First
                      </button>
                    )}

                    {visibleSliceIndices.map((idx) => {
                      const g = completedGames[idx];
                      const num = matchIndexMap.get(g.id) ?? idx + 1;
                      const isCurrent = idx === safeIndex;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => goToIndex(idx)}
                          className={`px-2.5 py-1 text-[11px] font-mono-nums font-semibold rounded-md transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          }`}
                        >
                          #{num}
                        </button>
                      );
                    })}

                    {endWindow < totalCompleted && (
                      <button
                        type="button"
                        onClick={() => goToIndex(totalCompleted - 1)}
                        className="px-2 py-1 text-[11px] font-mono-nums text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        Latest
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
