"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api";
import {
  clearSession,
  getOrganizationId,
  getUserEmail,
  setOrganizationId,
} from "@/lib/session";

type MeResponse = {
  user: { id: string; email: string; full_name: string };
  organizations: { id: string; name: string; slug: string; role: string }[];
};

export function Header() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<MeResponse["organizations"]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    setEmail(getUserEmail());
    setOrgId(getOrganizationId());
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<MeResponse>("/api/auth/me");
        if (cancelled) return;
        setOrgs(me.organizations);
        setEmail(me.user.email);
        const current = getOrganizationId();
        if (!current && me.organizations[0]) {
          setOrganizationId(me.organizations[0].id);
          setOrgId(me.organizations[0].id);
          router.refresh();
        }
      } catch {
        /* session may be invalid */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const activeOrgName = orgs.find((o) => o.id === orgId)?.name ?? "Organization";

  const onSignOut = () => {
    clearSession();
    router.replace("/login");
  };

  const onSwitchOrg = (id: string) => {
    setOrganizationId(id);
    setOrgId(id);
    router.refresh();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SMEs…"
            className="pl-10 h-9 bg-muted/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {orgs.length > 1 && (
          <select
            className="text-sm border rounded-md px-2 py-1.5 bg-background max-w-[180px]"
            value={orgId ?? ""}
            onChange={(e) => onSwitchOrg(e.target.value)}
            aria-label="Active organization"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {(email ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium leading-none truncate max-w-[140px]">
                {email ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{activeOrgName}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              {activeOrgName}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
