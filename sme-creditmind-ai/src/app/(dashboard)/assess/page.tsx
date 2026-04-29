"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  Wifi,
  ArrowRight,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScoreGauge } from "@/components/charts/ScoreGauge";
import { GradeBadge, RecommendationBadge } from "@/components/shared/RiskBadge";
import { formatVND } from "@/lib/format";
import { apiUploadJson, isApiError } from "@/lib/api";

const posProviders = [
  { id: "vnpay", name: "VNPay", connected: true },
  { id: "momo", name: "Momo", connected: false },
  { id: "zalopay", name: "ZaloPay", connected: false },
  { id: "bank", name: "Bank POS", connected: false },
];

const demoScenarios = [
  { id: "high", label: "High Quality Merchant", description: "18-month cafe, steady growth", score: 823, grade: "A" as const },
  { id: "medium", label: "Average Merchant", description: "8-month electronics shop", score: 541, grade: "C" as const },
  { id: "low", label: "Risky Merchant", description: "4-month new restaurant, declining", score: 312, grade: "E" as const },
];

type Step = "connect" | "processing" | "result";

type FinancialPipelineCredit = {
  credit_score?: string | number;
  risk_level?: string;
  confidence?: string;
  key_factors?: string[];
  recommendation?: string;
};

type FinancialPipelineResult = {
  parsed: Record<string, unknown>;
  analysis: Record<string, unknown>;
  credit: FinancialPipelineCredit;
};

function pipelineScoreToNumber(raw: string | number | undefined): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === "number" && !Number.isNaN(raw)) return Math.min(1000, Math.max(0, Math.round(raw)));
  const n = parseInt(String(raw).replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : Math.min(1000, Math.max(0, n));
}

function normalizePipelineRecommendation(raw: string | undefined): "APPROVE" | "REVIEW" | "DECLINE" {
  const u = (raw || "").trim().toLowerCase();
  if (u === "approve") return "APPROVE";
  if (u === "review") return "REVIEW";
  if (u === "reject") return "DECLINE";
  return "REVIEW";
}

