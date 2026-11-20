"use client";

import { Trophy, UserPlus, X } from "lucide-react";
import { getInitials } from "@courtpulse/helpers/analytics.helpers";

export interface CourtPlayer {
  email: string;
  name: string;
}

interface BadmintonCourtProps {
  sideA: CourtPlayer[];
  sideB: CourtPlayer[];
  activeSide: "A" | "B";
  perSideLimit: number;
  onSelectSide: (side: "A" | "B") => void;
  onRemovePlayer: (email: string) => void;
}

export function CourtMarkingsSvg({
  orientation = "horizontal",
}: {
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <svg
        viewBox="0 0 260 360"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-2.5 w-[calc(100%-1.25rem)] h-[calc(100%-1.25rem)] pointer-events-none"
      >
        {/* Outer Doubles Boundary */}
        <rect
          x="2"
          y="2"
          width="256"
          height="356"
          fill="none"
          stroke="rgba(255,255,255,0.68)"
          strokeWidth="1.8"
          rx="2"
        />
        {/* Singles Side Lines */}
        <line x1="20" y1="2" x2="20" y2="358" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
        <line x1="240" y1="2" x2="240" y2="358" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
        {/* Doubles Long Service Lines */}
        <line x1="2" y1="26" x2="258" y2="26" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
        <line x1="2" y1="334" x2="258" y2="334" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
        {/* Short Service Lines */}
        <line x1="2" y1="128" x2="258" y2="128" stroke="rgba(255,255,255,0.58)" strokeWidth="1.4" />
        <line x1="2" y1="232" x2="258" y2="232" stroke="rgba(255,255,255,0.58)" strokeWidth="1.4" />
        {/* Center Service Lines (splitting Left & Right service boxes) */}
        <line x1="130" y1="2" x2="130" y2="128" stroke="rgba(255,255,255,0.52)" strokeWidth="1.3" />
        <line x1="130" y1="232" x2="130" y2="358" stroke="rgba(255,255,255,0.52)" strokeWidth="1.3" />
        {/* Horizontal Center Net */}
        <line
          x1="0"
          y1="180"
          x2="260"
          y2="180"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2.6"
          strokeDasharray="6 4"
        />
        <circle cx="4" cy="180" r="3.5" fill="#ffffff" />
        <circle cx="256" cy="180" r="3.5" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 600 260"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-3 sm:inset-4 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] h-[calc(100%-1.5rem)] sm:h-[calc(100%-2rem)] pointer-events-none"
    >
      <rect
        x="2"
        y="2"
        width="596"
        height="256"
        fill="none"
        stroke="rgba(255,255,255,0.68)"
        strokeWidth="2"
        rx="2"
      />
      <line x1="2" y1="22" x2="598" y2="22" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
      <line x1="2" y1="238" x2="598" y2="238" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
      <line x1="44" y1="2" x2="44" y2="258" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
      <line x1="556" y1="2" x2="556" y2="258" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
      <line x1="212" y1="2" x2="212" y2="258" stroke="rgba(255,255,255,0.58)" strokeWidth="1.6" />
      <line x1="388" y1="2" x2="388" y2="258" stroke="rgba(255,255,255,0.58)" strokeWidth="1.6" />
      <line x1="2" y1="130" x2="212" y2="130" stroke="rgba(255,255,255,0.52)" strokeWidth="1.5" />
      <line x1="388" y1="130" x2="598" y2="130" stroke="rgba(255,255,255,0.52)" strokeWidth="1.5" />
      <line
        x1="300"
        y1="0"
        x2="300"
        y2="260"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="3"
        strokeDasharray="6 4"
      />
      <circle cx="300" cy="4" r="4" fill="#ffffff" />
      <circle cx="300" cy="256" r="4" fill="#ffffff" />
    </svg>
  );
}

function PlayerToken({
  player,
  side,
  onRemove,
}: {
  player: CourtPlayer;
  side: "A" | "B";
  onRemove: (email: string) => void;
}) {
  const isA = side === "A";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRemove(player.email);
      }}
      title={`Remove ${player.name}`}
      className={`cp-pop-in group inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white/95 backdrop-blur-xs shadow-[0_6px_16px_-4px_rgba(2,44,34,0.55)] border transition-all hover:scale-[1.03] active:scale-95 cursor-pointer max-w-full ${
        isA
          ? "border-emerald-200 hover:border-white"
          : "border-sky-200 hover:border-white"
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 text-white shadow-2xs ${
          isA
            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
            : "bg-gradient-to-br from-sky-500 to-cyan-600"
        }`}
      >
        {getInitials(player.name)}
      </span>
      <span className="font-display font-bold text-xs text-slate-900 truncate max-w-[96px] sm:max-w-[118px]">
        {player.name}
      </span>
      <X
        className={`w-3 h-3 shrink-0 transition-colors ${
          isA
            ? "text-emerald-600/70 group-hover:text-rose-600"
            : "text-sky-600/70 group-hover:text-rose-600"
        }`}
      />
    </button>
  );
}

