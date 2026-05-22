import { prisma } from "./prisma";
import type { Project } from "@prisma/client";

export async function resolveSession(token: string | null): Promise<Project | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { project: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.project;
}
