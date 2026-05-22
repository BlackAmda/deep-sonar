import { notFound } from "next/navigation";
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
import { decrypt } from "@/lib/crypto";
import { UsageChart } from "@/components/projects/usage-chart";
import { SearchTester } from "@/components/projects/search-tester";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const dbConfig = JSON.parse(decrypt(project.dbConfigEnc)) as {
    host: string;
    port: number;
    user: string;
    database: string;
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentLogs, allLogs] = await Promise.all([
    prisma.usageLog.findMany({
      where: { projectId: id },
      orderBy: { loggedAt: "desc" },
      take: 50,
    }),
    prisma.usageLog.findMany({
      where: { projectId: id, loggedAt: { gte: thirtyDaysAgo } },
      select: { loggedAt: true },
    }),
  ]);

  // Group by day for chart
  const countsByDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    countsByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const log of allLogs) {
    const day = new Date(log.loggedAt).toISOString().slice(0, 10);
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }
  const chartData = Array.from(countsByDay.entries()).map(([day, count]) => ({ day, count }));

  const configRows = [
    { label: "Host", value: dbConfig.host },
    { label: "Port", value: String(dbConfig.port) },
    { label: "Database", value: dbConfig.database },
    { label: "User", value: dbConfig.user },
    { label: "Password", value: "••••••••" },
    { label: "Table", value: project.tableName },
    { label: "Text Column", value: project.textColumn },
    { label: "ID Column", value: project.idColumn },
    { label: "Vector Column", value: project.vectorColumn },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <Badge variant={project.isActive ? "default" : "secondary"}>
              {project.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-xs mt-1">{project.slug}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{project.vectorCount.toLocaleString()} vectors</p>
          <p>
            Last ingested:{" "}
            {project.lastIngestedAt
              ? new Date(project.lastIngestedAt).toLocaleString()
              : "Never"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {configRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="text-muted-foreground w-36">{row.label}</TableCell>
                    <TableCell className="font-mono text-sm">{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Searches per Day (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      <SearchTester projectId={id} textColumn={project.textColumn} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Search Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No searches yet.
                  </TableCell>
                </TableRow>
              )}
              {recentLogs.map((log) => (
                <TableRow key={log.id}>
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
