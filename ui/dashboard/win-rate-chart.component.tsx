"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UserTeamSummary } from "@courtpulse/helpers/stats.helpers";

export function WinRateChart({ stats }: { stats: UserTeamSummary[] }) {
  if (stats.length === 0) {
    return (
      <div className="py-10 text-sm text-slate-500 text-center">
        No recorded matches yet.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stats} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="teamName" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{
              backgroundColor: "#ffffff",
              borderColor: "#e2e8f0",
              borderRadius: "10px",
              color: "#0f172a",
              fontSize: "13px",
              boxShadow: "0 8px 20px -8px rgba(15,23,42,0.12)",
            }}
          />
          <Bar dataKey="wins" name="Wins" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="losses" name="Losses" fill="#e11d48" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
