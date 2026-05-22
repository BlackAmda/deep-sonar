import { type LucideIcon, LayoutDashboard, FolderOpen, ScrollText, Users } from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    items: [
      {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Projects",
        url: "/dashboard/projects",
        icon: FolderOpen,
      },
      {
        title: "Logs",
        url: "/dashboard/logs",
        icon: ScrollText,
      },
    ],
  },
  {
    id: 2,
    label: "Team",
    items: [
      {
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
      },
    ],
  },
];
