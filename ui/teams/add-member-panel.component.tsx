"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Upload, UserPlus, X } from "lucide-react";
import { sileo } from "sileo";
import {
  addTeamMemberAction,
  bulkAddTeamMembersAction,
} from "@courtpulse/teams/member.action";

export function AddMemberPanel({ teamSlug }: { teamSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const addMutation = useMutation({
    mutationFn: () =>
      addTeamMemberAction({
        teamSlug,
        email,
        displayName: displayName || undefined,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not add player." });
        return;
      }
      sileo.success({ title: "Player added" });
      setEmail("");
      setDisplayName("");
      setOpen(false);
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not add player." }),
  });

  const bulkMutation = useMutation({
    mutationFn: (rows: { email: string; displayName?: string }[]) =>
      bulkAddTeamMembersAction({ teamSlug, rows }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not import players." });
        return;
      }
      sileo.success({
        title: `Added ${res.added} player${res.added === 1 ? "" : "s"}`,
        description: res.skipped > 0 ? `${res.skipped} skipped` : undefined,
      });
      setOpen(false);
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not read player file." }),
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const rows: { email: string; displayName?: string }[] = [];
      for (const line of lines) {
        const parts = line
          .split(/[,\t;]/)
          .map((p) => p.trim().replace(/^"|"$/g, ""));
        const maybeEmail = parts.find((p) => p.includes("@"));
        if (!maybeEmail) continue;
        const maybeName = parts.find((p) => p !== maybeEmail && p.length > 0);
        rows.push({ email: maybeEmail, displayName: maybeName });
      }

      if (rows.length === 0) {
        sileo.error({ title: "No email addresses found in that file." });
        return;
      }

      bulkMutation.mutate(rows);
    },
    [bulkMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        <span>Add player</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white border-l border-slate-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Add players</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate();
              }}
              className="space-y-4"
            >
              <h3 className="text-sm font-semibold text-slate-800">
                Single player
              </h3>
              <div className="space-y-1.5">
                <label htmlFor="member-email" className="block text-xs font-medium text-slate-600">
                  Email address
                </label>
                <input
                  id="member-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="member-name" className="block text-xs font-medium text-slate-600">
                  Display name (optional)
                </label>
                <input
                  id="member-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Name shown on scores"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="w-full py-2.5 px-4 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
              >
                {addMutation.isPending ? "Adding..." : "Add player"}
              </button>
            </form>

            <div className="pt-5 border-t border-slate-200 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Import list from file
              </h3>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-slate-50/70 hover:border-emerald-400"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-5 h-5 mx-auto text-emerald-600 mb-2" />
                <p className="text-sm text-slate-900 font-medium">
                  {bulkMutation.isPending
                    ? "Importing..."
                    : "Drop a CSV or TXT file here"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  One player per line: email, name
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
