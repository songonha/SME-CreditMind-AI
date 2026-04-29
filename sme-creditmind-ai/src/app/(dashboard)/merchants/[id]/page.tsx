"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
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
  FileUp,
  Sparkles,
  Circle,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type LoanCaseOut = {
  id: string;
  merchantId: string;
  status: string;
  decisionNote: string;
  createdAt: string;
  updatedAt: string;
};

const NARRATIVE_PREVIEW_LEN = 480;

export default function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<MerchantDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loanCases, setLoanCases] = useState<LoanCaseOut[]>([]);
  const [loanCasesLoading, setLoanCasesLoading] = useState(true);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionStatus, setDecisionStatus] = useState<"APPROVED" | "DECLINED" | "IN_REVIEW">("IN_REVIEW");
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);

  const refreshLoanCases = useCallback(() => {
    setLoanCasesLoading(true);
    apiFetch<LoanCaseOut[]>("/api/loan-cases")
      .then(setLoanCases)
      .catch(() => setLoanCases([]))
      .finally(() => setLoanCasesLoading(false));
  }, []);

  useEffect(() => {
    refreshLoanCases();
  }, [refreshLoanCases]);

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

  const merchantCase = useMemo(() => {
    const mine = loanCases.filter((c) => c.merchantId === id);
    return mine.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [loanCases, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const hasTxnData = merchant.monthsActive > 0 || (revenue?.length ?? 0) > 0;
  const hasScoreStep = !!score;
  const hasDecisionStep =
    !!merchantCase && merchantCase.status !== "DRAFT";

  const openDecision = (status: "APPROVED" | "DECLINED" | "IN_REVIEW") => {
    setDecisionStatus(status);
    setDecisionNote(merchantCase?.decisionNote ?? "");
    setDecisionError(null);
    setDecisionOpen(true);
  };

  const submitLoanDecision = async () => {
    setDecisionSubmitting(true);
    setDecisionError(null);
    try {
      if (merchantCase) {
        await apiFetch<LoanCaseOut>(`/api/loan-cases/${merchantCase.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: decisionStatus,
            decisionNote: decisionNote.trim(),
          }),
        });
      } else {
        await apiFetch<LoanCaseOut>("/api/loan-cases", {
          method: "POST",
          body: JSON.stringify({
            merchantId: id,
            status: decisionStatus,
            decisionNote: decisionNote.trim(),
          }),
        });
      }
      setDecisionOpen(false);
      setLoanCasesLoading(true);
      refreshLoanCases();
    } catch (err) {
      setDecisionError(isApiError(err) ? err.message : "Could not save decision.");
    } finally {
      setDecisionSubmitting(false);
    }
  };

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
            SME list
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
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
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/chat?merchant=${id}`}>
            <Button variant="outline">
              <Bot className="mr-2 h-4 w-4" />
              AI assistant
            </Button>
          </Link>
          {score ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                onClick={() => openDecision("APPROVED")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-800 hover:bg-red-50"
                onClick={() => openDecision("DECLINED")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 text-amber-900 hover:bg-amber-50"
                onClick={() => openDecision("IN_REVIEW")}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Review
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Workflow strip + quick links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">File progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              [
                { label: "SME profile", done: true },
                { label: "Transaction data", done: hasTxnData },
                { label: "Score assessment", done: hasScoreStep },
                { label: "Decision", done: hasDecisionStep },
              ] as const
            ).map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={step.done ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {step.label}
                </span>
                {i < 3 ? <span className="text-muted-foreground hidden sm:inline">→</span> : null}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/transaction-upload?merchantId=${id}`}>
              <Button type="button" size="sm" variant="secondary" className="h-8">
                <FileUp className="mr-1.5 h-3.5 w-3.5" />
                POS upload
              </Button>
            </Link>
            <Link href={`/assess?merchantId=${id}`}>
              <Button type="button" size="sm" variant="secondary" className="h-8">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI assessment
              </Button>
            </Link>
          </div>
          {!hasTxnData ? (
            <p className="text-xs text-amber-800 dark:text-amber-200" title="Upload POS or transaction file to add data">
              Not enough transaction data yet — upload POS transactions.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {merchantCase || !loanCasesLoading ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Loan case</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {merchantCase ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{merchantCase.status}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">{merchantCase.id}</span>
                </div>
                {merchantCase.decisionNote ? (
                  <p className="text-muted-foreground">{merchantCase.decisionNote}</p>
                ) : (
                  <p className="text-muted-foreground italic">No decision note yet.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(merchantCase.updatedAt).toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                No loan case yet — use Approve / Decline / Review to create one.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

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
                  <p className="text-lg font-bold text-primary">+{score.aiAdjustment}</p>
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
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">AI Credit Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {score ? (
                <div className="prose prose-sm max-w-none">
                  {(narrativeExpanded
                    ? score.narrative
                    : score.narrative.slice(0, NARRATIVE_PREVIEW_LEN) +
                      (score.narrative.length > NARRATIVE_PREVIEW_LEN ? "…" : "")
                  )
                    .split("\n\n")
                    .map((paragraph, i) => (
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
                  {score.narrative.length > NARRATIVE_PREVIEW_LEN ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 px-2 text-primary"
                      onClick={() => setNarrativeExpanded((v) => !v)}
                    >
                      <ChevronDown
                        className={`mr-1 h-4 w-4 transition-transform ${narrativeExpanded ? "rotate-180" : ""}`}
                      />
                      {narrativeExpanded ? "Show less" : "Show more"}
                    </Button>
                  ) : null}
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

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record decision</DialogTitle>
            <DialogDescription>
              Status: <strong>{decisionStatus}</strong>
              {merchantCase ? " — update existing case." : " — create a new loan case."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="decision-note">
              Short note
            </label>
            <textarea
              id="decision-note"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              rows={4}
              maxLength={1900}
              className="flex min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Reason / conditions / follow-ups…"
            />
            {decisionError ? <p className="text-sm text-destructive">{decisionError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDecisionOpen(false)} disabled={decisionSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={decisionSubmitting}
              onClick={() => void submitLoanDecision()}
            >
              {decisionSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
