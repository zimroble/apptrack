#!/usr/bin/env node
/**
 * Server response-time benchmark for the authenticated pages.
 *
 * Signs in as the demo user (run `SEED_COUNT=500 npm run db:seed` first), then
 * uses autocannon to hit /board and /stats with 10 concurrent connections for
 * 15 s each, reporting throughput and latency percentiles.
 *
 *   BASE_URL=http://localhost:3000 npm run bench
 */
import { PrismaClient } from "@prisma/client";
import autocannon from "autocannon";
import { createHash, randomBytes } from "crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DURATION = Number(process.env.DURATION ?? 15);
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 10);

/** Create a session for the demo user directly in the database (same format as lib/auth.ts). */
async function login() {
  const db = new PrismaClient();
  const user = await db.user.findUnique({ where: { email: "demo@apptrack.dev" } });
  if (!user) throw new Error("demo user not found: run `SEED_COUNT=500 npm run db:seed` first");
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: { id: createHash("sha256").update(token).digest("hex"), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
  });
  const apps = await db.application.count({ where: { userId: user.id } });
  await db.$disconnect();
  console.log(`demo user has ${apps} applications; ${DURATION}s per page, ${CONNECTIONS} connections\n`);
  return `apptrack_session=${token}`;
}

function run(path, cookie) {
  return new Promise((resolve, reject) => {
    autocannon(
      { url: `${BASE}${path}`, connections: CONNECTIONS, duration: DURATION, headers: { cookie } },
      (err, r) => (err ? reject(err) : resolve(r)),
    );
  });
}

const cookie = await login();
console.log(`${"page".padEnd(8)} ${"req/s".padStart(8)} ${"p50".padStart(7)} ${"p90".padStart(7)} ${"p99".padStart(7)}  non-2xx`);
for (const path of ["/board", "/stats"]) {
  const r = await run(path, cookie);
  const l = r.latency;
  console.log(
    `${path.padEnd(8)} ${r.requests.average.toFixed(0).padStart(8)} ${`${l.p50}ms`.padStart(7)} ${`${l.p90}ms`.padStart(7)} ${`${l.p99}ms`.padStart(7)}  ${r.non2xx}`,
  );
}
