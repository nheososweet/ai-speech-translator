"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Clock3Icon, MicIcon, TerminalIcon } from "lucide-react";

const appNav = {
  main: [
    {
      title: "Phiên dịch",
      href: "/workspace",
      icon: MicIcon,
    },
    {
      title: "Lịch sử cuộc họp",
      href: "/history",
      icon: Clock3Icon,
    },
  ],
  support: [
    // {
    //   title: "Mẫu biên bản",
    //   href: "/history",
    //   icon: FileTextIcon,
    // },
    // {
    //   title: "Nhật ký email",
    //   href: "/history",
    //   icon: MailIcon,
    // },
  ],
  user: {
    name: "Điều phối viên",
    role: "Trung tâm phiên dịch",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    Hệ thống phiên dịch
                  </span>
                  <span className="truncate text-xs">Âm thanh thông minh</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {appNav.main.map((item) => {
                const isActive =
                  item.href === "/history"
                    ? pathname.startsWith("/history")
                    : pathname === item.href;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Tiện ích nhanh</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {appNav.support.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-xs">
          <p className="font-semibold text-sidebar-foreground">
            {appNav.user.name}
          </p>
          <p className="text-sidebar-foreground/70">{appNav.user.role}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
