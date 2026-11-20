import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((val) => val.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(100, "Password is too long.");

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your email.");

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters.").max(60),
});

export const addMemberSchema = z.object({
  email: emailSchema,
  displayName: z.string().trim().max(60).optional(),
});

export const createSessionSchema = z.object({
  name: z.string().trim().max(80).optional(),
  date: z.string().min(1, "Choose a date for the session."),
});

export const createTournamentSchema = z.object({
  name: z.string().trim().min(2, "Tournament name must be at least 2 characters.").max(80),
  minGamesPerPlayer: z.coerce.number().int().min(0).max(50).default(0),
  bannerUrl: z.string().trim().optional().or(z.literal("")),
});
