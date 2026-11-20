import { redirect } from "next/navigation";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { getProfileData } from "@courtpulse/profile/profile.queries";
import { ProfileView } from "@courtpulse/ui/profile/profile-view.component";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const data = await getProfileData(user.id);
  if (!data) redirect("/sign-in");

  return (
    <ProfileView
      user={data.user}
      stats={data.stats}
      achievements={data.achievements}
      eloHistory={data.eloHistory}
    />
  );
}
