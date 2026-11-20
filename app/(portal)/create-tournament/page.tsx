import { requireUser } from "@courtpulse/auth/auth.helpers";
import { canCreateTournament } from "@courtpulse/helpers/quota.helpers";
import { CreateTournamentForm } from "@courtpulse/ui/tournaments/create-tournament-form.component";

export const dynamic = "force-dynamic";

export default async function CreateTournamentPage() {
  const user = await requireUser();
  const hasEligiblePlan =
    user.packageType === "TOURNAMENT_PACKAGE" ||
    user.packageType === "PRO_PACKAGE";
  const canCreate = canCreateTournament(
    user.packageType,
    user.tournamentCount,
    user.tournamentQuota
  );

  return (
    <CreateTournamentForm
      canCreate={canCreate}
      hasEligiblePlan={hasEligiblePlan}
      tournamentQuota={user.tournamentQuota}
    />
  );
}
