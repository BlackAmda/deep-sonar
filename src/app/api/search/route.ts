import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embed, OllamaError } from "@/lib/ollama";
import { cosineSimilarity } from "@/lib/cosine";
import { getOrLoad } from "@/lib/vector-cache";
import { loadProjectVectors } from "@/lib/ingest";
import { resolveSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

function err(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function GET(req: NextRequest) {
  const project = await resolveSession(req.headers.get("x-session-token"));
  if (!project) return err(401, "Invalid or missing session token", "INVALID_SESSION_TOKEN");

  if (!checkRateLimit(project.id)) {
    return err(429, "Rate limit exceeded", "RATE_LIMITED");
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  if (!q) return err(400, "Missing required parameter: q", "MISSING_QUERY");

  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "10", 10), 1), 100);
  const threshold = parseFloat(searchParams.get("threshold") ?? "0.65");

  const start = Date.now();

  let queryVector: number[];
  try {
    queryVector = await embed(q);
  } catch (e) {
    if (e instanceof OllamaError) return err(503, "Ollama is unreachable", "OLLAMA_UNREACHABLE");
    throw e;
  }

  const vectors = await getOrLoad(project.id, () => loadProjectVectors(project));

  const results = vectors
    .map((row) => ({ id: row.id, data: row.data, score: cosineSimilarity(queryVector, row.embedding) }))
    .filter((row) => row.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const latencyMs = Date.now() - start;

  await prisma.usageLog.create({
    data: {
      projectId: project.id,
      query: q.slice(0, 1000),
      results: results.length,
      topScore: results[0]?.score ?? null,
      latencyMs,
    },
  });

  return NextResponse.json({
    query: q,
    results: results.map(({ id, score, data }) => ({
      id,
      score: Math.round(score * 1e6) / 1e6,
      data,
    })),
    totalResults: results.length,
    latencyMs,
  });
}
