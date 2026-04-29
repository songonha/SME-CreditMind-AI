"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  FileSearch,
  Bot,
  BarChart3,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  FileUp,
  ClipboardList,
  LogOut,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiFetch, isApiError } from "@/lib/api";
import { clearSession } from "@/lib/session";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Home", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Operations",
    items: [
      { label: "SME profiles", href: "/merchants", icon: Store },
      { label: "Loan queue", href: "/loan-queue", icon: ClipboardList },
      { label: "POS upload", href: "/transaction-upload", icon: FileUp },
      { label: "New assessment", href: "/assess", icon: FileSearch },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "AI assistant", href: "/chat", icon: Bot },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "Billing", href: "/billing", icon: Receipt },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [merchantTotal, setMerchantTotal] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ total: number }>("/api/merchants")
      .then((data) => setMerchantTotal(data.total))
      .catch((e) => {
        if (!isApiError(e)) console.error(e);
        setMerchantTotal(null);
      });
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          CM
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-foreground truncate">
              CreditMind AI
            </h1>
            <p className="text-[10px] text-muted-foreground">Shinhan Bank</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/15"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-2.5",
            collapsed && "justify-center px-2"
          )}
        >
          <CreditCard className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && (
            <div className="min-w-0 flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {merchantTotal !== null ? merchantTotal : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">SMEs</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          clearSession();
          router.replace("/login");
        }}
        className={cn(
          "mx-3 mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
          collapsed && "justify-center mx-2 px-2"
        )}
        title="Sign out"
      >
        <LogOut className="h-5 w-5 shrink-0" />
        {!collapsed && <span>Sign out</span>}
      </button>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center border-t border-border py-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
