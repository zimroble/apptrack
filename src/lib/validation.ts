import { z } from "zod";
import { STATUSES } from "./status";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional();

export const applicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(160),
  location: optionalText(120),
  url: z
    .string()
    .trim()
    .max(500)
    .transform((s) => (s === "" ? null : s))
    .refine((s) => s === null || /^https?:\/\//i.test(s), "Link must start with http:// or https://")
    .nullable()
    .optional(),
  status: z.enum(STATUSES as [string, ...string[]]).default("WISHLIST"),
  appliedAt: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : s))
    .refine((s) => s === null || !Number.isNaN(Date.parse(s)), "Invalid date")
    .transform((s) => (s === null ? null : new Date(s)))
    .nullable()
    .optional(),
  notes: optionalText(5000),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Flatten zod errors into { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
