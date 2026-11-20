"use client";

import { Activity, Flame, Handshake, ShieldCheck, Target, Trophy, Zap } from "lucide-react";
import type { TeamInsightsSummary } from "@courtpulse/helpers/analytics.helpers";

export function TeamInsightsSection({
  insights,
}: {
  insights: TeamInsightsSummary | null;
}) {
  if (!insights) return null;

  const {
    universalPartner,
    topVersatilePartners,
    bestDuo,
    marginLeader,
    clutchPlayer,
    streakLeader,
    ironman,
    tempo,
  } = insights;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">
          Court intelligence &amp; partner chemistry
        </h3>
        <span className="text-xs text-slate-500 font-mono-nums">
          Based on {tempo.scoredCount} completed matches
        </span>
      </div>

      {/* Superlative highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {universalPartner && (
          <div className="cp-fade-up cp-card-lift rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 border border-emerald-200/90 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.1)] space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-700">
              <Handshake className="w-3.5 h-3.5" />
              <span>Wins with everyone</span>
            </div>
            <div className="font-display text-lg font-extrabold text-slate-900 truncate">
              {universalPartner.playerName}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Winning record with{" "}
              <span className="font-mono-nums font-bold text-emerald-700">
                {universalPartner.winningPartners}/{universalPartner.distinctPartners}
              </span>{" "}
              partners ({universalPartner.avgPartnerWinRate}% avg)
            </p>
          </div>
        )}

        {clutchPlayer && (
          <div
            style={{ animationDelay: "60ms" }}
            className="cp-fade-up cp-card-lift rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/60 border border-sky-200/90 shadow-[0_2px_10px_-4px_rgba(14,116,144,0.1)] space-y-2"
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-sky-700">
              <Zap className="w-3.5 h-3.5" />
              <span>Clutch finisher</span>
            </div>
            <div className="font-display text-lg font-extrabold text-slate-900 truncate">
              {clutchPlayer.name}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-mono-nums font-bold text-sky-700">
                {clutchPlayer.winRate}%
              </span>{" "}
              win rate in tight games within 3 pts ({clutchPlayer.wins}-{clutchPlayer.games - clutchPlayer.wins})
            </p>
          </div>
        )}

        {marginLeader && (
          <div
            style={{ animationDelay: "120ms" }}
            className="cp-fade-up cp-card-lift rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/40 border border-teal-200/80 shadow-[0_2px_10px_-4px_rgba(15,118,110,0.08)] space-y-2"
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-teal-700">
              <Target className="w-3.5 h-3.5" />
              <span>Margin leader</span>
            </div>
            <div className="font-display text-lg font-extrabold text-slate-900 truncate">
              {marginLeader.name}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-mono-nums font-bold text-teal-700">
                {marginLeader.avgDiff > 0 ? `+${marginLeader.avgDiff}` : marginLeader.avgDiff}
              </span>{" "}
              pts avg margin across {marginLeader.games} matches
            </p>
          </div>
        )}

        {streakLeader && (
          <div
            style={{ animationDelay: "180ms" }}
            className="cp-fade-up cp-card-lift rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border border-amber-200/80 shadow-[0_2px_10px_-4px_rgba(180,83,9,0.08)] space-y-2"
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-amber-700">
              <Flame className="w-3.5 h-3.5" />
              <span>Longest streak</span>
            </div>
            <div className="font-display text-lg font-extrabold text-slate-900 truncate">
              {streakLeader.name}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-mono-nums font-bold text-amber-700">
                {streakLeader.bestStreak} wins
              </span>{" "}
              in a row
              {streakLeader.currentStreak > 1
                ? ` (${streakLeader.currentStreak} active now)`
                : ""}
            </p>
          </div>
        )}
      </div>

      {/* Partner versatility breakdown + Tempo records */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {topVersatilePartners.length > 0 && (
          <div className="xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-white flex items-center justify-between gap-2">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Best doubles partner versatility
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ranked by how many distinct teammates each player holds a 50%+ record with
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>

            <div className="divide-y divide-slate-100">
              {topVersatilePartners.map((row, idx) => {
                const ratioPct = Math.round(
                  (row.winningPartners / row.distinctPartners) * 100
                );
                return (
                  <div
                    key={row.playerKey}
                    className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-emerald-50/25 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`h-6 w-6 rounded-md text-xs font-display font-bold flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-sm font-bold text-slate-900 truncate">
                          {row.playerName}
                        </div>
                        <div className="text-[11px] font-mono-nums text-slate-500">
                          {row.doublesWins}W in {row.doublesPlays} doubles ·{" "}
                          {row.avgPartnerWinRate}% avg partner win%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:block w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                          style={{ width: `${ratioPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono-nums font-bold text-emerald-700 w-16 text-right">
                        {row.winningPartners}/{row.distinctPartners} pairs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="xl:col-span-5 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-teal-50/40 to-white flex items-center justify-between gap-2">
            <div>
              <h4 className="font-display text-sm font-bold text-slate-900">
                Match tempo &amp; club records
              </h4>
              <p className="text-[11px] text-slate-500">
                Competitiveness and standout marks
              </p>
            </div>
            <Activity className="w-4 h-4 text-teal-600 shrink-0" />
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {bestDuo && (
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-700">
                    Best duo chemistry
                  </div>
                  <div className="font-display text-sm font-bold text-slate-900 truncate mt-0.5">
                    {bestDuo.pairLabel}
                  </div>
                </div>
                <span className="text-xs font-mono-nums font-bold text-emerald-800 shrink-0">
                  {bestDuo.winRate}% ({bestDuo.wins}/{bestDuo.plays})
                </span>
              </div>
            )}

            {tempo.biggestMargin > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    Biggest win ({tempo.biggestWinScore})
                  </div>
                  <div className="font-display text-sm font-bold text-slate-900 truncate mt-0.5">
                    {tempo.biggestWinners}
                  </div>
                </div>
                <span className="text-xs font-mono-nums font-bold text-slate-700 shrink-0">
                  +{tempo.biggestMargin} pts
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/70">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-sky-700">
                  Close games
                </div>
                <div className="font-display text-lg font-extrabold text-slate-900 mt-0.5">
                  {tempo.closeGamesPct}%
                </div>
                <div className="text-[11px] text-slate-500">
                  Avg gap {tempo.avgMargin} pts
                </div>
              </div>

              {ironman && (
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70">
                  <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 inline-flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    <span>Most active</span>
                  </div>
                  <div className="font-display text-sm font-bold text-slate-900 truncate mt-0.5">
                    {ironman.name}
                  </div>
                  <div className="text-[11px] font-mono-nums text-slate-500">
                    {ironman.games} matches played
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