function StaticPlayerToken({
  name,
  won,
}: {
  name: string;
  won: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border max-w-full transition-all ${
        won
          ? "bg-white/95 border-emerald-200 shadow-[0_6px_14px_-4px_rgba(2,44,34,0.55)] text-slate-900"
          : "bg-slate-200/85 border-slate-300/60 text-slate-600 opacity-85"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
          won
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            : "bg-slate-400 text-white"
        }`}
      >
        {getInitials(name)}
      </span>
      <span className="font-display font-bold text-xs truncate max-w-[112px] sm:max-w-[130px]">
        {name}
      </span>
    </div>
  );
}

function EmptyCourtSlot({
  side,
  label,
}: {
  side: "A" | "B";
  label: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed text-[11px] font-medium transition-colors whitespace-nowrap ${
        side === "A"
          ? "border-emerald-200/45 bg-emerald-950/20 text-emerald-100/80"
          : "border-sky-200/45 bg-sky-950/20 text-sky-100/80"
      }`}
    >
      <UserPlus className="w-3 h-3 opacity-75 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

export function BadmintonCourt({
  sideA,
  sideB,
  activeSide,
  perSideLimit,
  onSelectSide,
  onRemovePlayer,
}: BadmintonCourtProps) {
  const isDoubles = perSideLimit === 2;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <button
          type="button"
          onClick={() => onSelectSide("A")}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeSide === "A"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Side A</span>
          <span className="font-mono-nums text-[11px] opacity-75">
            {sideA.length}/{perSideLimit}
          </span>
        </button>

        <span className="text-[10px] font-mono-nums uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">
          {isDoubles ? "Doubles" : "Singles"}
        </span>

        <button
          type="button"
          onClick={() => onSelectSide("B")}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeSide === "B"
              ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="font-mono-nums text-[11px] opacity-75">
            {sideB.length}/{perSideLimit}
          </span>
          <span>Side B</span>
          <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
        </button>
      </div>

      {/* Vertical Top-vs-Bottom court on mobile (< sm) so names fit cleanly side by side */}
      <div className="sm:hidden relative w-full rounded-2xl overflow-hidden border border-emerald-950/25 bg-gradient-to-b from-[#064e3b] via-[#057a55] to-[#046c4e] p-2.5 shadow-[0_14px_30px_-14px_rgba(6,78,59,0.55)]">
        <CourtMarkingsSvg orientation="vertical" />

        <div className="relative z-10 grid grid-rows-2 min-h-[256px]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectSide("A")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectSide("A");
            }}
            className={`relative rounded-t-lg transition-colors cursor-pointer pb-4 pt-3 px-2 flex items-center ${
              activeSide === "A"
                ? "bg-white/[0.08] ring-1 ring-inset ring-emerald-300/45"
                : "hover:bg-white/[0.04]"
            }`}
          >
            {isDoubles ? (
              <div className="w-full grid grid-cols-2 gap-2 place-items-center">
                {sideA[0] ? (
                  <PlayerToken player={sideA[0]} side="A" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="A" label="Court A1" />
                )}
                {sideA[1] ? (
                  <PlayerToken player={sideA[1]} side="A" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="A" label="Court A2" />
                )}
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                {sideA[0] ? (
                  <PlayerToken player={sideA[0]} side="A" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="A" label="Side A player" />
                )}
              </div>
            )}
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectSide("B")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectSide("B");
            }}
            className={`relative rounded-b-lg transition-colors cursor-pointer pt-4 pb-3 px-2 flex items-center ${
              activeSide === "B"
                ? "bg-sky-300/[0.12] ring-1 ring-inset ring-sky-300/50"
                : "hover:bg-white/[0.04]"
            }`}
          >
            {isDoubles ? (
              <div className="w-full grid grid-cols-2 gap-2 place-items-center">
                {sideB[0] ? (
                  <PlayerToken player={sideB[0]} side="B" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="B" label="Court B1" />
                )}
                {sideB[1] ? (
                  <PlayerToken player={sideB[1]} side="B" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="B" label="Court B2" />
                )}
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                {sideB[0] ? (
                  <PlayerToken player={sideB[0]} side="B" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="B" label="Side B player" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Left-vs-Right court on sm+ screens */}
      <div className="hidden sm:block relative w-full rounded-2xl overflow-hidden border border-emerald-950/25 bg-gradient-to-br from-[#064e3b] via-[#057a55] to-[#046c4e] p-4 shadow-[0_14px_30px_-14px_rgba(6,78,59,0.55)]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 70% at 50% 50%, rgba(52, 211, 153, 0.16), transparent 75%)",
          }}
        />

        <CourtMarkingsSvg orientation="horizontal" />

        <div className="relative z-10 grid grid-cols-2 min-h-[228px]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectSide("A")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectSide("A");
            }}
            className={`relative rounded-l-lg transition-colors cursor-pointer ${
              activeSide === "A"
                ? "bg-white/[0.08] ring-1 ring-inset ring-emerald-300/45"
                : "hover:bg-white/[0.04]"
            }`}
          >
            {isDoubles ? (
              <div className="h-full grid grid-rows-2 pr-[14%] pl-4 py-3">
                <div className="flex items-center justify-center">
                  {sideA[0] ? (
                    <PlayerToken player={sideA[0]} side="A" onRemove={onRemovePlayer} />
                  ) : (
                    <EmptyCourtSlot side="A" label="Court A1" />
                  )}
                </div>
                <div className="flex items-center justify-center">
                  {sideA[1] ? (
                    <PlayerToken player={sideA[1]} side="A" onRemove={onRemovePlayer} />
                  ) : (
                    <EmptyCourtSlot side="A" label="Court A2" />
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center pr-[12%] pl-2">
                {sideA[0] ? (
                  <PlayerToken player={sideA[0]} side="A" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="A" label="Side A player" />
                )}
              </div>
            )}
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectSide("B")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectSide("B");
            }}
            className={`relative rounded-r-lg transition-colors cursor-pointer ${
              activeSide === "B"
                ? "bg-sky-300/[0.12] ring-1 ring-inset ring-sky-300/50"
                : "hover:bg-white/[0.04]"
            }`}
          >
            {isDoubles ? (
              <div className="h-full grid grid-rows-2 pl-[14%] pr-4 py-3">
                <div className="flex items-center justify-center">
                  {sideB[0] ? (
                    <PlayerToken player={sideB[0]} side="B" onRemove={onRemovePlayer} />
                  ) : (
                    <EmptyCourtSlot side="B" label="Court B1" />
                  )}
                </div>
                <div className="flex items-center justify-center">
                  {sideB[1] ? (
                    <PlayerToken player={sideB[1]} side="B" onRemove={onRemovePlayer} />
                  ) : (
                    <EmptyCourtSlot side="B" label="Court B2" />
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center pl-[12%] pr-2">
                {sideB[0] ? (
                  <PlayerToken player={sideB[0]} side="B" onRemove={onRemovePlayer} />
                ) : (
                  <EmptyCourtSlot side="B" label="Side B player" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CompletedMatchCourtProps {
  sideANames: string[];
  sideBNames: string[];
  scoreA: number;
  scoreB: number;
  winner: "A" | "B";
}

export function CompletedMatchCourt({
  sideANames,
  sideBNames,
  scoreA,
  scoreB,
  winner,
}: CompletedMatchCourtProps) {
  const aWon = winner === "A";
  const bWon = winner === "B";
  const hasScore = scoreA > 0 || scoreB > 0;
  const isDoublesA = sideANames.length >= 2;
  const isDoublesB = sideBNames.length >= 2;

  return (
    <>
      {/* Vertical Top-vs-Bottom Completed Court on mobile (< sm): zero truncation, clear net-side scores */}
      <div className="sm:hidden relative w-full rounded-xl overflow-hidden border border-emerald-950/20 bg-gradient-to-b from-[#064e3b] via-[#057a55] to-[#046c4e] shadow-[0_8px_22px_-12px_rgba(6,78,59,0.45)]">
        <div className="absolute inset-0 grid grid-rows-2 pointer-events-none">
          <div
            className={
              aWon
                ? "bg-gradient-to-b from-emerald-400/10 to-teal-300/10"
                : "bg-slate-900/65 backdrop-saturate-[0.15]"
            }
          />
          <div
            className={
              bWon
                ? "bg-gradient-to-t from-emerald-400/10 to-teal-300/10"
                : "bg-slate-900/65 backdrop-saturate-[0.15]"
            }
          />
        </div>

        <div className="relative p-2.5">
          <CourtMarkingsSvg orientation="vertical" />

          <div className="relative z-10 grid grid-rows-2 min-h-[246px]">
            {/* Top Side A */}
            <div className="relative flex flex-col justify-between pt-3 pb-5 px-2">
              <div
                className={`w-full grid ${
                  isDoublesA ? "grid-cols-2" : "grid-cols-1"
                } gap-2 place-items-center`}
              >
                {sideANames.map((name, idx) => (
                  <StaticPlayerToken key={`${name}-${idx}`} name={name} won={aWon} />
                ))}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                {aWon && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-300/95 text-amber-950 text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>Win</span>
                  </span>
                )}
                <div
                  className={`px-3 py-1 rounded-lg font-display font-extrabold text-xl leading-none shadow-sm ${
                    aWon
                      ? "bg-white text-emerald-950"
                      : "bg-slate-800/80 text-slate-300 border border-white/10"
                  }`}
                >
                  {hasScore ? scoreA : aWon ? "W" : "L"}
                </div>
              </div>
            </div>

            {/* Bottom Side B */}
            <div className="relative flex flex-col justify-between pt-5 pb-3 px-2">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                {bWon && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-300/95 text-amber-950 text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>Win</span>
                  </span>
                )}
                <div
                  className={`px-3 py-1 rounded-lg font-display font-extrabold text-xl leading-none shadow-sm ${
                    bWon
                      ? "bg-white text-emerald-950"
                      : "bg-slate-800/80 text-slate-300 border border-white/10"
                  }`}
                >
                  {hasScore ? scoreB : bWon ? "W" : "L"}
                </div>
              </div>
              <div
                className={`w-full grid ${
                  isDoublesB ? "grid-cols-2" : "grid-cols-1"
                } gap-2 place-items-center`}
              >
                {sideBNames.map((name, idx) => (
                  <StaticPlayerToken key={`${name}-${idx}`} name={name} won={bWon} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Left-vs-Right Completed Court on sm+ */}
      <div className="hidden sm:block relative w-full rounded-xl overflow-hidden border border-emerald-950/20 bg-gradient-to-br from-[#064e3b] via-[#057a55] to-[#046c4e] shadow-[0_8px_22px_-12px_rgba(6,78,59,0.45)]">
        <div className="absolute inset-0 grid grid-cols-2 pointer-events-none">
          <div
            className={
              aWon
                ? "bg-gradient-to-r from-emerald-400/10 to-teal-300/10"
                : "bg-slate-900/65 backdrop-saturate-[0.15]"
            }
          />
          <div
            className={
              bWon
                ? "bg-gradient-to-l from-emerald-400/10 to-teal-300/10"
                : "bg-slate-900/65 backdrop-saturate-[0.15]"
            }
          />
        </div>

        <div className="relative p-3.5">
          <CourtMarkingsSvg orientation="horizontal" />

          <div className="relative z-10 grid grid-cols-2 min-h-[152px]">
            <div className="relative flex items-center pr-16 pl-4">
              <div
                className={`w-full flex flex-col ${
                  isDoublesA ? "gap-4" : "justify-center"
                } items-center`}
              >
                {sideANames.map((name, idx) => (
                  <StaticPlayerToken key={`${name}-${idx}`} name={name} won={aWon} />
                ))}
              </div>

              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                {aWon && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-300/95 text-amber-950 text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>Win</span>
                  </span>
                )}
                <div
                  className={`px-2.5 py-1 rounded-lg font-display font-extrabold text-2xl tracking-[-0.03em] leading-none shadow-sm ${
                    aWon
                      ? "bg-white text-emerald-950"
                      : "bg-slate-800/75 text-slate-300 border border-white/10"
                  }`}
                >
                  {hasScore ? scoreA : aWon ? "W" : "L"}
                </div>
              </div>
            </div>

            <div className="relative flex items-center pl-16 pr-4">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                {bWon && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-300/95 text-amber-950 text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>Win</span>
                  </span>
                )}
                <div
                  className={`px-2.5 py-1 rounded-lg font-display font-extrabold text-2xl tracking-[-0.03em] leading-none shadow-sm ${
                    bWon
                      ? "bg-white text-emerald-950"
                      : "bg-slate-800/75 text-slate-300 border border-white/10"
                  }`}
                >
                  {hasScore ? scoreB : bWon ? "W" : "L"}
                </div>
              </div>

              <div
                className={`w-full flex flex-col ${
                  isDoublesB ? "gap-4" : "justify-center"
                } items-center`}
              >
                {sideBNames.map((name, idx) => (
                  <StaticPlayerToken key={`${name}-${idx}`} name={name} won={bWon} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
