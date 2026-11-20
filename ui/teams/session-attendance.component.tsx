"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Ban, Check } from "lucide-react";
import { sileo } from "sileo";
import {
  setSessionParticipantsBulkAction,
  toggleSessionParticipantAction,
} from "@courtpulse/teams/session.action";

interface AttendanceMember {
  id: string;
  email: string;
  displayName: string;
  isPresent: boolean;
}

export function SessionAttendance({
  teamSlug,
  sessionSlug,
  members,
  canManage,
}: {
  teamSlug: string;
  sessionSlug: string;
  members: AttendanceMember[];
  canManage: boolean;
}) {
  const router = useRouter();
  const presentCount = members.filter((m) => m.isPresent).length;
  const restrictedCount = members.length - presentCount;

  const toggleMutation = useMutation({
    mutationFn: ({ memberId, isSelected }: { memberId: string; isSelected: boolean }) =>
      toggleSessionParticipantAction({
        teamSlug,
        sessionSlug,
        memberId,
        isSelected,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update session pool." });
        return;
      }
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not update session pool." }),
  });

  const bulkMutation = useMutation({
    mutationFn: (isSelected: boolean) =>
      setSessionParticipantsBulkAction({
        teamSlug,
        sessionSlug,
        isSelected,
      }),
    onSuccess: (res, isSelected) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update session pool." });
        return;
      }
      sileo.success({
        title: isSelected
          ? "All players included in session pool"
          : "All players restricted from session pool",
      });
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not update session pool." }),
  });

  const busy = toggleMutation.isPending || bulkMutation.isPending;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-700">
            Session pool &amp; attendance
          </span>
          {canManage && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click any player to restrict them so their name does not appear in the session pool below.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button
                type="button"
                disabled={busy || presentCount === members.length}
                onClick={() => bulkMutation.mutate(true)}
                className="px-2.5 py-1 text-[11px] font-medium border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md cursor-pointer disabled:opacity-45"
              >
                Include all
              </button>
              <button
                type="button"
                disabled={busy || presentCount === 0}
                onClick={() => bulkMutation.mutate(false)}
                className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md cursor-pointer disabled:opacity-45"
              >
                Restrict all
              </button>
            </>
          )}
          <span className="text-xs font-mono-nums font-semibold text-emerald-700 pl-1">
            {presentCount}/{members.length} in pool
            {restrictedCount > 0 ? ` (${restrictedCount} restricted)` : ""}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={!canManage || busy}
            onClick={() =>
              canManage &&
              toggleMutation.mutate({
                memberId: m.id,
                isSelected: !m.isPresent,
              })
            }
            title={
              m.isPresent
                ? "Included in session pool (click to restrict)"
                : "Restricted from session pool (click to include)"
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              m.isPresent
                ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50/60 border-rose-200/80 text-rose-700 line-through"
            } ${canManage ? "cursor-pointer hover:border-emerald-400" : "cursor-default"}`}
          >
            {m.isPresent ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Ban className="w-3 h-3 text-rose-500" />
            )}
            <span>{m.displayName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
