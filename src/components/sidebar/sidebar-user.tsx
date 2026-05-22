"use client";

import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/authed-fetch";
import { LogOut, User } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarUserProps {
  name: string;
  email: string;
  role: string;
}

export function SidebarUser({ name, email, role }: SidebarUserProps) {
  const router = useRouter();

  async function logout() {
    await authedFetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-auto py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="size-4" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium truncate">{name}</span>
                <span className="text-xs text-muted-foreground truncate">{role.replace("_", " ")}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
