import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionCookieSync } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;

  if (cookie) {
    const token = verifySessionCookieSync(cookie);
    if (token) {
      await prisma.adminSession.deleteMany({ where: { id: token } });
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("admin_session");

  return NextResponse.json({ ok: true });
}
