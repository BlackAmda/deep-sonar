import { scrypt, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { prisma } from "./prisma";
import type { AdminUser } from "@prisma/client";

const scryptAsync = promisify(scrypt);

export type Permission =
  | "manage:users"
  | "manage:projects"
  | "view:logs"
  | "view:projects";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ["manage:users", "manage:projects", "view:logs", "view:projects"],
  ADMIN: ["manage:projects", "view:logs", "view:projects"],
  VIEWER: ["view:logs", "view:projects"],
};

/** Returns true if `role` is granted `permission` in the built-in role matrix. */
export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

function hmacSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.ADMIN_TOKEN;
  if (!secret) throw new Error("NEXTAUTH_SECRET or ADMIN_TOKEN must be set");
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, storedHash] = stored.split(":");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hash, Buffer.from(storedHash, "hex"));
}

export function signSessionToken(token: string): string {
  const sig = createHmac("sha256", hmacSecret()).update(token).digest("hex");
  return `${token}.${sig}`;
}

/** Verifies HMAC signature on cookie and returns the raw session token, or null if invalid. */
export function extractSessionToken(cookieValue: string): string | null {
  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const token = cookieValue.slice(0, dotIdx);
  const sig = cookieValue.slice(dotIdx + 1);
  const expected = createHmac("sha256", hmacSecret()).update(token).digest("hex");
  if (sig.length !== expected.length || !/^[0-9a-f]+$/.test(sig)) return null;
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  return token;
}

/** Resolves a cookie value to the associated AdminUser, or null if expired/invalid/inactive. */
export async function getSessionUser(
  cookieValue: string | undefined
): Promise<AdminUser | null> {
  if (!cookieValue) return null;
  const token = extractSessionToken(cookieValue);
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { id: token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.isActive) return null;
  return session.user;
}

export async function createAdminSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.adminSession.create({ data: { id: token, userId, expiresAt } });
  return signSessionToken(token);
}