function AssessPageContent() {
  const searchParams = useSearchParams();
  const urlMerchantId = searchParams.get("merchantId")?.trim() || null;

  const [step, setStep] = useState<Step>("connect");
  const [progress, setProgress] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState(demoScenarios[0]);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  const [docPipelineFile, setDocPipelineFile] = useState<File | null>(null);
  const [docPipelineLoading, setDocPipelineLoading] = useState(false);
  const [docPipelineError, setDocPipelineError] = useState<string | null>(null);
  const [docPipelineResult, setDocPipelineResult] = useState<FinancialPipelineResult | null>(null);

  const runFinancialDocumentPipeline = async () => {
    if (!docPipelineFile) {
      setDocPipelineError("Select an image (utility bill, POS receipt, or bank statement) before running.");
      return;
    }
    setDocPipelineError(null);
    setDocPipelineLoading(true);
    setDocPipelineResult(null);
    try {
      const formData = new FormData();
      formData.append("file", docPipelineFile);
      const data = await apiUploadJson<FinancialPipelineResult>("/api/ai/financial-document-pipeline", formData);
      setDocPipelineResult(data);
      setUiMessage("Multi-document pipeline completed (parse → analyze → score).");
    } catch (error) {
      setDocPipelineError(isApiError(error) ? error.message : "Pipeline failed.");
    } finally {
      setDocPipelineLoading(false);
    }
  };

  const startAssessment = () => {
    setStep("processing");
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep("result"), 500);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Assessment</h1>
        <p className="text-muted-foreground">
          Connect POS data and run AI credit scoring for a new merchant.
        </p>
        {urlMerchantId ? (
          <p className="mt-2 text-sm text-primary">
            Merchant pre-selected from URL (<code className="rounded bg-muted px-1 text-xs">?merchantId=</code>
            ).
          </p>
        ) : null}
        {uiMessage ? <p className="mt-2 text-sm text-emerald-600">{uiMessage}</p> : null}
        {uiError ? <p className="mt-2 text-sm text-destructive">{uiError}</p> : null}
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        {(["connect", "processing", "result"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : (["connect", "processing", "result"].indexOf(step) > i)
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {["connect", "processing", "result"].indexOf(step) > i ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                i + 1
              )}
            </div>
            <span className="text-sm font-medium capitalize">{s === "connect" ? "Data Source" : s}</span>
            {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />}
          </div>
        ))}
      </div>

      {/* Step: Connect */}
      {step === "connect" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                Connect POS Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {posProviders.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
                      {p.name.slice(0, 2)}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  {p.connected ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge>
                  ) : (
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload CSV / JSON
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  Drag & drop transaction file here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV or JSON format, max 50MB
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  Browse Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Multi-document Qwen pipeline (utility / POS / bank) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Multi-document AI (utility / POS / bank statement)
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Upload one image: the pipeline runs three steps — extract JSON (Qwen-VL) → cash-flow analysis (Qwen) → credit score and recommendation.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Document image</label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setDocPipelineFile(f ?? null);
                      setDocPipelineResult(null);
                      setDocPipelineError(null);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  disabled={docPipelineLoading || !docPipelineFile}
                  onClick={() => void runFinancialDocumentPipeline()}
                >
                  {docPipelineLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running pipeline...
                    </>
                  ) : (
                    "Run pipeline (3 agents)"
                  )}
                </Button>
              </div>
              {docPipelineError ? (
                <p className="text-sm text-destructive">{docPipelineError}</p>
              ) : null}
              {docPipelineResult ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4 flex flex-col items-center">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Credit score (0–1000)</p>
                    <ScoreGauge
                      score={pipelineScoreToNumber(docPipelineResult.credit.credit_score)}
                      size={220}
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {docPipelineResult.credit.risk_level ? (
                        <Badge variant="outline" className="text-xs">
                          Risk: {docPipelineResult.credit.risk_level}
                        </Badge>
                      ) : null}
                      {docPipelineResult.credit.recommendation ? (
                        <RecommendationBadge
                          recommendation={normalizePipelineRecommendation(docPipelineResult.credit.recommendation)}
                        />
                      ) : null}
                    </div>
                    {docPipelineResult.credit.confidence ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Confidence: {docPipelineResult.credit.confidence}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Explainability — key factors</p>
                    <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                      {(docPipelineResult.credit.key_factors ?? []).map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                    <p className="text-xs font-semibold text-foreground pt-2">Full JSON (parsed / analysis / credit)</p>
                    <pre className="max-h-56 overflow-auto rounded bg-muted p-2 text-[10px] leading-snug">
                      {JSON.stringify(docPipelineResult, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Demo Scenarios */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Demo Scenarios (Hackathon)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {demoScenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selectedScenario.id === s.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "hover:border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <GradeBadge grade={s.grade} />
                      <span className="text-lg font-bold">{s.score}</span>
                    </div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </button>
                ))}
              </div>
              <Button
                className="mt-6"
                onClick={startAssessment}
              >
                Run AI Assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-6 text-lg font-semibold">AI is analyzing merchant data...</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Processing POS transactions, calculating features, generating credit score
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Demo scoring uses the selected scenario only — for production data use POS upload or the
              multi-document pipeline above.
            </p>
            <div className="w-full max-w-md mt-8">
              <Progress value={Math.min(progress, 100)} className="h-2" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Feature Engineering</span>
                <span>AI Scoring</span>
                <span>Narrative</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col items-center py-10">
            <ScoreGauge score={selectedScenario.score} size={280} />
            <div className="mt-4 flex items-center gap-3">
              <GradeBadge grade={selectedScenario.grade} className="text-lg px-4 py-1" />
              <RecommendationBadge
                recommendation={
                  selectedScenario.score >= 650
                    ? "APPROVE"
                    : selectedScenario.score >= 350
                    ? "REVIEW"
                    : "DECLINE"
                }
              />
            </div>
            <p className="mt-4 text-lg font-semibold">
              Pre-Approved Limit:{" "}
              {selectedScenario.score >= 800
                ? formatVND(450_000_000)
                : selectedScenario.score >= 500
                ? formatVND(120_000_000)
                : "N/A"}
            </p>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The AI credit assessment has been completed for the selected demo scenario.
                In production, this would process real POS transaction data from the connected
                provider and generate a comprehensive credit analysis.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setStep("connect")}
                >
                  Run Another Assessment
                </Button>
                <Button variant="outline">
                  View Full Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function AssessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AssessPageContent />
    </Suspense>
  );
}
