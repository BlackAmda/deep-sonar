const BASE = () => process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = () => process.env.OLLAMA_MODEL ?? "nomic-embed-text";

export class OllamaError extends Error {}

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${BASE()}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL(), prompt: text }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {
    throw new OllamaError("Ollama unreachable");
  });

  if (!res.ok) throw new OllamaError(`Ollama error: ${res.status} ${res.statusText}`);

  const json = (await res.json()) as { embedding: number[] };
  return json.embedding;
}

export async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE()}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
