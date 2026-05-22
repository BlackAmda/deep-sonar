import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReachable } from "@/lib/ollama";

export async function GET() {
  const [ollamaOk, dbOk] = await Promise.all([
    isReachable(),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);

  return NextResponse.json({
    status: ollamaOk && dbOk ? "ok" : "degraded",
    ollama: ollamaOk ? "reachable" : "unreachable",
    db: dbOk ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
  });
}
