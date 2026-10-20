"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { STATUS_LABEL, STATUSES } from "@/lib/status";
import { Field } from "./AuthForm";

export type ApplicationDefaults = {
  company?: string;
  role?: string;
  location?: string | null;
  url?: string | null;
  status?: string;
  appliedAt?: string | null; // yyyy-mm-dd
  notes?: string | null;
};

export function ApplicationForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  defaults?: ApplicationDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const err = state?.errors ?? {};
  const v = { ...defaults, ...(state?.values ?? {}) } as ApplicationDefaults;

  return (
    <form action={formAction} className="card space-y-5 p-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company" error={err.company}>
          <input name="company" className="input" defaultValue={v.company ?? ""} placeholder="Shopify" />
        </Field>
        <Field label="Role" error={err.role}>
          <input name="role" className="input" defaultValue={v.role ?? ""} placeholder="Software Engineering Intern" />
        </Field>
        <Field label="Location" error={err.location}>
          <input name="location" className="input" defaultValue={v.location ?? ""} placeholder="Toronto, ON / Remote" />
        </Field>
        <Field label="Posting link" error={err.url}>
          <input name="url" className="input" defaultValue={v.url ?? ""} placeholder="https://…" />
        </Field>
        <Field label="Status" error={err.status}>
          <select name="status" className="input" defaultValue={v.status ?? "WISHLIST"}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date applied" error={err.appliedAt}>
          <input name="appliedAt" type="date" className="input" defaultValue={v.appliedAt ?? ""} />
        </Field>
      </div>
      <Field label="Notes" error={err.notes}>
        <textarea name="notes" rows={5} className="input" defaultValue={v.notes ?? ""} placeholder="Recruiter, referral, interview prep…" />
      </Field>
      {err.form && <p role="alert" className="text-sm text-rose-600">{err.form}</p>}
      <div className="flex justify-end gap-2">
        <Link href="/board" className="btn-ghost">Cancel</Link>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}
