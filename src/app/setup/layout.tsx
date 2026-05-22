import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SetupLayout({ children }: { children: ReactNode }) {
  const count = await prisma.adminUser.count();
  if (count > 0) redirect("/login");
  return <>{children}</>;
}
