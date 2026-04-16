"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function resolveHeader(pathname: string): {
  sectionLabel: string;
  sectionHref: string;
  pageLabel: string;
} {
  if (pathname === "/workspace") {
    return {
      sectionLabel: "Điều hành",
      sectionHref: "/workspace",
      pageLabel: "Workspace phiên dịch",
    };
  }

  if (pathname === "/history") {
    return {
      sectionLabel: "Dữ liệu",
      sectionHref: "/history",
      pageLabel: "Lịch sử cuộc họp",
    };
  }

  if (pathname.startsWith("/history/")) {
    return {
      sectionLabel: "Dữ liệu",
      sectionHref: "/history",
      pageLabel: "Chi tiết cuộc họp",
    };
  }

  return {
    sectionLabel: "Điều hành",
    sectionHref: "/workspace",
    pageLabel: "Workspace phiên dịch",
  };
}

export function AppHeader() {
  const pathname = usePathname();
  const meta = resolveHeader(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-border/70 bg-background/95 backdrop-blur-sm">
      <div className="flex w-full items-center gap-2 px-4 md:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-1 data-vertical:h-4 data-vertical:self-auto"
        />

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link href={meta.sectionHref}>{meta.sectionLabel}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{meta.pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
