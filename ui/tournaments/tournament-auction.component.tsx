"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  Crown,
  ExternalLink,
  Gavel,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Shuffle,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { sileo } from "sileo";
import type { AuctionStatus } from "@courtpulse/database/schema.enums";
import {
  bringPlayerToBlockAction,
  finalizeAuctionLotAction,
  placeAuctionBidAction,
  requeueUnsoldPlayersAction,
  setAuctionStatusAction,
  undoLastAuctionBidAction,
} from "@courtpulse/tournaments/auction.action";
import {
  addTournamentPlayerAction,
  assignTournamentPlayerAuctionAction,
  toggleTournamentPlayerCheckInAction,
} from "@courtpulse/tournaments/tournament.action";

type AuctionPerspective = "PUBLIC" | "OWNER" | "PLAYERS" | "ADMIN";

interface LiveTeamState {
  id: string;
  name: string;
  color: string;
  ownerName: string | null;
  squadCount: number;
  purseBudget: number;
  purseSpent: number;
  purseRemaining: number;
}

interface LivePlayerState {
  id: string;
  name: string;
  category: string;
  skillTier: string;
  basePrice: number;
  soldPrice: number;
  teamId: string | null;
  isCaptain: boolean;
  isCheckedIn: boolean;
  auctionStatus: "PENDING" | "ON_BLOCK" | "SOLD" | "UNSOLD";
  customRating: number | null;
  email?: string | null;
}

interface LiveSnapshot {
  auctionStatus: AuctionStatus;
  auctionPurse: number;
  auctionBasePrice: number;
  auctionBidIncrement: number;
  auctionMinSquadSize: number;
  auctionMaxSquadSize: number;
  currentHighestBid: number;
  currentHighestTeamId: string | null;
  currentPlayer: LivePlayerState | null;
  currentBids: {
    id: string;
    teamId: string;
    amount: number;
    bidderLabel: string;
    createdAt: string | Date;
  }[];
  recentBids: {
    id: string;
    playerId: string;
    teamId: string;
    amount: number;
    bidderLabel: string;
  }[];
  teams: LiveTeamState[];
  players: LivePlayerState[];
}

