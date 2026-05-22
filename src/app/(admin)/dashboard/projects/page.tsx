import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegisterProjectSheet } from "@/components/projects/register-project-sheet";
import { ProjectActions } from "@/components/projects/project-actions";

export default async function ProjectsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { usageLogs: { where: { loggedAt: { gte: today } } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Registered projects, API keys, and ingest controls.
          </p>
        </div>
        <RegisterProjectSheet />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Table</TableHead>
                <TableHead className="text-right">Vectors</TableHead>
                <TableHead className="text-right">Searches Today</TableHead>
                <TableHead>Last Ingested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No projects yet. Register one to get started.
                  </TableCell>
                </TableRow>
              )}
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Button variant="link" asChild className="p-0 h-auto font-medium">
                      <Link href={`/dashboard/projects/${p.id}`}>{p.name}</Link>
                    </Button>
                    <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.tableName}</TableCell>
                  <TableCell className="text-right">{p.vectorCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{p._count.usageLogs}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.lastIngestedAt
                      ? new Date(p.lastIngestedAt).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "default" : "secondary"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProjectActions
                      projectId={p.id}
                      projectName={p.name}
                      apiKey={p.apiKey}
                    />
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
