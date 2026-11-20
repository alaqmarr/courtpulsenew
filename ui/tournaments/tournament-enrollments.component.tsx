"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  IndianRupee,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { sileo } from "sileo";
import {
  deleteTournamentEnrollmentAction,
  lookupEnrollmentStatusAction,
  reviewTournamentEnrollmentAction,
  submitTournamentEnrollmentAction,
} from "@courtpulse/tournaments/enrollment.action";

export interface EnrollmentItem {
  id: string;
  name: string;
  email: string;
  mobile: string;
  category: string;
  skillTier: string;
  notes: string | null;
  paymentMode: "UPI" | "CASH";
  transactionId: string | null;
  paymentScreenshotUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  createdAt: Date | string;
}

export function TournamentEnrollments({
  tournamentSlug,
  tournamentName,
  adminToken,
  entryFee,
  paymentUpi,
  paymentQrCode,
  cashContactName,
  cashContactNumber,
  auctionBasePrice,
  isActive,
  registrationOpen,
  isAdmin,
  enrollments,
}: {
  tournamentSlug: string;
  tournamentName: string;
  adminToken?: string | null;
  entryFee: number;
  paymentUpi: string | null;
  paymentQrCode: string | null;
  cashContactName: string | null;
  cashContactNumber: string | null;
  auctionBasePrice: number;
  isActive: boolean;
  registrationOpen: boolean;
  isAdmin: boolean;
  enrollments: EnrollmentItem[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [category, setCategory] = useState("All-Rounder");
  const [skillTier, setSkillTier] = useState("Tier B");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH">("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  // Player self-lookup
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<{
    found?: boolean;
    status?: string;
    name?: string;
    paymentMode?: string;
    adminNotes?: string | null;
  } | null>(null);

  // Admin verification filters & modal
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [basePriceOverrides, setBasePriceOverrides] = useState<
    Record<string, string>
  >({});

  const copyRegLink = () => {
    const url = `${window.location.origin}/tournament/${tournamentSlug}/register`;
    navigator.clipboard.writeText(url);
    sileo.success({ title: "Registration link copied" });
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      submitTournamentEnrollmentAction({
        tournamentSlug,
        name,
        email,
        mobile,
        category,
        skillTier,
        notes: notes || undefined,
        paymentMode,
        transactionId,
        paymentScreenshotUrl: screenshotUrl || undefined,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not submit registration." });
        return;
      }
      sileo.success({ title: "Registration submitted for verification" });
      setName("");
      setEmail("");
      setMobile("");
      setNotes("");
      setTransactionId("");
      setScreenshotUrl("");
      router.refresh();
    },
  });

  const lookupMutation = useMutation({
    mutationFn: () =>
      lookupEnrollmentStatusAction({ tournamentSlug, query: lookupQuery }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Lookup failed." });
        return;
      }
      setLookupResult(res);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (input: {
      enrollmentId: string;
      status: "APPROVED" | "REJECTED";
      adminNotes?: string;
      basePrice?: number;
      skillTier?: string;
    }) =>
      reviewTournamentEnrollmentAction({
        tournamentSlug,
        adminToken,
        ...input,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not update registration." });
        return;
      }
      sileo.success({ title: "Verification saved & auction pool synced" });
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      deleteTournamentEnrollmentAction({
        tournamentSlug,
        adminToken,
        enrollmentId,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not remove entry." });
        return;
      }
      sileo.success({ title: "Registration removed" });
      router.refresh();
    },
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
        setScreenshotUrl(reader.result);
        sileo.success({ title: "Payment proof attached" });
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const e of enrollments) {
      if (e.status === "PENDING") pending += 1;
      else if (e.status === "APPROVED") approved += 1;
      else rejected += 1;
    }
    return {
      pending,
      approved,
      rejected,
      collected: approved * entryFee,
    };
  }, [enrollments, entryFee]);

  const filteredEnrollments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return enrollments.filter((e) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.mobile.toLowerCase().includes(q) ||
        (e.transactionId || "").toLowerCase().includes(q)
      );
    });
  }, [enrollments, statusFilter, searchTerm]);

  const exportCsv = () => {
    const header = [
      "Name",
      "Email",
      "Mobile",
      "Category",
      "Tier",
      "PaymentMode",
      "TransactionID",
      "Status",
    ].join(",");
    const lines = filteredEnrollments.map((e) =>
      [
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.email}"`,
        `"${e.mobile}"`,
        `"${e.category}"`,
        `"${e.skillTier}"`,
        e.paymentMode,
        `"${e.transactionId || ""}"`,
        e.status,
      ].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournamentSlug}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canRegister = isActive && registrationOpen;
  const upiDeepLink =
    paymentUpi && entryFee > 0
      ? `upi://pay?pa=${encodeURIComponent(paymentUpi)}&pn=${encodeURIComponent(
          tournamentName
        )}&am=${entryFee}&cu=INR`
      : null;

  return (
    <div className="space-y-6 cp-fade-up">
      {/* Top Share Bar for Public Player Link */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Public player registration link
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Share `/tournament/{tournamentSlug}/register` on WhatsApp or club groups so players can submit fees and check verification status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copyRegLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
            <span>Copy registration link</span>
          </button>
          <a
            href={`/tournament/${tournamentSlug}/register`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open standalone page</span>
          </a>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Registration Form + Self Lookup */}
        <div
          className={`${
            isAdmin ? "xl:col-span-5" : "xl:col-span-7"
          } space-y-5`}
        >
          {canRegister ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Register as a player
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {entryFee > 0 ? `Entry fee: Rs. ${entryFee}` : "Free entry"}
                    {paymentUpi ? ` · UPI: ${paymentUpi}` : ""}
                  </p>
                </div>
                {entryFee > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono-nums font-bold">
                    <IndianRupee className="w-3 h-3" />
                    {entryFee}
                  </span>
                )}
              </div>

              {(paymentQrCode || upiDeepLink || cashContactName) && (
                <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 space-y-2.5">
                  {paymentQrCode && (
                    <div className="flex items-center gap-3">
                      <img
                        src={paymentQrCode}
                        alt="Tournament Payment QR"
                        className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1"
                      />
                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="font-semibold text-slate-900">
                          Scan UPI QR to pay
                        </div>
                        {paymentUpi && (
                          <div className="font-mono-nums text-[11px] text-slate-500">
                            {paymentUpi}
                          </div>
                        )}
                        {upiDeepLink && (
                          <a
                            href={upiDeepLink}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Pay via UPI app
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {!paymentQrCode && upiDeepLink && (
                    <a
                      href={upiDeepLink}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Pay Rs. {entryFee} via UPI ({paymentUpi})
                    </a>
                  )}
                  {cashContactName && (
                    <p className="text-xs text-slate-600">
                      Cash desk contact: <span className="font-semibold text-slate-900">{cashContactName}</span>
                      {cashContactNumber ? ` (${cashContactNumber})` : ""}
                    </p>
                  )}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMutation.mutate();
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Phone / WhatsApp"
                    className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                  >
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Doubles Specialist">Doubles Specialist</option>
                    <option value="Singles">Singles</option>
                    <option value="Mixed Doubles">Mixed Doubles</option>
                  </select>
                  <select
                    value={skillTier}
                    onChange={(e) => setSkillTier(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                  >
                    <option value="Tier A">Tier A (Advanced)</option>
                    <option value="Tier B">Tier B (Intermediate)</option>
                    <option value="Tier C">Tier C (Club)</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional club note or jersey size"
                  className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                />

                {entryFee > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("UPI")}
                        className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                          paymentMode === "UPI"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        UPI transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode("CASH")}
                        className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                          paymentMode === "CASH"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        Cash payment
                      </button>
                    </div>

                    {paymentMode === "UPI" && (
                      <>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="UPI transaction / UTR reference ID"
                          className="w-full px-3 py-2 text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
                        />
                        <div
                          {...getRootProps()}
                          className="border-2 border-dashed border-slate-200 bg-slate-50/70 hover:border-emerald-400 rounded-xl p-4 text-center cursor-pointer"
                        >
                          <input {...getInputProps()} />
                          <Upload className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                          <p className="text-xs text-slate-700 font-medium">
                            {screenshotUrl
                              ? "Payment screenshot attached (click to replace)"
                              : "Upload UPI payment screenshot"}
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit registration"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
              Player registrations are currently closed for this tournament.
            </div>
          )}

          {/* Player Registration Status Checker */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h4 className="text-sm font-bold text-slate-900">
              Check your verification status
            </h4>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupMutation.mutate();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Enter registered email or phone"
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50/70 text-slate-900 border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                disabled={lookupMutation.isPending}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
              >
                Check
              </button>
            </form>

            {lookupResult && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                {!lookupResult.found ? (
                  <span className="text-slate-600">
                    No registration matched that email or phone.
                  </span>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {lookupResult.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          lookupResult.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : lookupResult.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {lookupResult.status}
                      </span>
                    </div>
                    {lookupResult.adminNotes && (
                      <p className="text-slate-600">
                        Note: {lookupResult.adminNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Admin Payment Verification Queue */}
        {isAdmin && (
          <div className="xl:col-span-7 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200/90 rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-amber-700 uppercase">
                  Pending review
                </div>
                <div className="font-display text-2xl font-extrabold text-slate-900 mt-0.5">
                  {counts.pending}
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase">
                  Approved
                </div>
                <div className="font-display text-2xl font-extrabold text-slate-900 mt-0.5">
                  {counts.approved}
                </div>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-rose-700 uppercase">
                  Rejected
                </div>
                <div className="font-display text-2xl font-extrabold text-slate-900 mt-0.5">
                  {counts.rejected}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase">
                  Verified fees
                </div>
                <div className="font-display text-2xl font-extrabold text-emerald-900 mt-0.5">
                  Rs. {counts.collected}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                          statusFilter === st
                            ? "bg-slate-900 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {st === "ALL" ? `All (${enrollments.length})` : st}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search player or UTR..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 rounded-lg cursor-pointer"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {filteredEnrollments.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  No registrations match this filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEnrollments.map((en) => {
                    const priceDraft =
                      basePriceOverrides[en.id] ?? String(auctionBasePrice);

                    return (
                      <div
                        key={en.id}
                        className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {en.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                en.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : en.status === "REJECTED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {en.status}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full">
                              {en.category} · {en.skillTier}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono-nums">
                            {en.email} · {en.mobile}
                          </div>
                          <div className="text-xs text-slate-600">
                            Payment: <span className="font-semibold">{en.paymentMode}</span>
                            {en.transactionId ? ` · Ref: ${en.transactionId}` : ""}
                            {en.notes ? ` · "${en.notes}"` : ""}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {en.paymentScreenshotUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(en.paymentScreenshotUrl)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Proof</span>
                            </button>
                          )}

                          {en.status !== "APPROVED" && (
                            <input
                              type="number"
                              min={0}
                              value={priceDraft}
                              onChange={(e) =>
                                setBasePriceOverrides((p) => ({
                                  ...p,
                                  [en.id]: e.target.value,
                                }))
                              }
                              title="Auction base price on approval"
                              className="w-20 px-2 py-1 text-xs font-mono-nums border border-slate-200 rounded-lg bg-slate-50"
                            />
                          )}

                          {en.status !== "APPROVED" && (
                            <button
                              type="button"
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  enrollmentId: en.id,
                                  status: "APPROVED",
                                  basePrice: Number(priceDraft || auctionBasePrice),
                                  skillTier: en.skillTier,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify &amp; Approve</span>
                            </button>
                          )}

                          {en.status !== "REJECTED" && (
                            <button
                              type="button"
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  enrollmentId: en.id,
                                  status: "REJECTED",
                                  adminNotes: "Payment could not be verified",
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(en.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Screenshot Lightbox Modal */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                Payment proof screenshot
              </span>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex justify-center">
              <img
                src={previewUrl}
                alt="Payment screenshot"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
