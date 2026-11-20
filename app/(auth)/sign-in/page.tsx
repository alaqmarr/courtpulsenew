import { redirect } from "next/navigation";
import { getCurrentUser } from "@courtpulse/auth/auth.helpers";
import { SignInFlow } from "@courtpulse/ui/auth/sign-in-flow.component";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; step?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;
  const initialEmail = params.email?.trim().toLowerCase() || "";
  const initialStep =
    params.step === "otp" && initialEmail ? "OTP_RESET" : "SIGN_IN";

  return <SignInFlow initialEmail={initialEmail} initialStep={initialStep} />;
}
