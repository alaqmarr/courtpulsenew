"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Award, Check, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sileo } from "sileo";
import { formatDateIST } from "@courtpulse/helpers/date.helpers";
import { updateProfileAction } from "@courtpulse/profile/profile.action";
import type { AchievementProgress } from "@courtpulse/profile/profile.queries";
import { WinRing } from "@courtpulse/ui/primitives/win-ring.component";

export function ProfileView({
  user,
  stats,
  achievements,
  eloHistory = [],
}: {
  user: {
    email: string;
    name: string | null;
    displayName: string | null;
    bio: string | null;
    eloRating: number;
  };
  stats: {
    totalPlayed: number;
    totalWins: number;
    totalLosses: number;
    bestStreak: number;
    winRate: number;
    uniqueTeammates: number;
  };
  achievements: AchievementProgress[];
  eloHistory?: {
    id: string;
    rating: number;
    change: number;
    timestamp: Date | string;
  }[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    user.displayName || user.name || user.email.split("@")[0]
  );
  const [bio, setBio] = useState(user.bio || "");

  const saveMutation = useMutation({
    mutationFn: () => updateProfileAction({ displayName, bio }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not save profile." });
        return;
      }
      sileo.success({ title: "Profile updated" });
      router.refresh();
    },
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const eloChartData = useMemo(
    () =>
      [...eloHistory]
        .reverse()
        .map((item) => ({
          label: formatDateIST(item.timestamp, "MMM dd"),
          rating: item.rating,
          change: item.change,
        })),
    [eloHistory]
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900">
          Player profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">{user.email}</p>
      </div>

      <section className="w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_-12px_rgba(6,78,59,0.4)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <WinRing
            percent={stats.winRate}
            size={68}
            strokeWidth={5}
            label="win"
            tone="on-gradient"
          />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Skill rating (ELO)
            </div>
            <div className="font-display text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-emerald-100">
              {user.eloRating}
            </div>
            <div className="text-xs text-emerald-100/85 font-mono-nums mt-0.5">
              {stats.totalWins}W / {stats.totalLosses}L · Best streak {stats.bestStreak}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Matches
            </div>
            <div className="font-display text-2xl font-bold tracking-[-0.03em] text-white mt-0.5">
              {stats.totalPlayed}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Teammates
            </div>
            <div className="font-display text-2xl font-bold tracking-[-0.03em] text-white mt-0.5">
              {stats.uniqueTeammates}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-100/80">
              Milestones
            </div>
            <div className="font-display text-2xl font-bold tracking-[-0.03em] text-white mt-0.5">
              {unlockedCount}/{achievements.length}
            </div>
          </div>
        </div>
      </section>

      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="xl:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        >
          <h2 className="text-sm font-bold text-slate-900">Edit details</h2>

          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="block text-xs font-medium text-slate-600">
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              minLength={2}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-bio" className="block text-xs font-medium text-slate-600">
              Bio
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Right-handed doubles player..."
              className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm cursor-pointer"
          >
            {saveMutation.isPending ? "Saving..." : "Save profile"}
          </button>
        </form>

        <div className="xl:col-span-8 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Milestones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {achievements.map((a) => {
              const pct = a.target > 0 ? Math.round((a.current / a.target) * 100) : 0;
              return (
                <div
                  key={a.id}
                  className={`rounded-xl p-4 border space-y-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${
                    a.unlocked
                      ? "bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 border-emerald-300"
                      : "bg-white border-slate-200/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {a.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {a.description}
                      </div>
                    </div>
                    {a.unlocked ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Award className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-nums text-slate-500">
                      <span>{a.tier.toLowerCase()}</span>
                      <span>
                        {a.current}/{a.target}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {eloChartData.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] mt-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>ELO rating trend</span>
                </h2>
                <span className="text-xs font-mono-nums text-slate-500">
                  Last {eloChartData.length} updates
                </span>
              </div>
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={eloChartData}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="cpEloGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "10px",
                        color: "#0f172a",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rating"
                      name="ELO Rating"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#cpEloGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
