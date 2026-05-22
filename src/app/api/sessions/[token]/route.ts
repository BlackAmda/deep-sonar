import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function err(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const sessionToken = req.headers.get("x-session-token");
  if (!sessionToken) return err(401, "Missing session token", "MISSING_SESSION_TOKEN");

  const { token } = await params;

  if (token !== sessionToken) {
    return err(401, "Invalid session token", "INVALID_SESSION_TOKEN");
  }

  const session = await prisma.session.findUnique({ where: { id: token } });
  if (!session || session.expiresAt < new Date()) {
    return err(401, "Invalid session token", "INVALID_SESSION_TOKEN");
  }

  await prisma.session.delete({ where: { id: token } });
  return NextResponse.json({ ok: true });
}
