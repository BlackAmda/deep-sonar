import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const TTL = () => Number(process.env.SESSION_TTL_SECONDS ?? 3600) * 1000;

function err(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return err(401, "Missing API key", "MISSING_API_KEY");

  if (!checkRateLimit(apiKey)) {
    return err(429, "Rate limit exceeded", "RATE_LIMITED");
  }

  const project = await prisma.project.findUnique({ where: { apiKey } });
  if (!project) return err(401, "Invalid API key", "INVALID_API_KEY");
  if (!project.isActive) return err(403, "Project is inactive", "PROJECT_INACTIVE");

  const token = `sess_${nanoid(16)}`;
  const expiresAt = new Date(Date.now() + TTL());

  await prisma.session.create({
    data: { id: token, projectId: project.id, expiresAt },
  });

  return NextResponse.json({
    token,
    projectId: project.id,
    projectName: project.name,
    expiresAt: expiresAt.toISOString(),
  });
}
