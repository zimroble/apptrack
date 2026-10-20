import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://apptrack:apptrack@localhost:5432/apptrack_test";
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
  const db = new PrismaClient({ datasourceUrl: url });
  await db.$executeRawUnsafe('TRUNCATE "User", "Session", "Application", "StatusEvent" CASCADE');
  await db.$disconnect();
}
