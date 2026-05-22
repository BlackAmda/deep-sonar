import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

setInterval(async () => {
  const cutoff = new Date();
  await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    prisma.adminSession.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
  ]);
}, 60 * 60 * 1000);
