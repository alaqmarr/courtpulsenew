"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon } from "lucide-react";
import { sileo } from "sileo";
import { createTournamentAction } from "@courtpulse/tournaments/tournament.action";

export function CreateTournamentForm({
  canCreate,
  hasEligiblePlan,
  tournamentQuota,
}: {
  canCreate: boolean;
  hasEligiblePlan: boolean;
  tournamentQuota: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [minGamesPerPlayer, setMinGamesPerPlayer] = useState("0");
  const [entryFee, setEntryFee] = useState("0");
  const [auctionPurse, setAuctionPurse] = useState("10000");
  const [courts, setCourts] = useState("1");
  const [paymentUpi, setPaymentUpi] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createTournamentAction({
        name,
        minGamesPerPlayer: Number(minGamesPerPlayer || 0),
        entryFee: Number(entryFee || 0),
        auctionPurse: Number(auctionPurse || 10000),
        courts: Number(courts || 1),
        paymentUpi,
        bannerUrl,
      }),
    onSuccess: (res) => {
      if (!res.ok || !res.slug) {
        sileo.error({ title: res.message || "Could not create tournament." });
        return;
      }
      sileo.success({ title: "Tournament created" });
      router.push(`/tournament/${res.slug}`);
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not create tournament." }),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      sileo.error({ title: "Choose an image smaller than 1.5 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBannerUrl(reader.result);
        sileo.success({ title: "Banner image attached" });
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
  });

  return (
    <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 space-y-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.1)]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Create a new tournament</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set up teams, auction budgets, entry fees, and match results in one place.
        </p>
      </div>

      {!canCreate ? (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            {!hasEligiblePlan
              ? "Your current plan does not include hosting tournaments."
              : `You have reached your limit of ${tournamentQuota} tournament${
                  tournamentQuota === 1 ? "" : "s"
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
            <label htmlFor="tournament-name" className="block text-sm font-medium text-slate-700">
              Tournament name
            </label>
            <input
              id="tournament-name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Winter Club Cup"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="min-games" className="block text-xs font-medium text-slate-600">
                Min games per player
              </label>
              <input
                id="min-games"
                type="number"
                min={0}
                max={50}
                value={minGamesPerPlayer}
                onChange={(e) => setMinGamesPerPlayer(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="entry-fee" className="block text-xs font-medium text-slate-600">
                Entry fee (Rs.)
              </label>
              <input
                id="entry-fee"
                type="number"
                min={0}
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="courts-count" className="block text-xs font-medium text-slate-600">
                Courts
              </label>
              <input
                id="courts-count"
                type="number"
                min={1}
                value={courts}
                onChange={(e) => setCourts(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="auction-purse" className="block text-xs font-medium text-slate-600">
                Team auction purse
              </label>
              <input
                id="auction-purse"
                type="number"
                min={0}
                value={auctionPurse}
                onChange={(e) => setAuctionPurse(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="payment-upi" className="block text-xs font-medium text-slate-600">
                UPI ID (optional)
              </label>
              <input
                id="payment-upi"
                type="text"
                value={paymentUpi}
                onChange={(e) => setPaymentUpi(e.target.value)}
                placeholder="club@okhdfcbank"
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Banner image (optional)
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-slate-50/70 hover:border-emerald-400"
              }`}
            >
              <input {...getInputProps()} />
              <ImageIcon className="w-5 h-5 mx-auto text-emerald-600 mb-1.5" />
              <p className="text-sm text-slate-800">
                Drop a banner image here, or click to select
              </p>
            </div>
            <input
              type="text"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="Or paste an image link"
              className="w-full px-3.5 py-2 text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
            >
              {createMutation.isPending ? "Creating..." : "Create tournament"}
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
