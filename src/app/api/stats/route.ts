import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hasPermission } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const actor = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "view:projects"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalProjects, searchesToday, latencyAgg, vectorsAgg] = await Promise.all([
    prisma.project.count({ where: { isActive: true } }),
    prisma.usageLog.count({ where: { loggedAt: { gte: today } } }),
    prisma.usageLog.aggregate({
      where: { loggedAt: { gte: today } },
      _avg: { latencyMs: true },
    }),
    prisma.project.aggregate({ _sum: { vectorCount: true } }),
  ]);

  return NextResponse.json({
    totalProjects,
    searchesToday,
    avgLatencyMs: Math.round(latencyAgg._avg.latencyMs ?? 0),
    totalVectors: vectorsAgg._sum.vectorCount ?? 0,
  });
}
