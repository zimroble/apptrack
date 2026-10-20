"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validation";

export type FormState = { errors?: Record<string, string>; values?: Record<string, string> } | undefined;

// Compared against when the email is unknown so both paths take the same time.
const DUMMY_HASH = "$2b$12$2uZQd89qZ.B4SuQxtoo6HeglaD.gYK/CZ65OZZU/NFmdvklSOE8z2";

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { name: raw.name, email: raw.email } };

  const { name, email, password } = parsed.data;
  try {
    const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
    await createSession(user.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { email: "An account with this email already exists" }, values: { name, email } };
    }
    throw e;
  }
  redirect("/board");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email: raw.email } };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { errors: { form: "Incorrect email or password" }, values: { email: raw.email } };

  await createSession(user.id);
  redirect("/board");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
