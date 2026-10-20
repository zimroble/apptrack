import { describe, expect, it } from "vitest";
import { applicationSchema, fieldErrors, signupSchema } from "@/lib/validation";

describe("signupSchema", () => {
  it("normalises email and enforces password length", () => {
    const ok = signupSchema.parse({ name: " Ada ", email: " ADA@Example.com ", password: "longenough" });
    expect(ok).toEqual({ name: "Ada", email: "ada@example.com", password: "longenough" });
    const bad = signupSchema.safeParse({ name: "", email: "nope", password: "short" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(Object.keys(fieldErrors(bad.error)).sort()).toEqual(["email", "name", "password"]);
  });
});

describe("applicationSchema", () => {
  it("turns empty optional fields into null and parses dates", () => {
    const a = applicationSchema.parse({
      company: "Shopify", role: "SWE Intern", location: "", url: "", status: "APPLIED", appliedAt: "2026-09-01", notes: "",
    });
    expect(a.location).toBeNull();
    expect(a.url).toBeNull();
    expect(a.notes).toBeNull();
    expect(a.appliedAt).toEqual(new Date("2026-09-01"));
  });

  it("defaults status to WISHLIST", () => {
    expect(applicationSchema.parse({ company: "A", role: "B" }).status).toBe("WISHLIST");
  });

  it("rejects bad input", () => {
    const r = applicationSchema.safeParse({ company: " ", role: "x", url: "javascript:alert(1)", status: "HIRED", appliedAt: "soon" });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(["appliedAt", "company", "status", "url"]);
  });
});
