import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/admin-auth";

function err(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!user) return err(401, "Unauthorized");

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!user) return err(401, "Unauthorized");

  const body = (await req.json()) as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return err(400, "Name cannot be empty");
    updates.name = name;
  }

  if (body.newPassword !== undefined) {
    if (!body.currentPassword) return err(400, "Current password required");
    if (body.newPassword.length < 8) return err(400, "Password must be at least 8 characters");

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) return err(403, "Current password incorrect");

    updates.passwordHash = await hashPassword(body.newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return err(400, "Nothing to update");
  }

  const updated = await prisma.adminUser.update({
    where: { id: user.id },
    data: updates,
  });

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
  });
}
