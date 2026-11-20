import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { resolveTournamentAccess } from "@courtpulse/tournaments/tournament.helpers";
import { getTournamentDetailBySlug } from "@courtpulse/tournaments/tournament.queries";
import { TournamentEnrollments } from "@courtpulse/ui/tournaments/tournament-enrollments.component";

export const dynamic = "force-dynamic";

export default async function TournamentRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ adminToken?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const [data, access] = await Promise.all([
    getTournamentDetailBySlug(slug),
    resolveTournamentAccess(slug, { adminToken: query.adminToken }),
  ]);
  if (!data || !access) notFound();

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/tournament/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {data.tournament.name}</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Trophy className="w-3.5 h-3.5 text-emerald-600" />
          <span>Official player registration portal</span>
        </div>
      </div>

      <section className="w-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_-12px_rgba(6,78,59,0.4)]">
        <h1 className="text-2xl sm:text-[28px] font-bold text-white">
          {data.tournament.name} Registration
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/85 mt-1">
          Submit your player profile and payment reference to enter the verified auction pool.
        </p>
      </section>

      <TournamentEnrollments
        tournamentSlug={data.tournament.slug}
        tournamentName={data.tournament.name}
        adminToken={access.isAdmin ? access.tournament.adminToken : null}
        entryFee={data.tournament.entryFee}
        paymentUpi={data.tournament.paymentUpi}
        paymentQrCode={data.tournament.paymentQrCode}
        cashContactName={data.tournament.cashContactName}
        cashContactNumber={data.tournament.cashContactNumber}
        auctionBasePrice={data.tournament.auctionBasePrice}
        isActive={data.tournament.isActive}
        registrationOpen={data.tournament.registrationOpen}
        isAdmin={access.isAdmin}
        enrollments={access.isAdmin ? data.enrollments : []}
      />
    </div>
  );
}
