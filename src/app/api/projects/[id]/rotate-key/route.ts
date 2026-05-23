import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hasPermission } from "@/lib/admin-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "manage:projects"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const project = await prisma.project.findUniqueOrThrow({ where: { id } });
  const apiKey = `ds_${project.slug}_${nanoid(12)}`;
  await prisma.project.update({ where: { id }, data: { apiKey } });
  await prisma.session.deleteMany({ where: { projectId: id } });
  return NextResponse.json({ apiKey });
}
