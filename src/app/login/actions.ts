"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createAdminSession } from "@/lib/admin-auth";

export async function loginAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  if (!email || !password) {
    return { error: "Email and password required" };
  }

  // First-run: no users exist yet
  const userCount = await prisma.adminUser.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return { error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  const signedToken = await createAdminSession(user.id);

  const cookieStore = await cookies();
  cookieStore.set("admin_session", signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/dashboard");
}
