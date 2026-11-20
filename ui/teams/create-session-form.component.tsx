"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Ban, Check } from "lucide-react";
import { sileo } from "sileo";
import { createSessionAction } from "@courtpulse/teams/session.action";

interface MemberOption {
  id: string;
  displayName: string;
}

export function CreateSessionForm({
  teamSlug,
  teamName,
  members = [],
}: {
  teamSlug: string;
  teamName: string;
  members?: MemberOption[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [includedIds, setIncludedIds] = useState<string[]>(() =>
    members.map((m) => m.id)
  );

  const includedSet = new Set(includedIds);

  const toggleMember = (memberId: string) => {
    setIncludedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createSessionAction({
        teamSlug,
        name,
        date,
        includedMemberIds: members.length > 0 ? includedIds : undefined,
      }),
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
    <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 space-y-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.1)]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          New session for {teamName}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pick a date and choose which players are included in the session pool.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="session-name" className="block text-sm font-medium text-slate-700">
            Session title (optional)
          </label>
          <input
            id="session-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Morning matches"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="session-date" className="block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="session-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        {members.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Session pool ({includedIds.length}/{members.length} included)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIncludedIds(members.map((m) => m.id))}
                  className="px-2 py-1 text-[11px] font-medium border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded cursor-pointer"
                >
                  Include all
                </button>
                <button
                  type="button"
                  onClick={() => setIncludedIds([])}
                  className="px-2 py-1 text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded cursor-pointer"
                >
                  Restrict all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const included = includedSet.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      included
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-900"
                        : "bg-rose-50/60 border-rose-200 text-rose-700 line-through"
                    }`}
                  >
                    {included ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Ban className="w-3 h-3 text-rose-500" />
                    )}
                    <span>{m.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
          >
            {createMutation.isPending ? "Creating..." : "Create session"}
          </button>
          <Link
            href={`/team/${teamSlug}`}
            className="px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
