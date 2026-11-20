import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import {
  buildSessionPairingSummary,
  canonicalPairKey,
} from "@courtpulse/helpers/pairing.helpers";
import { getSessionDetail } from "@courtpulse/teams/session.queries";
import { GameCreator } from "@courtpulse/ui/teams/game-creator.component";
import { GamesList } from "@courtpulse/ui/teams/games-list.component";
import { SessionAttendance } from "@courtpulse/ui/teams/session-attendance.component";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ slug: string; sessionSlug: string }>;
}) {
  const user = await requireUser();
  const { slug, sessionSlug } = await params;

  const data = await getSessionDetail(slug, sessionSlug);
  if (!data) notFound();

  const isOwner = data.team.ownerId === user.id;

  const pairingSummary = buildSessionPairingSummary(data.members, data.games);
  for (const stat of data.storedPlayerStats) {
    const key = stat.player.toLowerCase();
    pairingSummary.playCountByEmail[key] = Math.max(
      pairingSummary.playCountByEmail[key] ?? 0,
      stat.plays
    );
  }
  for (const p of data.pairHistory) {
    const key = canonicalPairKey(p.playerA, p.playerB);
    pairingSummary.pairPlayCounts[key] = Math.max(
      pairingSummary.pairPlayCounts[key] ?? 0,
      1
    );
  }

  const completedCount = data.games.filter((g) => Boolean(g.winner)).length;
  const activeCount = data.games.length - completedCount;
  const presentCount = data.members.filter((m) => m.isPresent).length;
  const sessionLeader = data.sessionStandings.find((p) => p.games > 0) || null;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/team/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{data.team.name}</span>
          </Link>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900">
            {data.session.name || "Match session"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {formatDateIST(data.session.date)}
          </p>
        </div>
      </div>

      <section className="w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl overflow-hidden shadow-[0_12px_32px_-12px_rgba(6,78,59,0.4)]">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/15">
          <div className="p-3.5 sm:p-5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Matches
            </div>
            <div className="font-display text-lg sm:text-2xl font-bold tracking-[-0.02em] text-white mt-1">
              {completedCount} done{activeCount > 0 ? `, ${activeCount} live` : ""}
            </div>
          </div>
          <div className="p-3.5 sm:p-5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              In session pool
            </div>
            <div className="font-display text-lg sm:text-2xl font-bold tracking-[-0.02em] text-white mt-1">
              {presentCount}/{data.members.length}
            </div>
          </div>
          <div className="p-3.5 sm:p-5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Session leader
            </div>
            <div className="font-display text-base sm:text-lg font-bold text-emerald-100 mt-1.5 truncate">
              {sessionLeader
                ? `${sessionLeader.name} (${sessionLeader.wins}W)`
                : "None yet"}
            </div>
          </div>
          <div className="p-3.5 sm:p-5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Best point diff
            </div>
            <div className="font-display text-lg sm:text-2xl font-bold tracking-[-0.02em] text-white mt-1 truncate">
              {sessionLeader
                ? `${sessionLeader.pointDiff > 0 ? `+${sessionLeader.pointDiff}` : sessionLeader.pointDiff}`
                : "0"}
            </div>
          </div>
        </div>
      </section>

      <SessionAttendance
        teamSlug={slug}
        sessionSlug={sessionSlug}
        members={data.members}
        canManage={isOwner}
      />

      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-6">
          {isOwner && (
            <GameCreator
              teamSlug={slug}
              sessionSlug={sessionSlug}
              members={data.members}
              playCountByEmail={pairingSummary.playCountByEmail}
              pairPlayCounts={pairingSummary.pairPlayCounts}
              singlesMatchupCounts={pairingSummary.singlesMatchupCounts}
              matchupPlayCounts={pairingSummary.matchupPlayCounts}
              lastGamePlayerEmails={pairingSummary.lastGamePlayerEmails}
            />
          )}

          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Session leaderboard
              </h2>
              <span className="text-[11px] font-mono-nums text-slate-500">
                Live today
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2.5 sm:px-3 font-semibold">#</th>
                    <th className="py-2.5 px-2 sm:px-3 font-semibold">Player</th>
                    <th className="py-2.5 px-2 sm:px-3 font-semibold">
                      <span className="sm:hidden">G</span>
                      <span className="hidden sm:inline">Games</span>
                    </th>
                    <th className="py-2.5 px-2 sm:px-3 font-semibold">W-L</th>
                    <th className="py-2.5 px-2 sm:px-3 font-semibold">PF</th>
                    <th className="py-2.5 px-2 sm:px-3 font-semibold">PA</th>
                    <th className="py-2.5 px-2.5 sm:px-3 font-semibold text-right">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-nums">
                  {data.sessionStandings
                    .filter((p) => p.games > 0)
                    .map((p, idx) => (
                      <tr
                        key={p.key}
                        className={
                          idx === 0
                            ? "bg-amber-50/45 hover:bg-amber-50/70"
                            : "hover:bg-emerald-50/30"
                        }
                      >
                        <td className="py-2.5 px-2.5 sm:px-3">
                          <span
                            className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${
                              idx === 0
                                ? "bg-amber-400 text-amber-950"
                                : idx === 1
                                ? "bg-slate-200 text-slate-800"
                                : idx === 2
                                ? "bg-orange-200 text-orange-950"
                                : "text-slate-400"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 font-display font-bold text-xs sm:text-[13px] text-slate-900 whitespace-nowrap">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 font-semibold text-slate-800">
                          {p.games}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 whitespace-nowrap">
                          <span className="font-bold text-emerald-700">{p.wins}</span>
                          <span className="text-slate-400">-</span>
                          <span className="font-semibold text-rose-600">{p.losses}</span>
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-slate-700">{p.pointsFor}</td>
                        <td className="py-2.5 px-2 sm:px-3 text-slate-500">{p.pointsAgainst}</td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded font-bold ${
                              p.pointDiff > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : p.pointDiff < 0
                                ? "bg-rose-50 text-rose-600"
                                : "text-slate-400"
                            }`}
                          >
                            {p.pointDiff > 0 ? `+${p.pointDiff}` : p.pointDiff}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7">
          <GamesList
            games={data.games}
            teamSlug={slug}
            sessionSlug={sessionSlug}
            canManage={isOwner}
            labelMap={data.labelMap}
          />
        </div>
      </div>
    </div>
  );
}
