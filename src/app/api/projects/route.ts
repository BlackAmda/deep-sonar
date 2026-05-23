import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getSessionUser, hasPermission } from "@/lib/admin-auth";
import { z } from "zod";

const SQL_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

const ProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  tableName: z.string().regex(SQL_IDENTIFIER, "must be a valid SQL identifier"),
  textColumn: z.string().regex(SQL_IDENTIFIER, "must be a valid SQL identifier"),
  idColumn: z.string().regex(SQL_IDENTIFIER, "must be a valid SQL identifier"),
  vectorColumn: z.string().regex(SQL_IDENTIFIER, "must be a valid SQL identifier").optional(),
});

export async function GET() {
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

  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      apiKey: p.apiKey,
      tableName: p.tableName,
      textColumn: p.textColumn,
      idColumn: p.idColumn,
      vectorColumn: p.vectorColumn,
      vectorCount: p.vectorCount,
      lastIngestedAt: p.lastIngestedAt,
      isActive: p.isActive,
      createdAt: p.createdAt,
      searchesToday: p._count.usageLogs,
    }))
  );
}

export async function POST(req: NextRequest) {
  const actor = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "manage:projects"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = ProjectSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });

  const body = parsed.data;
  const slug = body.slug.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const apiKey = `ds_${slug}_${nanoid(12)}`;

  const dbConfigEnc = encrypt(
    JSON.stringify({
      host: body.host,
      port: body.port ?? 3306,
      user: body.user,
      password: body.password,
      database: body.database,
    })
  );

  const project = await prisma.project.create({
    data: {
      name: body.name,
      slug,
      apiKey,
      dbConfigEnc,
      tableName: body.tableName,
      textColumn: body.textColumn,
      idColumn: body.idColumn,
      vectorColumn: body.vectorColumn ?? "embedding",
    },
  });

  return NextResponse.json({ id: project.id, apiKey, name: project.name }, { status: 201 });
}
