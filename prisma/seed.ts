/**
 * Seeds a demo account with realistic-looking applications and status history.
 *
 *   npm run db:seed                 # 60 applications
 *   SEED_COUNT=500 npm run db:seed  # bigger dataset (used by the benchmark)
 *
 * Login: demo@apptrack.dev / demo-password
 */
import { PrismaClient, type Status } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const COUNT = Number(process.env.SEED_COUNT ?? 60);
const DAY = 86_400_000;

const COMPANIES = [
  "Shopify", "Wealthsimple", "RBC", "TD", "Scotiabank", "CIBC", "Google", "Microsoft", "Amazon", "Meta", "Apple",
  "Stripe", "Cohere", "Ada", "Wattpad", "Faire", "Clio", "Ecobee", "Kinaxis", "OpenText", "Ciena", "Nokia",
  "Qualcomm", "AMD", "Intel", "NVIDIA", "Tesla", "Bloomberg", "Citadel", "Jane Street", "IBM", "SAP", "Salesforce",
  "Uber", "Lyft", "Instacart", "DoorDash", "Coinbase", "Databricks", "Snowflake",
];
const ROLES = [
  "Software Engineering Intern", "Backend Developer Intern", "Full-Stack Developer Intern", "Embedded Software Intern",
  "Firmware Engineering Intern", "Data Engineering Intern", "Machine Learning Intern", "Hardware Engineering Intern",
];
const LOCATIONS = ["Toronto, ON", "Waterloo, ON", "Ottawa, ON", "Montreal, QC", "Vancouver, BC", "Remote", "New York, NY"];

// Deterministic PRNG (mulberry32) so the demo data is the same every run.
let seed = 42;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

/** A plausible status path for one application. */
function journey(): Status[] {
  if (rand() < 0.12) return ["WISHLIST"];
  const path: Status[] = ["APPLIED"];
  const r = rand();
  if (r < 0.55) return path; // no response yet
  if (r < 0.75) return [...path, "REJECTED"];
  if (rand() < 0.5) {
    path.push("ASSESSMENT");
    if (rand() < 0.3) return path; // waiting on assessment results
  }
  if (rand() < 0.3) return [...path, "REJECTED"];
  path.push("INTERVIEW");
  if (rand() < 0.35) return path; // still interviewing
  const end = rand();
  if (end < 0.3) path.push("OFFER");
  else if (end < 0.85) path.push("REJECTED");
  else if (end < 0.9) path.push("WITHDRAWN");
  return path;
}

async function main() {
  await db.user.deleteMany({ where: { email: "demo@apptrack.dev" } });
  const user = await db.user.create({
    data: { email: "demo@apptrack.dev", name: "Demo Student", passwordHash: await bcrypt.hash("demo-password", 12) },
  });

  const now = Date.now();
  const positions = new Map<Status, number>();
  for (let i = 0; i < COUNT; i++) {
    const path = journey();
    const created = now - Math.floor(rand() * 80 + 2) * DAY;
    let t = created;
    const events = path.map((to, j) => {
      if (j > 0) t = Math.min(now, t + Math.floor(rand() * 12 + 2) * DAY);
      return { from: j === 0 ? null : path[j - 1], to, at: new Date(t) };
    });
    const status = path.at(-1)!;
    const pos = (positions.get(status) ?? 0) + 1024;
    positions.set(status, pos);
    await db.application.create({
      data: {
        userId: user.id,
        company: pick(COMPANIES),
        role: pick(ROLES),
        location: pick(LOCATIONS),
        status,
        appliedAt: status === "WISHLIST" ? null : new Date(created),
        position: pos,
        createdAt: new Date(created),
        events: { create: events },
      },
    });
  }
  console.log(`seeded ${COUNT} applications for demo@apptrack.dev`);
}

main().finally(() => db.$disconnect());
