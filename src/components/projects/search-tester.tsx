"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/authed-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SearchResult = {
  id: string | number;
  score: number;
  data: Record<string, unknown>;
};

type SearchResponse = {
  query: string;
  results: SearchResult[];
  totalResults: number;
  latencyMs: number;
};

interface SearchTesterProps {
  projectId: string;
  textColumn: string;
}

export function SearchTester({ projectId, textColumn }: SearchTesterProps) {
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState("0.5");
  const [limit, setLimit] = useState("10");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await authedFetch(`/api/projects/${projectId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q,
          threshold: parseFloat(threshold) || 0.5,
          limit: parseInt(limit, 10) || 10,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Unknown error");
        return;
      }

      setResponse(json as SearchResponse);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  function scoreColor(score: number) {
    if (score >= 0.75) return "default";
    if (score >= 0.6) return "secondary";
    return "outline";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Tester</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search query…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="flex-1"
          />
          <Input
            placeholder="Threshold"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-24"
          />
          <Input
            placeholder="Limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-20"
          />
          <Button onClick={runSearch} disabled={loading || !query.trim()}>
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {response && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {response.totalResults} results · {response.latencyMs}ms
            </p>
            {response.totalResults === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No results above threshold.
              </p>
            )}
            {response.results.map((r) => (
              <div
                key={String(r.id)}
                className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium truncate">
                    {String(r.data[textColumn] ?? r.id)}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    id: {r.id}
                  </span>
                </div>
                <Badge variant={scoreColor(r.score)} className="shrink-0 tabular-nums">
                  {r.score.toFixed(4)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
