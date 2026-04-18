"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  FileSearch,
  Bot,
  BarChart3,
  Camera,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Live POS Capture", href: "/live-pos-capture", icon: Camera },
  { label: "Merchants", href: "/merchants", icon: Store },
  { label: "New Assessment", href: "/assess", icon: FileSearch },
  { label: "AI Co-Pilot", href: "/chat", icon: Bot },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0046FF] text-white font-bold text-sm">
          CM
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-foreground truncate">
              CreditMind AI
            </h1>
            <p className="text-[10px] text-muted-foreground">
              Shinhan Bank
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#0046FF]/10 text-[#0046FF]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className={cn(
          "flex items-center gap-3 rounded-lg bg-gradient-to-r from-[#0046FF]/5 to-[#0046FF]/10 px-3 py-3",
          collapsed && "justify-center px-2"
        )}>
          <CreditCard className="h-5 w-5 shrink-0 text-[#0046FF]" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">SME Portfolio</p>
              <p className="text-[10px] text-muted-foreground">247 merchants</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center border-t border-border py-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
