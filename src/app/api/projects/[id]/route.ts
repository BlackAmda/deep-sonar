import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { invalidate } from "@/lib/vector-cache";

type Params = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json({ error: "Project not found", code: "NOT_FOUND" }, { status: 404 });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return notFound();

  const dbConfig = JSON.parse(decrypt(project.dbConfigEnc)) as {
    host: string; port: number; user: string; database: string;
  };

  return NextResponse.json({
    id: project.id,
    name: project.name,
    slug: project.slug,
    apiKey: project.apiKey,
    tableName: project.tableName,
    textColumn: project.textColumn,
    idColumn: project.idColumn,
    vectorColumn: project.vectorColumn,
    vectorCount: project.vectorCount,
    lastIngestedAt: project.lastIngestedAt,
    isActive: project.isActive,
    createdAt: project.createdAt,
    dbHost: dbConfig.host,
    dbPort: dbConfig.port,
    dbName: dbConfig.database,
    dbUser: dbConfig.user,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const updateData: Record<string, unknown> = {};
  if (body.name) updateData.name = body.name;
  if (body.tableName) updateData.tableName = body.tableName;
  if (body.textColumn) updateData.textColumn = body.textColumn;
  if (body.idColumn) updateData.idColumn = body.idColumn;
  if (body.vectorColumn) updateData.vectorColumn = body.vectorColumn;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  if (body.host || body.user || body.password || body.database || body.port) {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return notFound();
    const current = JSON.parse(decrypt(existing.dbConfigEnc)) as Record<string, unknown>;
    updateData.dbConfigEnc = encrypt(
      JSON.stringify({
        host: body.host ?? current.host,
        port: body.port ?? current.port,
        user: body.user ?? current.user,
        password: body.password ?? current.password,
        database: body.database ?? current.database,
      })
    );
    invalidate(id);
  }

  await prisma.project.update({ where: { id }, data: updateData });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  invalidate(id);
  return NextResponse.json({ ok: true });
}
