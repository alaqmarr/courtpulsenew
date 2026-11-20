import { redirect } from "next/navigation";
import { getCurrentUser } from "@courtpulse/auth/auth.helpers";
import { SignUpForm } from "@courtpulse/ui/auth/sign-up-form.component";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <SignUpForm />;
}
