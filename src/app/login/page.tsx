import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Log in · AppTrack" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/board");
  return <AuthForm mode="login" action={login} />;
}
