import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embed, OllamaError } from "@/lib/ollama";
import { cosineSimilarity } from "@/lib/cosine";
import { getOrLoad } from "@/lib/vector-cache";
import { loadProjectVectors } from "@/lib/ingest";

function err(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return err(404, "Project not found", "NOT_FOUND");

  const body = (await req.json()) as { q?: string; limit?: number; threshold?: number };
  const q = body.q?.trim();
  if (!q) return err(400, "Missing field: q", "MISSING_QUERY");

  const limit = Math.min(Math.max(body.limit ?? 10, 1), 100);
  const threshold = body.threshold ?? 0.5;

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
      score: Math.round(score * 1e4) / 1e4,
      data,
    })),
    totalResults: results.length,
    latencyMs,
  });
}
