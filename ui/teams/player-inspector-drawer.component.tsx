"use client";

import { X } from "lucide-react";
import {
  calculatePlayerPartnerBreakdown,
  getInitials,
} from "@courtpulse/helpers/analytics.helpers";
import type {
  GameLike,
  MemberIdentity,
  PlayerStatRow,
} from "@courtpulse/helpers/stats.helpers";
import { WinRing } from "@courtpulse/ui/primitives/win-ring.component";

export function PlayerInspectorDrawer({
  player,
  games,
  members,
  onClose,
}: {
  player: PlayerStatRow | null;
  games: GameLike[];
  members: MemberIdentity[];
  onClose: () => void;
}) {
  if (!player) return null;

  const partners = calculatePlayerPartnerBreakdown(player.key, games, members);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-white border-l border-slate-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-900 shrink-0">
              {getInitials(player.name)}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {player.name}
              </h2>
              {player.email && (
                <p className="text-xs text-slate-500 truncate">{player.email}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-xl p-4 flex items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <div className="text-xs text-emerald-100/80">Overall record</div>
            <div className="text-xl font-bold font-mono-nums text-white">
              {player.wins}W / {player.losses}L
            </div>
            <div className="text-xs text-emerald-100/80 font-mono-nums">
              {player.games} matches · {player.points} points
            </div>
          </div>
          <WinRing
            percent={player.winRate}
            size={68}
            strokeWidth={5}
            label="win"
            tone="on-gradient"
          />
        </div>

        {player.recentForm.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600">Last 5 matches</div>
            <div className="flex items-center gap-2">
              {player.recentForm.map((res, idx) => (
                <span
                  key={idx}
                  className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold font-mono-nums ${
                    res === "W"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {res}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-600">
            Doubles partners ({partners.length})
          </div>
          {partners.length === 0 ? (
            <p className="text-sm text-slate-500">No doubles games recorded yet.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {partners.map((p) => (
                <div
                  key={p.partnerKey}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {p.partnerName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono-nums">
                      {p.plays} together ({p.wins}W / {p.losses}L)
                    </div>
                  </div>
                  <div className="text-sm font-bold font-mono-nums text-emerald-700 shrink-0">
                    {p.winRate}%
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
