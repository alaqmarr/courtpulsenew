import { requireUser } from "@courtpulse/auth/auth.helpers";
import { canCreateTeam } from "@courtpulse/helpers/quota.helpers";
import { CreateTeamForm } from "@courtpulse/ui/teams/create-team-form.component";

export const dynamic = "force-dynamic";

export default async function CreateTeamPage() {
  const user = await requireUser();
  const hasEligiblePlan =
    user.packageType === "TEAM_PACKAGE" || user.packageType === "PRO_PACKAGE";
  const canCreate = canCreateTeam(
    user.packageType,
    user.teamCount,
    user.teamQuota
  );

  return (
    <CreateTeamForm
      canCreate={canCreate}
      hasEligiblePlan={hasEligiblePlan}
      teamQuota={user.teamQuota}
    />
  );
}
