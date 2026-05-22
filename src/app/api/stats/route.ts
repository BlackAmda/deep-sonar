import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
