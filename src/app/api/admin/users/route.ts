import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword, hasPermission } from "@/lib/admin-auth";

function err(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  const actor = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!actor) return err(401, "Unauthorized");
  if (!hasPermission(actor.role, "manage:users")) return err(403, "Forbidden");

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const actor = await getSessionUser(req.cookies.get("admin_session")?.value);
  if (!actor) return err(401, "Unauthorized");
  if (!hasPermission(actor.role, "manage:users")) return err(403, "Forbidden");

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const role = body.role ?? "VIEWER";

  if (!name || !email || !password) return err(400, "name, email, and password required");
  if (password.length < 8) return err(400, "Password must be at least 8 characters");
  if (!["SUPER_ADMIN", "ADMIN", "VIEWER"].includes(role)) return err(400, "Invalid role");

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return err(409, "Email already in use");

  const user = await prisma.adminUser.create({
    data: { name, email, passwordHash: await hashPassword(password), role: role as never },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
