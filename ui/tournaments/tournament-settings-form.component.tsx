"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon, QrCode, Save } from "lucide-react";
import { sileo } from "sileo";
import { updateTournamentSettingsAction } from "@courtpulse/tournaments/tournament.action";

function toDateInputValue(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function TournamentSettingsForm({
  tournament,
  adminToken,
}: {
  tournament: {
    name: string;
    slug: string;
    description: string | null;
    rules: string | null;
    bannerUrl: string | null;
    thumbnailUrl: string | null;
    isActive: boolean;
    registrationOpen: boolean;
    minGamesPerPlayer: number;
    courts: number;
    entryFee: number;
    paymentUpi: string | null;
    paymentQrCode: string | null;
    cashContactName: string | null;
    cashContactNumber: string | null;
    contactPhone: string | null;
    auctionPurse: number;
    auctionBasePrice: number;
    auctionBidIncrement: number;
    auctionMinSquadSize: number;
    auctionMaxSquadSize: number;
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    pointsToWin: number;
    fairPlayPenaltyPoints: number;
    useCustomStats: boolean;
    startDate: Date | string | null;
    endDate: Date | string | null;
  };
  adminToken?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(tournament.name);
  const [description, setDescription] = useState(tournament.description || "");
  const [rules, setRules] = useState(tournament.rules || "");
  const [bannerUrl, setBannerUrl] = useState(tournament.bannerUrl || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(tournament.thumbnailUrl || "");
  const [isActive, setIsActive] = useState(tournament.isActive);
  const [registrationOpen, setRegistrationOpen] = useState(
    tournament.registrationOpen
  );
  const [minGamesPerPlayer, setMinGamesPerPlayer] = useState(
    String(tournament.minGamesPerPlayer)
  );
  const [courts, setCourts] = useState(String(tournament.courts));
  const [entryFee, setEntryFee] = useState(String(tournament.entryFee));
  const [paymentUpi, setPaymentUpi] = useState(tournament.paymentUpi || "");
  const [paymentQrCode, setPaymentQrCode] = useState(
    tournament.paymentQrCode || ""
  );
  const [cashContactName, setCashContactName] = useState(
    tournament.cashContactName || ""
  );
  const [cashContactNumber, setCashContactNumber] = useState(
    tournament.cashContactNumber || ""
  );
  const [contactPhone, setContactPhone] = useState(tournament.contactPhone || "");
  const [auctionPurse, setAuctionPurse] = useState(
    String(tournament.auctionPurse)
  );
  const [auctionBasePrice, setAuctionBasePrice] = useState(
    String(tournament.auctionBasePrice)
  );
  const [auctionBidIncrement, setAuctionBidIncrement] = useState(
    String(tournament.auctionBidIncrement)
  );
  const [auctionMinSquadSize, setAuctionMinSquadSize] = useState(
    String(tournament.auctionMinSquadSize)
  );
  const [auctionMaxSquadSize, setAuctionMaxSquadSize] = useState(
    String(tournament.auctionMaxSquadSize)
  );
  const [winPoints, setWinPoints] = useState(String(tournament.winPoints));
  const [drawPoints, setDrawPoints] = useState(String(tournament.drawPoints));
  const [lossPoints, setLossPoints] = useState(String(tournament.lossPoints));
  const [pointsToWin, setPointsToWin] = useState(String(tournament.pointsToWin));
  const [fairPlayPenaltyPoints, setFairPlayPenaltyPoints] = useState(
    String(tournament.fairPlayPenaltyPoints)
  );
  const [useCustomStats, setUseCustomStats] = useState(
    tournament.useCustomStats
  );
  const [startDate, setStartDate] = useState(
    toDateInputValue(tournament.startDate)
  );
  const [endDate, setEndDate] = useState(toDateInputValue(tournament.endDate));

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTournamentSettingsAction({
        tournamentSlug: tournament.slug,
        adminToken,
        name,
        description,
        rules,
        bannerUrl,
        thumbnailUrl,
        isActive,
        registrationOpen,
        minGamesPerPlayer: Number(minGamesPerPlayer || 0),
        courts: Number(courts || 1),
        entryFee: Number(entryFee || 0),
        paymentUpi,
        paymentQrCode,
        cashContactName,
        cashContactNumber,
        contactPhone,
        auctionPurse: Number(auctionPurse || 0),
        auctionBasePrice: Number(auctionBasePrice || 0),
        auctionBidIncrement: Number(auctionBidIncrement || 100),
        auctionMinSquadSize: Number(auctionMinSquadSize || 1),
        auctionMaxSquadSize: Number(auctionMaxSquadSize || 10),
        winPoints: Number(winPoints || 2),
        drawPoints: Number(drawPoints || 1),
        lossPoints: Number(lossPoints || 0),
        pointsToWin: Number(pointsToWin || 21),
        fairPlayPenaltyPoints: Number(fairPlayPenaltyPoints || 1),
        useCustomStats,
        startDate: startDate || null,
        endDate: endDate || null,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not save settings." });
        return;
      }
      sileo.success({ title: "Tournament settings updated" });
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not save settings." }),
  });

  const handleImageDrop = useCallback(
    (setter: (val: string) => void, label: string) => (files: File[]) => {
      const file = files[0];
      if (!file) return;
      if (file.size > 1_500_000) {
        sileo.error({ title: "Choose an image smaller than 1.5 MB." });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setter(reader.result);
          sileo.success({ title: `${label} updated` });
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const bannerDrop = useDropzone({
    onDrop: handleImageDrop(setBannerUrl, "Banner image"),
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  const qrDrop = useDropzone({
    onDrop: handleImageDrop(setPaymentQrCode, "Payment QR code"),
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="space-y-6 cp-fade-up"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Tournament settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Update rules, auction limits, courts, UPI payment details, and Fair Play targets anytime.
          </p>
        </div>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{saveMutation.isPending ? "Saving..." : "Save all settings"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* General & Schedule */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            General, venue &amp; schedule
          </h3>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              Tournament name
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Courts
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={courts}
                onChange={(e) => setCourts(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Venue details, format overview, prize pool..."
              className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              Rules &amp; format notes
            </label>
            <textarea
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. 21-point cap at 25, minimum 3 matches per player..."
              className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              <span>Tournament active</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={registrationOpen}
                onChange={(e) => setRegistrationOpen(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              <span>Player registration open</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomStats}
                onChange={(e) => setUseCustomStats(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              <span>Show custom ratings</span>
            </label>
          </div>
        </div>

        {/* Registration & Payments */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Registration fee &amp; payment verification info
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Entry fee (Rs.)
              </label>
              <input
                type="number"
                min={0}
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Organizer UPI ID
              </label>
              <input
                type="text"
                value={paymentUpi}
                onChange={(e) => setPaymentUpi(e.target.value)}
                placeholder="organizer@okhdfcbank"
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Cash contact name
              </label>
              <input
                type="text"
                value={cashContactName}
                onChange={(e) => setCashContactName(e.target.value)}
                placeholder="Desk coordinator"
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Cash phone
              </label>
              <input
                type="text"
                value={cashContactNumber}
                onChange={(e) => setCashContactNumber(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Organizer helpline
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 ..."
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              {...qrDrop.getRootProps()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/70"
            >
              <input {...qrDrop.getInputProps()} />
              <QrCode className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs font-medium text-slate-700">
                {paymentQrCode ? "UPI QR uploaded (click to replace)" : "Upload UPI QR code"}
              </p>
            </div>

            <div
              {...bannerDrop.getRootProps()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/70"
            >
              <input {...bannerDrop.getInputProps()} />
              <ImageIcon className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs font-medium text-slate-700">
                {bannerUrl ? "Banner ready (click to replace)" : "Upload tournament banner"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="Or paste banner image URL"
              className="w-full px-3 py-1.5 text-xs bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Thumbnail / poster URL (optional)"
              className="w-full px-3 py-1.5 text-xs bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Auction Engine Configuration */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Auction parameters
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Default team purse
              </label>
              <input
                type="number"
                min={0}
                value={auctionPurse}
                onChange={(e) => setAuctionPurse(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Default base price
              </label>
              <input
                type="number"
                min={0}
                value={auctionBasePrice}
                onChange={(e) => setAuctionBasePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Bid increment step
              </label>
              <input
                type="number"
                min={10}
                value={auctionBidIncrement}
                onChange={(e) => setAuctionBidIncrement(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Min squad size
              </label>
              <input
                type="number"
                min={1}
                value={auctionMinSquadSize}
                onChange={(e) => setAuctionMinSquadSize(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Max squad size
              </label>
              <input
                type="number"
                min={1}
                value={auctionMaxSquadSize}
                onChange={(e) => setAuctionMaxSquadSize(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Points & Fair Play System Rules */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Points module &amp; Fair Play quota
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Win points
              </label>
              <input
                type="number"
                min={0}
                value={winPoints}
                onChange={(e) => setWinPoints(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Draw points
              </label>
              <input
                type="number"
                min={0}
                value={drawPoints}
                onChange={(e) => setDrawPoints(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Loss points
              </label>
              <input
                type="number"
                min={0}
                value={lossPoints}
                onChange={(e) => setLossPoints(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Target score / set
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={pointsToWin}
                onChange={(e) => setPointsToWin(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Fair Play min games
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={minGamesPerPlayer}
                onChange={(e) => setMinGamesPerPlayer(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Fair Play step pts
              </label>
              <input
                type="number"
                min={0}
                value={fairPlayPenaltyPoints}
                onChange={(e) => setFairPlayPenaltyPoints(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
