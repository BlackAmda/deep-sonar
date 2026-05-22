"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, createAdminSession } from "@/lib/admin-auth";

export async function setupAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const name = ((formData.get("name") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  if (!name || !email || !password) {
    return { error: "All fields required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    redirect("/login");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.adminUser.create({
    data: { name, email, passwordHash, role: "SUPER_ADMIN" },
  });

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
