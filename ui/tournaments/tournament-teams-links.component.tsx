"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Check,
  Copy,
  KeyRound,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import { sileo } from "sileo";
import {
  addTournamentCoAdminAction,
  addTournamentTeamAction,
  removeTournamentCoAdminAction,
  removeTournamentTeamAction,
  rotateAdminTokenAction,
  updateTournamentTeamAction,
} from "@courtpulse/tournaments/tournament.action";

export interface TeamHubItem {
  id: string;
  teamId: string | null;
  teamName: string;
  color: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerToken: string | null;
  purseBudget: number;
  purseSpent: number;
  purseRemaining: number;
  squadCount: number;
}

export function TournamentTeamsLinks({
  tournamentSlug,
  adminToken,
  isOwner,
  isAdmin,
  defaultPurse,
  teams,
  availableClubTeams,
  members,
}: {
  tournamentSlug: string;
  adminToken?: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  defaultPurse: number;
  teams: TeamHubItem[];
  availableClubTeams: { id: string; name: string }[];
  members: {
    id: string;
    userId: string;
    role: string;
    name: string | null;
    email: string | null;
  }[];
}) {
  const router = useRouter();
  const [teamMode, setTeamMode] = useState<"CUSTOM" | "CLUB">("CUSTOM");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#059669");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [purseOverride, setPurseOverride] = useState("");
  const [selectedClubId, setSelectedClubId] = useState(
    availableClubTeams[0]?.id || ""
  );

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    color: string;
    ownerName: string;
    ownerEmail: string;
    purseBudget: string;
  }>({ name: "", color: "#059669", ownerName: "", ownerEmail: "", purseBudget: "" });

  const [coAdminEmail, setCoAdminEmail] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyRelativeUrl = (path: string, key: string) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}${path}`);
    setCopiedKey(key);
    sileo.success({ title: "Link copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const addTeamMutation = useMutation({
    mutationFn: () =>
      addTournamentTeamAction({
        tournamentSlug,
        adminToken,
        ...(teamMode === "CUSTOM"
          ? { name }
          : { teamId: selectedClubId, name: name || undefined }),
        color,
        ownerName: ownerName || undefined,
        ownerEmail: ownerEmail || undefined,
        purseBudget: purseOverride ? Number(purseOverride) : null,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not add team." });
        return;
      }
      sileo.success({ title: "Team created with owner link" });
      setName("");
      setOwnerName("");
      setOwnerEmail("");
      setPurseOverride("");
      router.refresh();
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: (payload: {
      teamId: string;
      regenerateToken?: boolean;
    }) =>
      updateTournamentTeamAction({
        tournamentSlug,
        adminToken,
        teamId: payload.teamId,
        name: editDraft.name,
        color: editDraft.color,
        ownerName: editDraft.ownerName || null,
        ownerEmail: editDraft.ownerEmail || null,
        purseBudget: editDraft.purseBudget
          ? Number(editDraft.purseBudget)
          : null,
        regenerateToken: payload.regenerateToken,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update team." });
        return;
      }
      sileo.success({ title: "Team updated" });
      setEditingTeamId(null);
      router.refresh();
    },
  });

  const removeTeamMutation = useMutation({
    mutationFn: (teamId: string) =>
      removeTournamentTeamAction({ tournamentSlug, adminToken, teamId }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not remove team." });
        return;
      }
      sileo.success({ title: "Team removed" });
      router.refresh();
    },
  });

  const addCoAdminMutation = useMutation({
    mutationFn: () =>
      addTournamentCoAdminAction({ tournamentSlug, email: coAdminEmail }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not add co-admin." });
        return;
      }
      sileo.success({ title: "Co-admin added" });
      setCoAdminEmail("");
      router.refresh();
    },
  });

  const removeCoAdminMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeTournamentCoAdminAction({ tournamentSlug, memberId }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not remove co-admin." });
        return;
      }
      sileo.success({ title: "Co-admin removed" });
      router.refresh();
    },
  });

  const rotateAdminMutation = useMutation({
    mutationFn: () => rotateAdminTokenAction({ tournamentSlug }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not rotate link." });
        return;
      }
      sileo.success({ title: "Co-admin link regenerated" });
      router.refresh();
    },
  });

  return (
    <div className="space-y-6 cp-fade-up">
      {/* Dedicated Shareable Links */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Role &amp; public share links
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            {
              key: "overview",
              label: "Public Tournament Hub",
              desc: "Standings, fixtures, fair play & scores",
              path: `/tournament/${tournamentSlug}`,
            },
            {
              key: "register",
              label: "Player Registration Link",
              desc: "Share with players for fee & UPI signup",
              path: `/tournament/${tournamentSlug}/register`,
            },
            {
              key: "auction",
              label: "Public Live Auction Stage",
              desc: "Broadcast screen & spectator catch-up",
              path: `/tournament/${tournamentSlug}/auction`,
            },
            ...(isAdmin && adminToken
              ? [
                  {
                    key: "coadmin",
                    label: "Admin / Co-Admin Console",
                    desc: "Full organizer scoring, auction & verification access",
                    path: `/tournament/${tournamentSlug}?adminToken=${adminToken}`,
                  },
                ]
              : []),
          ].map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">{item.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => copyRelativeUrl(item.path, item.key)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 rounded-lg shadow-2xs cursor-pointer"
              >
                {copiedKey === item.key ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{copiedKey === item.key ? "Copied" : "Copy link"}</span>
              </button>
            </div>
          ))}
        </div>

        {isOwner && adminToken && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Co-admin key: <code className="font-mono-nums text-slate-800">{adminToken}</code>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  copyRelativeUrl(
                    `/tournament/${tournamentSlug}/auction?adminToken=${adminToken}`,
                    "admin-auction"
                  )
                }
                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer"
              >
                Copy Auctioneer link
              </button>
              <button
                type="button"
                disabled={rotateAdminMutation.isPending}
                onClick={() => rotateAdminMutation.mutate()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset admin key</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Team & Co-Admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTeamMutation.mutate();
            }}
            className="xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Create / add franchise team
              </h3>
              {availableClubTeams.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setTeamMode((m) => (m === "CUSTOM" ? "CLUB" : "CUSTOM"))
                  }
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  {teamMode === "CUSTOM" ? "Link existing club team" : "Create custom franchise"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white cursor-pointer"
                />
              </div>
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {teamMode === "CUSTOM" ? "Team name" : "Club team"}
                </label>
                {teamMode === "CUSTOM" ? (
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Smashers United"
                    className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                  />
                ) : (
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                  >
                    {availableClubTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Purse (default {defaultPurse})
                </label>
                <input
                  type="number"
                  min={0}
                  value={purseOverride}
                  onChange={(e) => setPurseOverride(e.target.value)}
                  placeholder={String(defaultPurse)}
                  className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Team owner name (optional)
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Franchise owner name"
                  className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Team owner email (optional)
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={addTeamMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add tournament team</span>
            </button>
          </form>

          {isOwner && (
            <div className="xl:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Co-admins &amp; organizers
                </h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCoAdminMutation.mutate();
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={coAdminEmail}
                  onChange={(e) => setCoAdminEmail(e.target.value)}
                  placeholder="User email on CourtPulse"
                  className="flex-1 px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={addCoAdminMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              {members.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No additional co-admin accounts added. You can also share the Co-Admin Console link above.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {m.name || m.email}
                        </div>
                        <div className="text-slate-500 truncate">{m.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCoAdminMutation.mutate(m.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remove co-admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Teams Roster & Owner Portal Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map((tm) => {
          const isEditing = editingTeamId === tm.id;
          return (
            <div
              key={tm.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
              style={{ borderTop: `4px solid ${tm.color || "#059669"}` }}
            >
              {isEditing ? (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editDraft.color}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, color: e.target.value }))
                      }
                      className="h-8 w-10 rounded border border-slate-200"
                    />
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, name: e.target.value }))
                      }
                      className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <input
                    type="text"
                    value={editDraft.ownerName}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d, ownerName: e.target.value }))
                    }
                    placeholder="Owner name"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <input
                    type="email"
                    value={editDraft.ownerEmail}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d, ownerEmail: e.target.value }))
                    }
                    placeholder="Owner email"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    value={editDraft.purseBudget}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d, purseBudget: e.target.value }))
                    }
                    placeholder={`Purse (${defaultPurse})`}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateTeamMutation.mutate({ teamId: tm.id })}
                      className="flex-1 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTeamId(null)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-display text-base font-bold text-slate-900 truncate">
                        {tm.teamName}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {tm.ownerName
                          ? `Owner: ${tm.ownerName}`
                          : "No owner assigned"}
                        {tm.ownerEmail ? ` (${tm.ownerEmail})` : ""}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeamId(tm.id);
                            setEditDraft({
                              name: tm.teamName,
                              color: tm.color,
                              ownerName: tm.ownerName || "",
                              ownerEmail: tm.ownerEmail || "",
                              purseBudget: String(tm.purseBudget),
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded cursor-pointer"
                          title="Edit team"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTeamMutation.mutate(tm.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-xl p-2.5 text-xs font-mono-nums">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Squad</div>
                      <div className="font-bold text-slate-900">{tm.squadCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Spent</div>
                      <div className="font-bold text-slate-900">{tm.purseSpent}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Left</div>
                      <div className="font-bold text-emerald-700">{tm.purseRemaining}</div>
                    </div>
                  </div>

                  {tm.ownerToken && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyRelativeUrl(
                            `/tournament/${tournamentSlug}/auction?ownerToken=${tm.ownerToken}`,
                            `owner-${tm.id}`
                          )
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {copiedKey === `owner-${tm.id}`
                            ? "Owner link copied"
                            : "Copy Owner Bidding Link"}
                        </span>
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditDraft({
                              name: tm.teamName,
                              color: tm.color,
                              ownerName: tm.ownerName || "",
                              ownerEmail: tm.ownerEmail || "",
                              purseBudget: String(tm.purseBudget),
                            });
                            updateTeamMutation.mutate({
                              teamId: tm.id,
                              regenerateToken: true,
                            });
                          }}
                          title="Rotate owner token"
                          className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
