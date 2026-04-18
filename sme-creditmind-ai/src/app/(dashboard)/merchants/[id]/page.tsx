"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Store,
  Wifi,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScoreGauge } from "@/components/charts/ScoreGauge";
import { RevenueTrend } from "@/components/charts/RevenueTrend";
import { FactorBars } from "@/components/charts/FactorBars";
import { GradeBadge, RecommendationBadge } from "@/components/shared/RiskBadge";
import { formatVND, formatDate } from "@/lib/format";
import { apiFetch, isApiError } from "@/lib/api";
import type { Merchant } from "@/types/merchant";
import type { CreditScore } from "@/types/credit-score";
import type { MonthlyRevenue } from "@/types/transaction";

interface MerchantDetailResponse {
  merchant: Merchant;
  creditScore: CreditScore | null;
  monthlyRevenue: MonthlyRevenue[];
}

export default function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<MerchantDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MerchantDetailResponse>(`/api/merchants/${id}`)
      .then(setData)
      .catch((error) => {
        if (isApiError(error) && error.status) {
          setErrorMessage(`[${error.code} - ${error.status}] ${error.message}`);
          return;
        }
        if (isApiError(error)) {
          setErrorMessage(`[${error.code}] ${error.message}`);
          return;
        }
        setErrorMessage("Merchant not found");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0046FF]" />
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">{errorMessage || "Merchant not found"}</p>
        <Link href="/merchants">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Merchants
          </Button>
        </Link>
      </div>
    );
  }

  const { merchant, creditScore: score, monthlyRevenue: revenue } = data;

  const ActionIcon =
    merchant.latestScore?.recommendation === "APPROVE"
      ? CheckCircle2
      : merchant.latestScore?.recommendation === "DECLINE"
      ? XCircle
      : AlertTriangle;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/merchants"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Merchants
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0046FF]/10">
              <Store className="h-6 w-6 text-[#0046FF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{merchant.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline">{merchant.category}</Badge>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {merchant.district}, {merchant.city}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5" />
                  {merchant.posProvider}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/chat?merchant=${id}`}>
            <Button variant="outline">
              <Bot className="mr-2 h-4 w-4" />
              AI Co-Pilot
            </Button>
          </Link>
          {merchant.latestScore && (
            <Button
              className={
                merchant.latestScore.recommendation === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : merchant.latestScore.recommendation === "DECLINE"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }
            >
              <ActionIcon className="mr-2 h-4 w-4" />
              {merchant.latestScore.recommendation === "APPROVE"
                ? "Approve Loan"
                : merchant.latestScore.recommendation === "DECLINE"
                ? "Decline"
                : "Manual Review"}
            </Button>
          )}
        </div>
      </div>

      {/* Score Overview Cards */}
      {score && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Score Gauge */}
          <Card className="lg:row-span-2">
            <CardContent className="flex flex-col items-center py-8">
              <ScoreGauge score={score.score} size={240} />
              <div className="mt-4 flex items-center gap-3">
                <GradeBadge grade={score.grade} className="text-lg px-4 py-1" />
                <RecommendationBadge recommendation={score.recommendation} />
              </div>
              <Separator className="my-4 w-full" />
              <div className="grid grid-cols-2 gap-4 w-full text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Base Score</p>
                  <p className="text-lg font-bold">{score.baseScore}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">AI Adjustment</p>
                  <p className="text-lg font-bold text-[#0046FF]">+{score.aiAdjustment}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="text-lg font-bold">{(score.confidence * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valid Until</p>
                  <p className="text-sm font-medium">{formatDate(score.validUntil)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pre-Approved Limit */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pre-Approved Credit Limit</p>
                  <p className="text-2xl font-bold">{formatVND(score.preApprovedLimit)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Assessed {formatDate(score.createdAt)}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-semibold mb-3">Contact Information</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span>{merchant.contactName}</span>
                </div>
                {merchant.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{merchant.contactPhone}</span>
                  </div>
                )}
                {merchant.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{merchant.contactEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{merchant.monthsActive} months active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Section */}
      <Tabs defaultValue="factors" className="w-full">
        <TabsList>
          <TabsTrigger value="factors">Risk Factors</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="narrative">AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="factors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credit Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              {score ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <FactorBars factors={score.factors} />
                  <div className="space-y-3">
                    {score.factors.map((f) => (
                      <div
                        key={f.name}
                        className={`rounded-lg border p-3 ${
                          f.impact === "positive"
                            ? "border-emerald-200 bg-emerald-50/50"
                            : f.impact === "negative"
                            ? "border-red-200 bg-red-50/50"
                            : "border-amber-200 bg-amber-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{f.name}</span>
                          <Badge
                            variant="outline"
                            className={
                              f.impact === "positive"
                                ? "text-emerald-700 border-emerald-300"
                                : f.impact === "negative"
                                ? "text-red-700 border-red-300"
                                : "text-amber-700 border-amber-300"
                            }
                          >
                            {f.impact}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground py-8 text-center">
                  No credit assessment available for this merchant.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenue && revenue.length > 0 ? (
                <RevenueTrend data={revenue} />
              ) : (
                <p className="text-muted-foreground py-8 text-center">
                  No revenue data available for this merchant.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="narrative">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#0046FF]" />
                <CardTitle className="text-base">AI Credit Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {score ? (
                <div className="prose prose-sm max-w-none">
                  {score.narrative.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground">
                      {paragraph.split("**").map((part, j) =>
                        j % 2 === 1 ? (
                          <strong key={j}>{part}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground py-8 text-center">
                  No AI analysis available. Run an assessment first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
