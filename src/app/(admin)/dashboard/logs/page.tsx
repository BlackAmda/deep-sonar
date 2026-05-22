import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LogsPageProps {
  searchParams: Promise<{ page?: string; projectId?: string }>;
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const { page: pageParam, projectId } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const limit = 50;

  const where = projectId ? { projectId } : {};

  const [logs, total, projects] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      orderBy: { loggedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { project: { select: { name: true } } },
    }),
    prisma.usageLog.count({ where }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (projectId) params.set("projectId", projectId);
    return `/dashboard/logs?${params.toString()}`;
  }

  function filterUrl(pid: string | undefined) {
    const params = new URLSearchParams();
    params.set("page", "1");
    if (pid) params.set("projectId", pid);
    return `/dashboard/logs?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Logs</h1>
          <p className="text-muted-foreground text-sm">
            Paginated search activity across all projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={!projectId ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={filterUrl(undefined)}>All</Link>
          </Button>
          {projects.map((p) => (
            <Button
              key={p.id}
              variant={projectId === p.id ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={filterUrl(p.id)}>{p.name}</Link>
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{total.toLocaleString()} entries</span>
            <div className="flex items-center gap-1 text-sm font-normal">
              <Button variant="ghost" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? (
                  <Link href={pageUrl(page - 1)}>
                    <ChevronLeft className="size-4" />
                  </Link>
                ) : (
                  <span><ChevronLeft className="size-4" /></span>
                )}
              </Button>
              <span className="text-muted-foreground">
                {page} / {totalPages || 1}
              </span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                {page < totalPages ? (
                  <Link href={pageUrl(page + 1)}>
                    <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <span><ChevronRight className="size-4" /></span>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">Results</TableHead>
                <TableHead className="text-right">Top Score</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    No logs found.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.project.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.query}</TableCell>
                  <TableCell className="text-right">{log.results}</TableCell>
                  <TableCell className="text-right">
                    {log.topScore != null ? log.topScore.toFixed(3) : "-"}
                  </TableCell>
                  <TableCell className="text-right">{log.latencyMs}ms</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {new Date(log.loggedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
