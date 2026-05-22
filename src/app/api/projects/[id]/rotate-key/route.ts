import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUniqueOrThrow({ where: { id } });
  const apiKey = `ds_${project.slug}_${nanoid(12)}`;
  await prisma.project.update({ where: { id }, data: { apiKey } });
  await prisma.session.deleteMany({ where: { projectId: id } });
  return NextResponse.json({ apiKey });
}
