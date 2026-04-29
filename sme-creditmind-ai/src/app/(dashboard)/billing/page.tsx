"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, isApiError } from "@/lib/api";
import { getOrganizationId } from "@/lib/session";

type PlanRow = {
  id: string;
  name: string;
  code: string;
  aiCallsPerMonth: number;
  reportsPerMonth: number;
};

type CurrentSub = {
  planId: string;
  planName: string;
  planCode: string;
  aiLimitPerMonth: number;
  reportsLimitPerMonth: number;
  aiUsedThisMonth: number;
  reportsUsedThisMonth: number;
};

type MeOrg = { id: string; name: string; slug: string; role: string };
type MeResponse = {
  user: { id: string; email: string; full_name: string };
  organizations: MeOrg[];
};

const LIMIT_SHOW_PROGRESS = 500_000;

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function usageBarPercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function BillingPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [current, setCurrent] = useState<CurrentSub | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setPlanNote(null);
    setLoading(true);
    try {
      const orgId = getOrganizationId();
      const [planList, sub, me] = await Promise.all([
        apiFetch<PlanRow[]>("/api/subscription/plans"),
        apiFetch<CurrentSub>("/api/subscription/current"),
        apiFetch<MeResponse>("/api/auth/me"),
      ]);
      setPlans(planList);
      setCurrent(sub);
      const row = me.organizations.find((o) => o.id === orgId);
      setIsOrgAdmin(row?.role === "ORG_ADMIN");
    } catch (e) {
      if (isApiError(e) && e.status === 404) {
        setError(
          "Subscription API not found (404). Ensure BACKEND_INTERNAL_ORIGIN in sme-creditmind-ai/.env.local matches your uvicorn port, then restart npm run dev:win (Windows uses port 8012 by default)."
        );
      } else {
        setError(isApiError(e) ? e.message : "Failed to load billing data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selectPlan = async (planId: string) => {
    if (!isOrgAdmin || !current || planId === current.planId) return;
    setChangingId(planId);
    setPlanNote(null);
    setError(null);
    try {
      const next = await apiFetch<CurrentSub>("/api/subscription/plan", {
        method: "PATCH",
        body: JSON.stringify({ planId }),
      });
      setCurrent(next);
      setPlanNote("Plan updated (demo — no payment).");
    } catch (e) {
      setError(isApiError(e) ? e.message : "Could not change plan.");
    } finally {
      setChangingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing &amp; plans</h1>
        <p className="text-muted-foreground">
          Monthly quotas and subscription tier for your organization (sandbox — plan changes apply
          immediately).
        </p>
      </div>

      {current && !isOrgAdmin && !loading && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Contact your org admin to change plans.
        </p>
      )}

      {planNote && <p className="text-sm text-emerald-700 dark:text-emerald-400">{planNote}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : (
        current && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage this month</CardTitle>
                <CardDescription>
                  AI calls and generated reports counted for your current billing period.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">AI calls</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCount(current.aiUsedThisMonth)} / {formatCount(current.aiLimitPerMonth)}
                    </span>
                  </div>
                  {current.aiLimitPerMonth > LIMIT_SHOW_PROGRESS ? (
                    <p className="text-xs text-muted-foreground">
                      High monthly limit — usage is shown as numbers above.
                    </p>
                  ) : (
                    <Progress
                      value={usageBarPercent(current.aiUsedThisMonth, current.aiLimitPerMonth)}
                      className="h-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Reports</span>
                    <span className="tabular-nums text-muted-foreground">
                      {current.reportsLimitPerMonth <= 0 ? (
                        <>
                          {formatCount(current.reportsUsedThisMonth)} / not included on this plan
                        </>
                      ) : (
                        <>
                          {formatCount(current.reportsUsedThisMonth)} /{" "}
                          {formatCount(current.reportsLimitPerMonth)}
                        </>
                      )}
                    </span>
                  </div>
                  {current.reportsLimitPerMonth <= 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Upgrade to a plan with report quota to generate portfolio PDFs.
                    </p>
                  ) : current.reportsLimitPerMonth > LIMIT_SHOW_PROGRESS ? (
                    <p className="text-xs text-muted-foreground">
                      High monthly limit — usage is shown as numbers above.
                    </p>
                  ) : (
                    <Progress
                      value={usageBarPercent(
                        current.reportsUsedThisMonth,
                        current.reportsLimitPerMonth
                      )}
                      className="h-2"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">{current.planName}</p>
                <p className="text-muted-foreground capitalize">Code: {current.planCode}</p>
                <p className="text-muted-foreground">
                  Up to {formatCount(current.aiLimitPerMonth)} AI calls / month
                  {current.reportsLimitPerMonth > 0
                    ? ` · up to ${formatCount(current.reportsLimitPerMonth)} reports / month`
                    : " · reports not included"}
                </p>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-lg font-semibold mb-3">Available plans</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((p) => {
                  const active = p.id === current.planId;
                  const busy = changingId === p.id;
                  return (
                    <Card key={p.id} className={active ? "ring-2 ring-primary" : undefined}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        <CardDescription className="capitalize">{p.code}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                          {formatCount(p.aiCallsPerMonth)} AI calls / month
                          {p.reportsPerMonth > 0
                            ? ` · ${formatCount(p.reportsPerMonth)} reports / month`
                            : " · no report quota"}
                        </p>
                        <Button
                          className="w-full"
                          variant={active ? "secondary" : "default"}
                          disabled={active || !isOrgAdmin || busy || changingId !== null}
                          onClick={() => selectPlan(p.id)}
                        >
                          {busy ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating…
                            </>
                          ) : active ? (
                            "Current"
                          ) : (
                            "Select plan"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
