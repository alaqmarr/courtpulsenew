"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { sileo } from "sileo";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import { createSessionAction } from "@courtpulse/teams/session.action";

interface SessionItem {
  id: string;
  slug: string;
  name: string | null;
  date: Date | string;
  games: { id: string; winner: string | null }[];
}

export function SessionsList({
  sessions,
  teamSlug,
  isOwner,
}: {
  sessions: SessionItem[];
  teamSlug: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const createMutation = useMutation({
    mutationFn: () => createSessionAction({ teamSlug, name, date }),
    onSuccess: (res) => {
      if (!res.ok || !res.sessionSlug) {
        sileo.error({ title: res.message || "Could not create session." });
        return;
      }
      sileo.success({ title: "Session created" });
      router.push(`/team/${teamSlug}/session/${res.sessionSlug}`);
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not create session." }),
  });

  return (
    <div className="w-full space-y-4">
      {isOwner && creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end shadow-sm"
        >
          <div className="sm:col-span-5 space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              Session title (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday morning matches"
              className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div className="sm:col-span-4 space-y-1">
            <label className="block text-xs font-medium text-slate-600">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2 px-3 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? "Starting..." : "Start"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="py-2 px-3 text-sm border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isOwner && !creating && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick new session</span>
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          No sessions recorded yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <table className="w-full text-sm border-collapse text-left">
            <thead className="bg-gradient-to-r from-slate-50 via-emerald-50/40 to-teal-50/30 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Session</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Matches</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                  Open
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const completed = session.games.filter((g) => Boolean(g.winner)).length;
                return (
                  <tr key={session.id} className="hover:bg-emerald-50/35 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <Link
                        href={`/team/${teamSlug}/session/${session.slug}`}
                        className="hover:text-emerald-700"
                      >
                        {session.name || "Match session"}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDateIST(session.date)}
                    </td>
                    <td className="py-3 px-4 font-mono-nums text-slate-700">
                      {session.games.length} ({completed} finished)
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/team/${teamSlug}/session/${session.slug}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 rounded-lg transition-colors"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
