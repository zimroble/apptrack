import { redirect } from "next/navigation";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign up · AppTrack" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/board");
  return <AuthForm mode="signup" action={signup} />;
}
