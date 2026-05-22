import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword, hasPermission } from "@/lib/admin-auth";

function err(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!actor) return err(401, "Unauthorized");
  if (!hasPermission(actor.role, "manage:users")) return err(403, "Forbidden");

  const { id } = await params;
  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return err(404, "User not found");

  const body = (await req.json()) as {
    name?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
  };

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.role !== undefined) {
    if (!["SUPER_ADMIN", "ADMIN", "VIEWER"].includes(body.role)) return err(400, "Invalid role");
    // Prevent demoting the last SUPER_ADMIN
    if (target.role === "SUPER_ADMIN" && body.role !== "SUPER_ADMIN") {
      const superCount = await prisma.adminUser.count({ where: { role: "SUPER_ADMIN" } });
      if (superCount <= 1) return err(409, "Cannot demote the last SUPER_ADMIN");
    }
    updates.role = body.role;
  }
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.password !== undefined) {
    if (body.password.length < 8) return err(400, "Password must be at least 8 characters");
    updates.passwordHash = await hashPassword(body.password);
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data: updates,
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!actor) return err(401, "Unauthorized");
  if (!hasPermission(actor.role, "manage:users")) return err(403, "Forbidden");

  const { id } = await params;
  if (id === actor.id) return err(409, "Cannot delete your own account");

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return err(404, "User not found");

  if (target.role === "SUPER_ADMIN") {
    const superCount = await prisma.adminUser.count({ where: { role: "SUPER_ADMIN" } });
    if (superCount <= 1) return err(409, "Cannot delete the last SUPER_ADMIN");
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
