import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { isIngestRunning, runIngest } from "@/lib/ingest";
import { isReachable } from "@/lib/ollama";
import { checkRateLimit } from "@/lib/rate-limit";

function err(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(req: NextRequest) {
  const project = await resolveSession(req.headers.get("x-session-token"));
  if (!project) return err(401, "Invalid or missing session token", "INVALID_SESSION_TOKEN");

  if (!checkRateLimit(project.id)) {
    return err(429, "Rate limit exceeded", "RATE_LIMITED");
  }

  if (isIngestRunning(project.id)) {
    return err(409, "Ingest already running for this project", "INGEST_RUNNING");
  }

  if (!(await isReachable())) {
    return err(503, "Ollama is unreachable", "OLLAMA_UNREACHABLE");
  }

  try {
    const result = await runIngest(project.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "INGEST_RUNNING") {
      return err(409, "Ingest already running for this project", "INGEST_RUNNING");
    }
    throw e;
  }
}
