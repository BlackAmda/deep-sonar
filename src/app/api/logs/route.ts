import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const projectId = searchParams.get("projectId") ?? undefined;

  const where = projectId ? { projectId } : {};

  const [logs, total] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      orderBy: { loggedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { project: { select: { name: true } } },
    }),
    prisma.usageLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      projectName: l.project.name,
      query: l.query,
      results: l.results,
      topScore: l.topScore,
      latencyMs: l.latencyMs,
      loggedAt: l.loggedAt,
    })),
    total,
    page,
  });
}
