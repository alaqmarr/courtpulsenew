"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Check, Pencil, Shield, X } from "lucide-react";
import { sileo } from "sileo";
import {
  removeTeamMemberAction,
  toggleTeamMemberActiveAction,
  updateTeamMemberDisplayNameAction,
  updateTeamMemberPermissionsAction,
} from "@courtpulse/teams/member.action";
import { getMemberDisplayName } from "@courtpulse/helpers/stats.helpers";

interface TeamMemberItem {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive?: boolean;
  canCreateSessions?: boolean;
  canCreateGames?: boolean;
  canScoreGames?: boolean;
  canManagePlayers?: boolean;
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
  } | null;
}

interface PermDraft {
  isManager: boolean;
  canCreateSessions: boolean;
  canCreateGames: boolean;
  canScoreGames: boolean;
  canManagePlayers: boolean;
}

export function MemberList({
  members,
  teamSlug,
  isOwner,
  canManagePlayers,
  canManagePermissions,
}: {
  members: TeamMemberItem[];
  teamSlug: string;
  isOwner: boolean;
  canManagePlayers?: boolean;
  canManagePermissions?: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [permMemberId, setPermMemberId] = useState<string | null>(null);
  const [permDraft, setPermDraft] = useState<PermDraft>({
    isManager: false,
    canCreateSessions: false,
    canCreateGames: false,
    canScoreGames: false,
    canManagePlayers: false,
  });

  const allowManagePlayers = canManagePlayers ?? isOwner;
  const allowManagePermissions = canManagePermissions ?? isOwner;

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

  const permsMutation = useMutation({
    mutationFn: (payload: { memberId: string; draft: PermDraft }) =>
      updateTeamMemberPermissionsAction({
        teamSlug,
        memberId: payload.memberId,
        role: payload.draft.isManager ? "MANAGER" : "MEMBER",
        canCreateSessions: payload.draft.canCreateSessions,
        canCreateGames: payload.draft.canCreateGames,
        canScoreGames: payload.draft.canScoreGames,
        canManagePlayers: payload.draft.canManagePlayers,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update permissions." });
        return;
      }
      sileo.success({ title: "Player permissions saved" });
      setPermMemberId(null);
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not update permissions." }),
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

  const openPermEditor = (member: TeamMemberItem) => {
    if (permMemberId === member.id) {
      setPermMemberId(null);
      return;
    }
    const isMgr = member.role === "MANAGER";
    setPermMemberId(member.id);
    setPermDraft({
      isManager: isMgr,
      canCreateSessions: isMgr || Boolean(member.canCreateSessions),
      canCreateGames: isMgr || Boolean(member.canCreateGames),
      canScoreGames: isMgr || Boolean(member.canScoreGames),
      canManagePlayers: isMgr || Boolean(member.canManagePlayers),
    });
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
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">
              Role &amp; Access
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Status</th>
            {(allowManagePlayers || allowManagePermissions || isOwner) && (
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
            const isEditingPerms = permMemberId === member.id;
            const initials = label
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("");

            const accessPills: string[] = [];
            if (member.role === "OWNER") {
              accessPills.push("Full access");
            } else if (member.role === "MANAGER") {
              accessPills.push("Co-Admin (All)");
            } else {
              if (member.canCreateSessions) accessPills.push("Sessions");
              if (member.canCreateGames) accessPills.push("Create games");
              if (member.canScoreGames) accessPills.push("Score & finish");
              if (member.canManagePlayers) accessPills.push("Players");
            }

            return (
              <tr
                key={member.id}
                className={`transition-colors ${
                  isActive
                    ? "hover:bg-emerald-50/35"
                    : "bg-slate-50/70 opacity-75 hover:bg-slate-100/70"
                }`}
              >
                <td className="py-3 px-4 align-top">
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
                <td className="py-3 px-4 text-slate-500 align-top">{member.email}</td>
                <td className="py-3 px-4 align-top">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700 capitalize">
                        {member.role.toLowerCase()}
                      </span>
                      {accessPills.map((pill) => (
                        <span
                          key={pill}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>

                    {isEditingPerms && member.role !== "OWNER" && (
                      <div className="cp-fade-up mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 min-w-[260px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                            Session &amp; Team Permissions
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPermDraft((prev) => {
                                const nextMgr = !prev.isManager;
                                return {
                                  isManager: nextMgr,
                                  canCreateSessions: nextMgr,
                                  canCreateGames: nextMgr,
                                  canScoreGames: nextMgr,
                                  canManagePlayers: nextMgr,
                                };
                              })
                            }
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border cursor-pointer ${
                              permDraft.isManager
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            {permDraft.isManager ? "Co-Admin Enabled" : "Make Co-Admin (All)"}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {(
                            [
                              { key: "canCreateSessions", label: "Create sessions" },
                              { key: "canCreateGames", label: "Create games" },
                              { key: "canScoreGames", label: "Score & finish" },
                              { key: "canManagePlayers", label: "Manage players" },
                            ] as { key: keyof Omit<PermDraft, "isManager">; label: string }[]
                          ).map((item) => (
                            <label
                              key={item.key}
                              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={permDraft[item.key]}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPermDraft((prev) => ({
                                    ...prev,
                                    isManager: checked ? prev.isManager : false,
                                    [item.key]: checked,
                                  }));
                                }}
                                className="rounded border-slate-300 text-emerald-600"
                              />
                              <span className="text-[11px] font-medium">{item.label}</span>
                            </label>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            disabled={permsMutation.isPending}
                            onClick={() =>
                              permsMutation.mutate({
                                memberId: member.id,
                                draft: permDraft,
                              })
                            }
                            className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            {permsMutation.isPending ? "Saving..." : "Save access"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermMemberId(null)}
                            className="px-2.5 py-1 text-xs border border-slate-200 bg-white text-slate-600 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 align-top">
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
                {(allowManagePlayers || allowManagePermissions || isOwner) && (
                  <td className="py-3 px-4 text-right align-top">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      {allowManagePermissions && member.role !== "OWNER" && (
                        <button
                          type="button"
                          onClick={() => openPermEditor(member)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border rounded-md cursor-pointer ${
                            isEditingPerms
                              ? "bg-slate-900 text-white border-slate-900"
                              : "text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>Permissions</span>
                        </button>
                      )}
                      {allowManagePlayers && !isEditing && (
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
                      {isOwner && member.role !== "OWNER" && (
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
