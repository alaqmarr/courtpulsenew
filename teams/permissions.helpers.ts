import { eq } from "drizzle-orm";
import { db, teamMembers, teams } from "@courtpulse/database";

export interface TeamPermissions {
  isOwner: boolean;
  isManager: boolean;
  canCreateSessions: boolean;
  canCreateGames: boolean;
  canScoreGames: boolean;
  canManagePlayers: boolean;
  canManageAttendance: boolean;
  canDeleteMatches: boolean;
  canManagePermissions: boolean;
}

interface MemberPermInput {
  userId?: string | null;
  email: string;
  role: string;
  isActive?: boolean;
  canCreateSessions?: boolean;
  canCreateGames?: boolean;
  canScoreGames?: boolean;
  canManagePlayers?: boolean;
}

export function computeTeamPermissions(
  teamOwnerId: string,
  members: MemberPermInput[],
  userId: string,
  userEmail?: string | null
): TeamPermissions {
  const normalizedEmail = userEmail?.trim().toLowerCase();
  const member = members.find(
    (m) =>
      m.userId === userId ||
      (normalizedEmail && m.email.trim().toLowerCase() === normalizedEmail)
  );

  const isOwner = teamOwnerId === userId || member?.role === "OWNER";
  const isManager = member?.role === "MANAGER";
  const isActive = member ? member.isActive !== false : isOwner;

  // Co-admins (MANAGER) or primary owners have full operational access;
  // inactive members lose delegated session controls until re-activated.
  const canCreateSessions =
    isOwner || (isActive && (isManager || Boolean(member?.canCreateSessions)));
  const canCreateGames =
    isOwner || (isActive && (isManager || Boolean(member?.canCreateGames)));
  const canScoreGames =
    isOwner || (isActive && (isManager || Boolean(member?.canScoreGames)));
  const canManagePlayers =
    isOwner || (isActive && (isManager || Boolean(member?.canManagePlayers)));

  return {
    isOwner,
    isManager: isOwner || isManager,
    canCreateSessions,
    canCreateGames,
    canScoreGames,
    canManagePlayers,
    canManageAttendance: canCreateSessions || canCreateGames,
    canDeleteMatches: isOwner || (isActive && isManager) || (canCreateGames && canScoreGames),
    canManagePermissions: isOwner,
  };
}

export function resolveTeamPermissionsBySlug(
  teamSlug: string,
  userId: string,
  userEmail?: string | null
) {
  const team = db.select().from(teams).where(eq(teams.slug, teamSlug)).get();
  if (!team) return null;

  const members = db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id))
    .all();

  return {
    team,
    members,
    perms: computeTeamPermissions(team.ownerId, members, userId, userEmail),
  };
}

export function resolveTeamPermissionsById(
  teamId: string,
  userId: string,
  userEmail?: string | null
) {
  const team = db.select().from(teams).where(eq(teams.id, teamId)).get();
  if (!team) return null;

  const members = db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id))
    .all();

  return {
    team,
    members,
    perms: computeTeamPermissions(team.ownerId, members, userId, userEmail),
  };
}
