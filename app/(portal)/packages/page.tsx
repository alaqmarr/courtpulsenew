import { requireUser } from "@courtpulse/auth/auth.helpers";
import { PackagesView } from "@courtpulse/ui/packages/packages-view.component";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const user = await requireUser();

  return <PackagesView currentPlan={user.packageType} userEmail={user.email} />;
}
