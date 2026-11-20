import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@courtpulse/auth/auth.helpers";
import { db, teamMembers, teams, users } from "@courtpulse/database";
import { getMemberDisplayName } from "@courtpulse/helpers/stats.helpers";
import { CreateSessionForm } from "@courtpulse/ui/teams/create-session-form.component";

export const dynamic = "force-dynamic";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const team = db.select().from(teams).where(eq(teams.slug, slug)).get();
  if (!team) notFound();

  const memberRows = db
    .select({ member: teamMembers, user: users })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, team.id))
    .all();

  const isAdmin =
    team.ownerId === user.id ||
    memberRows.some(
      ({ member }) =>
        member.userId === user.id &&
        (member.role === "OWNER" || member.role === "MANAGER")
    );

  if (!isAdmin) redirect(`/team/${slug}`);

  const members = memberRows.map(({ member, user: memberUser }) => ({
    id: member.id,
    displayName: getMemberDisplayName({
      email: member.email,
      displayName: member.displayName,
      user: memberUser,
    }),
  }));

  return (
    <CreateSessionForm
      teamSlug={team.slug}
      teamName={team.name}
      members={members}
    />
  );
}
