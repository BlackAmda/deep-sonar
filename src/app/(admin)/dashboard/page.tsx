import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderOpen, Search, Timer, Database } from "lucide-react";

export default async function OverviewPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalProjects, searchesToday, latencyAgg, vectorsAgg, recentLogs] = await Promise.all([
    prisma.project.count({ where: { isActive: true } }),
    prisma.usageLog.count({ where: { loggedAt: { gte: today } } }),
    prisma.usageLog.aggregate({
      where: { loggedAt: { gte: today } },
      _avg: { latencyMs: true },
    }),
    prisma.project.aggregate({ _sum: { vectorCount: true } }),
    prisma.usageLog.findMany({
      orderBy: { loggedAt: "desc" },
      take: 50,
      include: { project: { select: { name: true } } },
    }),
  ]);

  const stats = [
    { label: "Active Projects", value: totalProjects, icon: FolderOpen },
    { label: "Searches Today", value: searchesToday, icon: Search },
    { label: "Avg Latency (ms)", value: Math.round(latencyAgg._avg.latencyMs ?? 0), icon: Timer },
    { label: "Total Vectors", value: (vectorsAgg._sum.vectorCount ?? 0).toLocaleString(), icon: Database },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-muted-foreground text-sm">Stats and recent search activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
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
              {recentLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No searches yet.
                  </TableCell>
                </TableRow>
              )}
              {recentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.project.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.query}</TableCell>
                  <TableCell className="text-right">{log.results}</TableCell>
                  <TableCell className="text-right">
                    {log.topScore != null ? log.topScore.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-right">{log.latencyMs}ms</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {new Date(log.loggedAt).toLocaleTimeString()}
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