export function TournamentAuction({
  tournamentSlug,
  adminToken,
  ownerToken,
  initialOwnerTeamId,
  isAdmin,
  initialSnapshot,
  standalone = false,
}: {
  tournamentSlug: string;
  adminToken?: string | null;
  ownerToken?: string | null;
  initialOwnerTeamId?: string | null;
  isAdmin: boolean;
  initialSnapshot: LiveSnapshot;
  standalone?: boolean;
}) {
  const router = useRouter();
  const [perspective, setPerspective] = useState<AuctionPerspective>(
    isAdmin ? "ADMIN" : initialOwnerTeamId ? "OWNER" : "PUBLIC"
  );
  const [selectedAdminTeamId, setSelectedAdminTeamId] = useState<string>(
    initialSnapshot.teams[0]?.id || ""
  );
  const [customBidText, setCustomBidText] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerCategory, setNewPlayerCategory] = useState("All-Rounder");
  const [newPlayerTier, setNewPlayerTier] = useState("Tier B");
  const [newPlayerBasePrice, setNewPlayerBasePrice] = useState(
    String(initialSnapshot.auctionBasePrice)
  );
  const [poolFilter, setPoolFilter] = useState<
    "ALL" | "PENDING" | "SOLD" | "UNSOLD"
  >("ALL");
  const [poolSearch, setPoolSearch] = useState("");

  // Live 1.5s polling so admins, team owners, players & public catch up in sync
  const { data: live = initialSnapshot, refetch } = useQuery<LiveSnapshot>({
    queryKey: ["auction-state", tournamentSlug],
    queryFn: async () => {
      const res = await fetch(
        `/api/tournament/${tournamentSlug}/auction-state`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to sync auction state");
      return res.json();
    },
    initialData: initialSnapshot,
    refetchInterval: 1500,
  });

  const teamMap = useMemo(
    () => new Map(live.teams.map((t) => [t.id, t])),
    [live.teams]
  );

  const activeOwnerTeam = initialOwnerTeamId
    ? live.teams.find((t) => t.id === initialOwnerTeamId) ?? null
    : null;

  const activeBidTeamId =
    perspective === "OWNER" && activeOwnerTeam
      ? activeOwnerTeam.id
      : selectedAdminTeamId;
  const activeBidTeam = activeBidTeamId
    ? teamMap.get(activeBidTeamId) ?? null
    : null;

  const nextMinBid = live.currentPlayer
    ? live.currentHighestBid > 0
      ? live.currentHighestBid + live.auctionBidIncrement
      : live.currentPlayer.basePrice || live.auctionBasePrice
    : live.auctionBasePrice;

  const highestTeam = live.currentHighestTeamId
    ? teamMap.get(live.currentHighestTeamId) ?? null
    : null;

  const maxSafeBidForTeam = (tm: LiveTeamState | null) => {
    if (!tm) return 0;
    const mandatoryAfterThis = Math.max(
      0,
      live.auctionMinSquadSize - (tm.squadCount + 1)
    );
    return Math.max(
      0,
      tm.purseRemaining - mandatoryAfterThis * live.auctionBasePrice
    );
  };

  const syncAll = () => {
    void refetch();
    router.refresh();
  };

  const statusMutation = useMutation({
    mutationFn: (status: AuctionStatus) =>
      setAuctionStatusAction({ tournamentSlug, adminToken, status }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Update failed." });
      else syncAll();
    },
  });

  const onBlockMutation = useMutation({
    mutationFn: (playerId?: string) =>
      bringPlayerToBlockAction({ tournamentSlug, adminToken, playerId }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Could not load player." });
      else {
        sileo.success({ title: `${res.playerName} is now on the block` });
        syncAll();
      }
    },
  });

  const bidMutation = useMutation({
    mutationFn: (payload: { teamId: string; amount: number }) =>
      placeAuctionBidAction({
        tournamentSlug,
        adminToken,
        ownerToken,
        teamId: payload.teamId,
        amount: payload.amount,
      }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Bid rejected." });
      else {
        setCustomBidText("");
        syncAll();
      }
    },
  });

  const undoBidMutation = useMutation({
    mutationFn: () => undoLastAuctionBidAction({ tournamentSlug, adminToken }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Nothing to undo." });
      else syncAll();
    },
  });

  const finalizeLotMutation = useMutation({
    mutationFn: (outcome: "SOLD" | "UNSOLD") =>
      finalizeAuctionLotAction({ tournamentSlug, adminToken, outcome }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Action failed." });
      else {
        sileo.success({ title: "Auction lot updated" });
        syncAll();
      }
    },
  });

  const requeueMutation = useMutation({
    mutationFn: () => requeueUnsoldPlayersAction({ tournamentSlug, adminToken }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Nothing to re-queue." });
      else {
        sileo.success({ title: `${res.count} unsold players re-queued` });
        syncAll();
      }
    },
  });

  const addPlayerMutation = useMutation({
    mutationFn: () =>
      addTournamentPlayerAction({
        tournamentSlug,
        adminToken,
        name: newPlayerName,
        email: newPlayerEmail || undefined,
        category: newPlayerCategory,
        skillTier: newPlayerTier,
        basePrice: Number(newPlayerBasePrice || live.auctionBasePrice),
      }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Could not add player." });
      else {
        sileo.success({ title: "Player added to auction pool" });
        setNewPlayerName("");
        setNewPlayerEmail("");
        syncAll();
      }
    },
  });

  const retainCaptainMutation = useMutation({
    mutationFn: (input: {
      playerId: string;
      teamId: string | null;
      soldPrice: number;
      isCaptain: boolean;
    }) =>
      assignTournamentPlayerAuctionAction({
        tournamentSlug,
        adminToken,
        ...input,
      }),
    onSuccess: (res) => {
      if (!res.ok) sileo.error({ title: res.message || "Update failed." });
      else syncAll();
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (input: { playerId: string; isCheckedIn: boolean }) =>
      toggleTournamentPlayerCheckInAction({
        tournamentSlug,
        adminToken,
        ...input,
      }),
    onSuccess: () => syncAll(),
  });

  const filteredPool = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    return live.players.filter((p) => {
      if (poolFilter !== "ALL" && p.auctionStatus !== poolFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.skillTier.toLowerCase().includes(q)
      );
    });
  }, [live.players, poolFilter, poolSearch]);

  const counts = useMemo(
    () => ({
      pending: live.players.filter((p) => p.auctionStatus === "PENDING").length,
      sold: live.players.filter((p) => p.auctionStatus === "SOLD").length,
      unsold: live.players.filter((p) => p.auctionStatus === "UNSOLD").length,
    }),
    [live.players]
  );

  return (
    <div className="space-y-6 cp-fade-up">
      {/* Live Status & Role Switcher Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              live.auctionStatus === "LIVE"
                ? "bg-emerald-100 text-emerald-800"
                : live.auctionStatus === "PAUSED"
                ? "bg-amber-100 text-amber-800"
                : live.auctionStatus === "COMPLETED"
                ? "bg-slate-200 text-slate-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {live.auctionStatus === "LIVE" && (
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            )}
            <span>Auction: {live.auctionStatus.replace("_", " ")}</span>
          </span>
          <span className="text-xs font-mono-nums text-slate-500">
            Pending: {counts.pending} · Sold: {counts.sold} · Unsold: {counts.unsold}
          </span>
          {!standalone && (
            <a
              href={`/tournament/${tournamentSlug}/auction`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open fullscreen stage</span>
            </a>
          )}
        </div>

        {/* Role Views: Public Catch-up, Players, Team Owner, Admin */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(
            [
              { key: "PUBLIC", label: "Public live catch-up" },
              { key: "PLAYERS", label: `Players pool (${live.players.length})` },
              ...(activeOwnerTeam
                ? [{ key: "OWNER", label: `Owner: ${activeOwnerTeam.name}` }]
                : []),
              ...(isAdmin
                ? [{ key: "ADMIN", label: "Auctioneer console" }]
                : []),
            ] as { key: AuctionPerspective; label: string }[]
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPerspective(item.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                perspective === item.key
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live On The Block Spotlight Card (Visible to Admin, Owners, Players & General Public!) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl p-5 sm:p-6 shadow-[0_14px_34px_-12px_rgba(6,78,59,0.5)] flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-200">
              <Gavel className="w-3.5 h-3.5" />
              <span>Player on the block</span>
            </span>
            <span className="text-xs font-mono-nums text-emerald-100/80">
              Base {live.auctionBasePrice} · Step +{live.auctionBidIncrement}
            </span>
          </div>

          {live.currentPlayer ? (
            <div key={live.currentPlayer.id} className="cp-pop-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-100 bg-white/10 px-2.5 py-0.5 rounded-full">
                    <span>{live.currentPlayer.category}</span>
                    <span>·</span>
                    <span>{live.currentPlayer.skillTier}</span>
                    {live.currentPlayer.customRating && (
                      <>
                        <span>·</span>
                        <span>Rating {live.currentPlayer.customRating}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white mt-2">
                    {live.currentPlayer.name}
                  </h2>
                </div>

                <div className="bg-white/15 backdrop-blur-xs border border-white/20 rounded-xl px-4 py-3 text-left sm:text-right shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
                    {live.currentHighestBid > 0 ? "Current highest bid" : "Opening base bid"}
                  </div>
                  <div className="font-display text-3xl font-extrabold text-amber-300 mt-0.5">
                    Rs.{" "}
                    {live.currentHighestBid > 0
                      ? live.currentHighestBid
                      : live.currentPlayer.basePrice || live.auctionBasePrice}
                  </div>
                  <div className="text-xs font-semibold text-white mt-0.5">
                    {highestTeam ? `Held by ${highestTeam.name}` : "No bids placed yet"}
                  </div>
                </div>
              </div>

              {live.currentBids.length > 0 && (
                <div className="pt-2 border-t border-white/15 flex flex-wrap gap-1.5">
                  {live.currentBids.slice(0, 6).map((b, i) => {
                    const bTeam = teamMap.get(b.teamId);
                    return (
                      <span
                        key={b.id}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono-nums ${
                          i === 0
                            ? "bg-amber-300 text-amber-950 font-bold"
                            : "bg-white/10 text-emerald-50"
                        }`}
                      >
                        {bTeam?.name || b.bidderLabel}: Rs. {b.amount}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-emerald-100/90 text-sm">
              No player is currently on the podium. Waiting for the auctioneer to call the next lot.
            </div>
          )}

          {/* Admin Quick Controls Bar directly under stage */}
          {perspective === "ADMIN" && isAdmin && (
            <div className="pt-3 border-t border-white/15 flex flex-wrap items-center gap-2">
              {live.auctionStatus !== "LIVE" ? (
                <button
                  type="button"
                  onClick={() => statusMutation.mutate("LIVE")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-emerald-950 rounded-lg cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Go LIVE</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => statusMutation.mutate("PAUSED")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-300 text-amber-950 rounded-lg cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                disabled={onBlockMutation.isPending}
                onClick={() => onBlockMutation.mutate(undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-500/30 hover:bg-emerald-500/40 border border-white/25 text-white rounded-lg cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Next random player</span>
              </button>

              {live.currentPlayer && (
                <>
                  <button
                    type="button"
                    disabled={undoBidMutation.isPending || live.currentBids.length === 0}
                    onClick={() => undoBidMutation.mutate()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-lg cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo bid</span>
                  </button>
                  <button
                    type="button"
                    disabled={finalizeLotMutation.isPending || !live.currentHighestTeamId}
                    onClick={() => finalizeLotMutation.mutate("SOLD")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-amber-950 rounded-lg cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>SOLD</span>
                  </button>
                  <button
                    type="button"
                    disabled={finalizeLotMutation.isPending}
                    onClick={() => finalizeLotMutation.mutate("UNSOLD")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-500/80 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>UNSOLD</span>
                  </button>
                </>
              )}

              {counts.unsold > 0 && (
                <button
                  type="button"
                  onClick={() => requeueMutation.mutate()}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-queue unsold ({counts.unsold})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side Panel: Team Owner Console OR Admin Bid Panel OR Public Feed */}
        <div className="xl:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {(perspective === "OWNER" && activeOwnerTeam) ||
          (perspective === "ADMIN" && isAdmin) ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {perspective === "OWNER"
                    ? `${activeOwnerTeam?.name} Bidding Console`
                    : "Auctioneer Paddle / Place Bid"}
                </h3>
                {activeBidTeam && (
                  <span className="text-xs font-mono-nums font-semibold text-emerald-700">
                    Left: Rs. {activeBidTeam.purseRemaining}
                  </span>
                )}
              </div>

              {perspective === "ADMIN" && live.teams.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {live.teams.map((tm) => {
                    const selected = selectedAdminTeamId === tm.id;
                    return (
                      <button
                        key={tm.id}
                        type="button"
                        onClick={() => setSelectedAdminTeamId(tm.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? "bg-emerald-50 border-emerald-400"
                            : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-xs font-bold text-slate-900 truncate">
                          <span>{tm.name}</span>
                          <span className="font-mono-nums text-[10px] text-slate-500">
                            {tm.squadCount}/{live.auctionMaxSquadSize}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono-nums text-emerald-700 mt-0.5">
                          Rs. {tm.purseRemaining} left
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeBidTeam && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 grid grid-cols-3 gap-2 text-center text-xs font-mono-nums">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Squad</div>
                    <div className="font-bold text-slate-900">
                      {activeBidTeam.squadCount}/{live.auctionMaxSquadSize}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Remaining</div>
                    <div className="font-bold text-emerald-700">
                      Rs. {activeBidTeam.purseRemaining}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Max safe bid</div>
                    <div className="font-bold text-slate-900">
                      Rs. {maxSafeBidForTeam(activeBidTeam)}
                    </div>
                  </div>
                </div>
              )}

              {live.currentPlayer ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={
                      bidMutation.isPending ||
                      live.auctionStatus !== "LIVE" ||
                      !activeBidTeam ||
                      live.currentHighestTeamId === activeBidTeam.id
                    }
                    onClick={() =>
                      activeBidTeam &&
                      bidMutation.mutate({
                        teamId: activeBidTeam.id,
                        amount: nextMinBid,
                      })
                    }
                    className="w-full py-3 px-4 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {live.currentHighestTeamId === activeBidTeam?.id
                      ? `Leading highest bid (Rs. ${live.currentHighestBid})`
                      : `Bid Rs. ${nextMinBid} for ${activeBidTeam?.name || "Team"}`}
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={nextMinBid}
                      step={live.auctionBidIncrement}
                      value={customBidText}
                      onChange={(e) => setCustomBidText(e.target.value)}
                      placeholder={`Custom amount (>= ${nextMinBid})`}
                      className="flex-1 px-3 py-2 text-xs font-mono-nums bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <button
                      type="button"
                      disabled={
                        !customBidText ||
                        bidMutation.isPending ||
                        !activeBidTeam ||
                        live.auctionStatus !== "LIVE"
                      }
                      onClick={() =>
                        activeBidTeam &&
                        bidMutation.mutate({
                          teamId: activeBidTeam.id,
                          amount: Number(customBidText),
                        })
                      }
                      className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg cursor-pointer"
                    >
                      Place custom bid
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Bidding opens as soon as a player steps onto the auction block.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Live auction activity feed
              </h3>
              {live.recentBids.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No bids recorded yet. Spectators and players can watch this screen live as franchises bid.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {live.recentBids.slice(0, 10).map((b) => {
                    const tm = teamMap.get(b.teamId);
                    const pl = live.players.find((p) => p.id === b.playerId);
                    return (
                      <div
                        key={b.id}
                        className="py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="truncate">
                          <span className="font-semibold text-slate-900">
                            {tm?.name || b.bidderLabel}
                          </span>{" "}
                          bid on{" "}
                          <span className="font-medium text-emerald-700">
                            {pl?.name || "Player"}
                          </span>
                        </div>
                        <span className="font-mono-nums font-bold text-slate-900 shrink-0">
                          Rs. {b.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Franchise Purse & Squads Strip */}
      {live.teams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {live.teams.map((tm) => {
            const pct =
              tm.purseBudget > 0
                ? Math.min(100, Math.round((tm.purseSpent / tm.purseBudget) * 100))
                : 0;
            const squad = live.players.filter((p) => p.teamId === tm.id);
            return (
              <div
                key={tm.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                style={{ borderTop: `3px solid ${tm.color || "#059669"}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-slate-900 truncate">
                    {tm.name}
                  </span>
                  <span className="text-[11px] font-mono-nums text-slate-500">
                    {tm.squadCount}/{live.auctionMaxSquadSize}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono-nums text-slate-600">
                  <span>Left: Rs. {tm.purseRemaining}</span>
                  <span>Safe max: Rs. {maxSafeBidForTeam(tm)}</span>
                </div>
                {squad.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {squad.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 text-[10px] font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                      >
                        {p.name} ({p.soldPrice})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Quick Add Player */}
      {isAdmin && perspective === "ADMIN" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addPlayerMutation.mutate();
          }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        >
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Add player name
            </label>
            <input
              type="text"
              required
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player full name"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={newPlayerEmail}
              onChange={(e) => setNewPlayerEmail(e.target.value)}
              placeholder="player@example.com"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Category
            </label>
            <select
              value={newPlayerCategory}
              onChange={(e) => setNewPlayerCategory(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg"
            >
              <option value="All-Rounder">All-Rounder</option>
              <option value="Doubles Specialist">Doubles</option>
              <option value="Singles">Singles</option>
              <option value="Mixed Doubles">Mixed</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Tier
            </label>
            <select
              value={newPlayerTier}
              onChange={(e) => setNewPlayerTier(e.target.value)}
              className="w-full px-2 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg"
            >
              <option value="Tier A">Tier A</option>
              <option value="Tier B">Tier B</option>
              <option value="Tier C">Tier C</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Base
            </label>
            <input
              type="number"
              min={0}
              value={newPlayerBasePrice}
              onChange={(e) => setNewPlayerBasePrice(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-mono-nums bg-slate-50/70 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={addPlayerMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </form>
      )}

      {/* Full Players Pool & Manual Retention/Auctioneer Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Players catalog ({filteredPool.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(["ALL", "PENDING", "SOLD", "UNSOLD"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPoolFilter(f)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                    poolFilter === f
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                placeholder="Search player..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {filteredPool.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No players in this auction view yet. Approve player registrations or add players above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPool.map((p) => {
              const soldTeam = p.teamId ? teamMap.get(p.teamId) : null;
              return (
                <div
                  key={p.id}
                  className="px-4 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 hover:bg-slate-50/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          checkInMutation.mutate({
                            playerId: p.id,
                            isCheckedIn: !p.isCheckedIn,
                          })
                        }
                        title={p.isCheckedIn ? "Checked in" : "Mark present"}
                        className={`h-6 w-6 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                          p.isCheckedIn
                            ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                            : "bg-slate-50 border-slate-200 text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">
                          {p.name}
                        </span>
                        {p.isCaptain && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5" /> Captain
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full">
                          {p.category} · {p.skillTier}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono-nums mt-0.5">
                        Base Rs. {p.basePrice} ·{" "}
                        {soldTeam
                          ? `SOLD to ${soldTeam.name} @ Rs. ${p.soldPrice}`
                          : p.auctionStatus}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {!p.teamId && (
                        <button
                          type="button"
                          onClick={() => onBlockMutation.mutate(p.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg cursor-pointer"
                        >
                          Put on block
                        </button>
                      )}
                      {live.teams.length > 0 && (
                        <select
                          value={p.teamId || ""}
                          onChange={(e) =>
                            retainCaptainMutation.mutate({
                              playerId: p.id,
                              teamId: e.target.value || null,
                              soldPrice: p.soldPrice || p.basePrice,
                              isCaptain: p.isCaptain,
                            })
                          }
                          className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                        >
                          <option value="">Unassigned</option>
                          {live.teams.map((tm) => (
                            <option key={tm.id} value={tm.id}>
                              {tm.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {p.teamId && (
                        <button
                          type="button"
                          onClick={() =>
                            retainCaptainMutation.mutate({
                              playerId: p.id,
                              teamId: p.teamId,
                              soldPrice: p.soldPrice,
                              isCaptain: !p.isCaptain,
                            })
                          }
                          className={`px-2 py-1 text-[11px] font-semibold border rounded-lg cursor-pointer ${
                            p.isCaptain
                              ? "bg-amber-50 border-amber-300 text-amber-800"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          {p.isCaptain ? "Captain" : "Make captain"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
