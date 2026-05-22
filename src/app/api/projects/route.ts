import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

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
  const body = (await req.json()) as {
    name: string;
    slug: string;
    host: string;
    port?: number;
    database: string;
    user: string;
    password: string;
    tableName: string;
    textColumn: string;
    idColumn: string;
    vectorColumn?: string;
  };

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
