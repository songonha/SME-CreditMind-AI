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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  /** When API is unreachable, we show embedded demo stats so the page is never stuck on the spinner. */
  const [usingDemoData, setUsingDemoData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DashboardStats>("/api/dashboard/stats")
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setUsingDemoData(false);
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
          setStats(demoDashboardStats);
          setUsingDemoData(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0046FF]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Dashboard data could not be loaded.
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Merchants",
      value: stats.totalMerchants,
      icon: Store,
      color: "text-[#0046FF]",
      bg: "bg-[#0046FF]/10",
    },
    {
      title: "Approved",
      value: stats.totalApproved,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Under Review",
      value: stats.totalReview,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Avg Credit Score",
      value: stats.avgScore,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Portfolio Value",
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
          <span className="font-medium">Demo data.</span> The API is unavailable or{" "}
          <code className="rounded bg-background/80 px-1 py-0.5 text-xs">NEXT_PUBLIC_API_URL</code> is not
          set. Showing sample portfolio stats. Start the backend and configure the env var for live data.
        </div>
      ) : null}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your SME lending portfolio and recent assessments.
        </p>
      </div>

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
            <CardTitle className="text-base">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={stats.scoreDistribution} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Grade Distribution</CardTitle>
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
            <CardTitle className="text-base">Active Alerts</CardTitle>
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
          <CardTitle className="text-base">Recent Assessments</CardTitle>
          <Link href="/merchants">
            <Button variant="outline" size="sm">
              View All
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-right">Pre-Approved Limit</TableHead>
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
