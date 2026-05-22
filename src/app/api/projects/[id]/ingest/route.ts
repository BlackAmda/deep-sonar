import { NextRequest, NextResponse } from "next/server";
import { isIngestRunning, runIngest } from "@/lib/ingest";
import { isReachable } from "@/lib/ollama";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isIngestRunning(id)) {
    return NextResponse.json({ error: "Ingest already running", code: "INGEST_RUNNING" }, { status: 409 });
  }

  if (!(await isReachable())) {
    return NextResponse.json({ error: "Ollama is unreachable", code: "OLLAMA_UNREACHABLE" }, { status: 503 });
  }

  try {
    const result = await runIngest(id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "INGEST_RUNNING") {
      return NextResponse.json({ error: "Ingest already running", code: "INGEST_RUNNING" }, { status: 409 });
    }
    throw e;
  }
}
