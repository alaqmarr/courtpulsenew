"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { sileo } from "sileo";
import { createTeamAction } from "@courtpulse/teams/team.action";

export function CreateTeamForm({
  canCreate,
  hasEligiblePlan,
  teamQuota,
}: {
  canCreate: boolean;
  hasEligiblePlan: boolean;
  teamQuota: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createTeamAction({ name }),
    onSuccess: (res) => {
      if (!res.ok || !res.slug) {
        sileo.error({ title: res.message || "Could not create team." });
        return;
      }
      sileo.success({ title: "Team created" });
      router.push(`/team/${res.slug}`);
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not create team." }),
  });

  return (
    <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 space-y-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.1)]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Create a new team</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set up a team to add players, run sessions, and track standings.
        </p>
      </div>

      {!canCreate ? (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            {!hasEligiblePlan
              ? "Your current plan does not include creating teams."
              : `You have reached your limit of ${teamQuota} team${
                  teamQuota === 1 ? "" : "s"
                }.`}
          </p>
          <Link
            href="/packages"
            className="inline-block px-4 py-2 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm"
          >
            View plans
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="team-name" className="block text-sm font-medium text-slate-700">
              Team name
            </label>
            <input
              id="team-name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday Smashers"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
            >
              {createMutation.isPending ? "Creating..." : "Create team"}
            </button>
            <Link
              href="/"
              className="px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
