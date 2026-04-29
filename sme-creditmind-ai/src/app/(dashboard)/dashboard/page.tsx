"use client";

import { useState, useEffect } from "react";
import {
  Store,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Eye,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreDistributionChart } from "@/components/charts/ScoreDistributionChart";
import { RiskDistribution } from "@/components/charts/RiskDistribution";
import { GradeBadge, RecommendationBadge, ScoreDisplay } from "@/components/shared/RiskBadge";
import { formatVND, formatDateTime } from "@/lib/format";
import { apiFetch, isApiError } from "@/lib/api";
import { dashboardStats as demoDashboardStats } from "@/lib/mock-data";
import type { DashboardStats } from "@/types/dashboard";

type LoanCaseRow = {
  id: string;
  merchantId: string;
  status: string;
  decisionNote: string;
  createdAt: string;
  updatedAt: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  /** When API fails with network/5xx, we show embedded demo stats so the page is not stuck on the spinner. */
  const [usingDemoData, setUsingDemoData] = useState(false);
  /** Auth or hard failures: do not pretend demo rows are real merchants. */
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loanCasePreview, setLoanCasePreview] = useState<LoanCaseRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DashboardStats>("/api/dashboard/stats")
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setUsingDemoData(false);
          setFetchError(null);
        }
      })
      .catch((error) => {
        if (isApiError(error)) {
          console.error("Dashboard API error:", {
            code: error.code,
            status: error.status,
            message: error.message,
          });
        } else {
          console.error(error);
        }
        if (!cancelled) {
          if (isApiError(error) && (error.status === 401 || error.status === 403)) {
            setStats(null);
            setUsingDemoData(false);
            setFetchError(error.message);
          } else {
            setStats(demoDashboardStats);
            setUsingDemoData(true);
            setFetchError(null);
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<LoanCaseRow[]>("/api/loan-cases")
      .then((rows) => {
        if (cancelled) return;
        const open = rows.filter((r) => r.status === "DRAFT" || r.status === "IN_REVIEW");
        setLoanCasePreview(open.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setLoanCasePreview([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive space-y-3">
        <p className="font-medium">Could not load the dashboard.</p>
        <p>{fetchError ?? "Dashboard data could not be loaded."}</p>
        <p className="text-muted-foreground">
          If your session expired,{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            sign in again
          </Link>
          .
        </p>
      </div>
    );
  }

  const statCards = [
    {
      title: "SME",
      value: stats.totalMerchants,
      icon: Store,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Approved",
      value: stats.totalApproved,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "In review",
      value: stats.totalReview,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Avg score",
      value: stats.avgScore,
      icon: TrendingUp,
      color: "text-sky-700",
      bg: "bg-sky-50",
    },
    {
      title: "Portfolio value",
      value: formatVND(stats.totalPortfolioValue),
      icon: Wallet,
      color: "text-violet-600",
      bg: "bg-violet-50",
      isFormatted: true,
    },
    {
      title: "Declined",
      value: stats.totalDeclined,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      {usingDemoData ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          <p>
            <span className="font-semibold">Showing sample data</span> — the dashboard API did not respond; figures
            illustrate the UI only and are not your real data.{" "}
            <a href="#mock-dashboard-explainer" className="text-primary font-medium underline-offset-2 hover:underline">
              Details
            </a>
          </p>
          <details id="mock-dashboard-explainer" className="mt-2 text-xs opacity-90 scroll-mt-20">
            <summary className="cursor-pointer font-medium select-none">Why am I seeing sample data?</summary>
            <p className="mt-2 pl-1 border-l-2 border-amber-300/60">
              Check the backend and the <code className="rounded bg-background/80 px-1">/api/dashboard/stats</code>{" "}
              endpoint. Other pages still call the live API; if your SME list is empty, run seed or create a merchant.
            </p>
          </details>
        </div>
      ) : null}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio overview</h1>
        <p className="text-muted-foreground">SMEs, credit scores, and today&apos;s priorities.</p>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s priorities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  High-priority alerts
                </p>
                {stats.alerts.filter((a) => a.severity === "high").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open high-priority alerts.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.alerts
                      .filter((a) => a.severity === "high")
                      .map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/merchants/${a.merchantId}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {a.merchantName}
                          </Link>
                          <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Files needing review
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-semibold tabular-nums">{stats.totalReview}</span> file(s) in{" "}
                  <span className="font-medium">review</span>.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/merchants?filter=review">
                    <Button size="sm" variant="outline" className="h-8">
                      Review list
                    </Button>
                  </Link>
                  <Link href="/loan-queue">
                    <Button size="sm" className="h-8">
                      Loan queue
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            {loanCasePreview.length > 0 ? (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Open loan cases
                </p>
                <ul className="space-y-1.5">
                  {loanCasePreview.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        Case <code className="rounded bg-muted px-1 text-xs">{c.id}</code> —{" "}
                        <span className="font-medium text-foreground">{c.status}</span>
                      </span>
                      <Link href={`/merchants/${c.merchantId}`}>
                        <Button variant="link" className="h-auto p-0 text-primary">
                          Open merchant
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight">
                {stat.isFormatted ? stat.value : typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={stats.scoreDistribution} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk grade distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <RiskDistribution data={stats.gradeDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      alert.severity === "high"
                        ? "bg-red-500"
                        : alert.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{alert.merchantName}</span>
                      <Badge
                        variant="outline"
                        className={
                          alert.severity === "high"
                            ? "text-red-600 border-red-200"
                            : alert.severity === "medium"
                            ? "text-amber-600 border-amber-200"
                            : "text-blue-600 border-blue-200"
                        }
                      >
                        {alert.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  <Link href={`/merchants/${alert.merchantId}`}>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Assessments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Recent assessments
            {usingDemoData ? (
              <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-300">(sample)</span>
            ) : null}
          </CardTitle>
          <Link href="/merchants">
            <Button variant="outline" size="sm">
              View all
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SME</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-right">Suggested limit</TableHead>
                <TableHead className="text-center">Decision</TableHead>
                <TableHead className="text-right">Assessed</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentAssessments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.merchantName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.category}</TableCell>
                  <TableCell className="text-center">
                    <ScoreDisplay score={a.score} size="sm" />
                  </TableCell>
                  <TableCell className="text-center">
                    <GradeBadge grade={a.grade} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {a.preApprovedLimit > 0 ? formatVND(a.preApprovedLimit) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <RecommendationBadge recommendation={a.recommendation} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDateTime(a.assessedAt)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/merchants/${a.merchantId}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
