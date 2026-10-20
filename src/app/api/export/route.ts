import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/status";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const apps = await db.application.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const csv = toCsv(
    ["Company", "Role", "Location", "Status", "Applied", "Link", "Notes", "Created"],
    apps.map((a) => [a.company, a.role, a.location, STATUS_LABEL[a.status], a.appliedAt, a.url, a.notes, a.createdAt]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="applications-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
