"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "signup";
  action: (state: FormState, form: FormData) => Promise<FormState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const err = state?.errors ?? {};
  const isSignup = mode === "signup";

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-xl bg-accent font-semibold text-white">A</span>
          <h1 className="text-2xl font-semibold tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isSignup ? "Track every application from wishlist to offer." : "Log in to see your pipeline."}
          </p>
        </div>
        <form action={formAction} className="card space-y-4 p-6" noValidate>
          {isSignup && (
            <Field label="Name" error={err.name}>
              <input name="name" className="input" autoComplete="name" defaultValue={state?.values?.name} />
            </Field>
          )}
          <Field label="Email" error={err.email}>
            <input name="email" type="email" className="input" autoComplete="email" defaultValue={state?.values?.email} />
          </Field>
          <Field label="Password" error={err.password}>
            <input
              name="password"
              type="password"
              className="input"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </Field>
          {err.form && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {err.form}
            </p>
          )}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-accent hover:underline">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
