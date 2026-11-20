import type { PackageType } from "@courtpulse/database/schema.enums";

export interface PackagePlan {
  type: PackageType;
  title: string;
  summary: string;
  priceLabel: string;
  teamQuota: number;
  tournamentQuota: number;
  highlights: string[];
}

export const PACKAGE_PLANS: PackagePlan[] = [
  {
    type: "FREE",
    title: "Free",
    summary: "Join invited teams and view match results.",
    priceLabel: "Rs. 0",
    teamQuota: 0,
    tournamentQuota: 0,
    highlights: [
      "View team leaderboards and match history",
      "Join any team when added by an owner",
      "Track personal wins and losses",
    ],
  },
  {
    type: "TEAM_PACKAGE",
    title: "Team Plan",
    summary: "Run regular club sessions and track player rankings.",
    priceLabel: "Rs. 499 / month",
    teamQuota: 3,
    tournamentQuota: 0,
    highlights: [
      "Create and manage up to 3 teams",
      "Unlimited match sessions and games",
      "Automatic player and pair rankings",
    ],
  },
  {
    type: "TOURNAMENT_PACKAGE",
    title: "Tournament Plan",
    summary: "Host multi-team brackets and scheduled matches.",
    priceLabel: "Rs. 999 / month",
    teamQuota: 0,
    tournamentQuota: 2,
    highlights: [
      "Host up to 2 active tournaments",
      "Organize rounds and team rosters",
      "Live tournament standings",
    ],
  },
  {
    type: "PRO_PACKAGE",
    title: "Pro Plan",
    summary: "Full access for clubs running both teams and tournaments.",
    priceLabel: "Rs. 1,499 / month",
    teamQuota: 5,
    tournamentQuota: 5,
    highlights: [
      "Create up to 5 teams",
      "Host up to 5 tournaments",
      "Full player and pair statistics",
    ],
  },
];

export function canCreateTeam(packageType: PackageType, teamCount: number, teamQuota: number): boolean {
  return (packageType === "TEAM_PACKAGE" || packageType === "PRO_PACKAGE") && teamCount < teamQuota;
}

export function canCreateTournament(
  packageType: PackageType,
  tournamentCount: number,
  tournamentQuota: number
): boolean {
  return (
    (packageType === "TOURNAMENT_PACKAGE" || packageType === "PRO_PACKAGE") &&
    tournamentCount < tournamentQuota
  );
}
