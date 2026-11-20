"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import { sileo } from "sileo";
import {
  removeTeamMemberAction,
  toggleTeamMemberActiveAction,
  updateTeamMemberDisplayNameAction,
} from "@courtpulse/teams/member.action";
import { getMemberDisplayName } from "@courtpulse/helpers/stats.helpers";

interface TeamMemberItem {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive?: boolean;
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
  } | null;
}

export function MemberList({
  members,
  teamSlug,
  isOwner,
}: {
  members: TeamMemberItem[];
  teamSlug: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeTeamMemberAction({ teamSlug, memberId }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not remove player." });
        return;
      }
      sileo.success({ title: "Player removed" });
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not remove player." }),
  });

  const renameMutation = useMutation({
    mutationFn: (payload: { memberId: string; displayName: string }) =>
      updateTeamMemberDisplayNameAction({
        teamSlug,
        memberId: payload.memberId,
        displayName: payload.displayName,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update display name." });
        return;
      }
      sileo.success({ title: "Display name updated" });
      setEditingId(null);
      setDraftName("");
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not update display name." }),
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { memberId: string; isActive: boolean }) =>
      toggleTeamMemberActiveAction({
        teamSlug,
        memberId: payload.memberId,
        isActive: payload.isActive,
      }),
    onSuccess: (res, vars) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update player status." });
        return;
      }
      sileo.success({
        title: vars.isActive ? "Player marked active" : "Player marked inactive",
      });
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not update player status." }),
  });

  const startEdit = (member: TeamMemberItem) => {
    setEditingId(member.id);
    setDraftName(getMemberDisplayName(member));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
  };

  const saveEdit = (memberId: string) => {
    const clean = draftName.trim();
    if (!clean) {
      sileo.error({ title: "Enter a display name." });
      return;
    }
    renameMutation.mutate({ memberId, displayName: clean });
  };

  if (members.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
        No players added yet.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <table className="w-full text-sm border-collapse text-left">
        <thead className="bg-gradient-to-r from-slate-50 via-emerald-50/40 to-teal-50/30 border-b border-slate-200 text-slate-600">
          <tr>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Player</th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Email</th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Role</th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Status</th>
            {isOwner && (
              <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => {
            const label = getMemberDisplayName(member);
            const isActive = member.isActive !== false;
            const isEditing = editingId === member.id;
            const initials = label
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("");

            return (
              <tr
                key={member.id}
                className={`transition-colors ${
                  isActive
                    ? "hover:bg-emerald-50/35"
                    : "bg-slate-50/70 opacity-75 hover:bg-slate-100/70"
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isActive
                          ? "bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-200 text-emerald-900"
                          : "bg-slate-200 border-slate-300 text-slate-600"
                      }`}
                    >
                      {initials || "P"}
                    </span>
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveEdit(member.id);
                        }}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-1.5"
                      >
                        <input
                          type="text"
                          autoFocus
                          maxLength={60}
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEdit();
                          }}
                          placeholder="Display name"
                          className="px-2.5 py-1.5 sm:py-1 text-sm bg-white text-slate-900 border border-emerald-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-200 w-36 sm:w-56"
                        />
                        <button
                          type="submit"
                          disabled={renameMutation.isPending}
                          aria-label="Save display name"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          aria-label="Cancel"
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <span className="font-semibold text-slate-900">{label}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-500">{member.email}</td>
                <td className="py-3 px-4 text-slate-600 capitalize">
                  {member.role.toLowerCase()}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                {isOwner && (
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            disabled={activeMutation.isPending}
                            onClick={() =>
                              activeMutation.mutate({
                                memberId: member.id,
                                isActive: !isActive,
                              })
                            }
                            className={`px-2.5 py-1 text-xs font-medium border rounded-md cursor-pointer disabled:opacity-50 ${
                              isActive
                                ? "text-slate-700 border-slate-200 bg-slate-50 hover:bg-slate-100"
                                : "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                          >
                            {isActive ? "Mark inactive" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit name</span>
                          </button>
                        </>
                      )}
                      {member.role !== "OWNER" && (
                        <button
                          type="button"
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(member.id)}
                          className="px-3 py-1 text-xs font-medium text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
