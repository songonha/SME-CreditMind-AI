"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  Wifi,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Camera,
  Send,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScoreGauge } from "@/components/charts/ScoreGauge";
import { GradeBadge, RecommendationBadge } from "@/components/shared/RiskBadge";
import { formatVND } from "@/lib/format";
import {
  apiFetch,
  apiUploadJson,
  API_POS_ASSESSMENT_TIMEOUT_MS,
  isApiError,
} from "@/lib/api";
import {
  loadPosCapturesFromStorage,
  getCaptureFileName,
  type PosCaptureRecord,
} from "@/lib/pos-captures";
import type { Merchant } from "@/types/merchant";

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

type PosAnalysisFactor = {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
  dataPoint: string;
  category: "revenue" | "volume" | "customers" | "consistency" | "digital" | "seasonal" | "growth";
};

type PosAnalysisResult = {
  captureId: string;
  fileName: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  riskLevel: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  recommendation: "APPROVE" | "REVIEW" | "DECLINE";
  confidence: number;
  summary: string;
  factors: PosAnalysisFactor[];
  assessedAt: string;
};

type MerchantListResponse = {
  merchants: Merchant[];
  total: number;
};

type SavePosAssessmentResponse = {
  creditScoreId: string;
  merchantId: string;
  fileName: string;
  message: string;
};

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

export default function AssessPage() {
  const [step, setStep] = useState<Step>("connect");
  const [progress, setProgress] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState(demoScenarios[0]);
  const [posCaptures, setPosCaptures] = useState<PosCaptureRecord[]>([]);
  const [selectedCaptureIds, setSelectedCaptureIds] = useState<string[]>([]);
  /** File names passed into the current / last run (for AI narrative). */
  const [evidenceFileNames, setEvidenceFileNames] = useState<string[]>([]);
  const [analysisByCaptureId, setAnalysisByCaptureId] = useState<Record<string, PosAnalysisResult>>({});
  const [runningCaptureId, setRunningCaptureId] = useState<string | null>(null);
  const [sendCaptureId, setSendCaptureId] = useState<string | null>(null);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantList, setMerchantList] = useState<Merchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [sendingToMerchant, setSendingToMerchant] = useState(false);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  const [docPipelineFile, setDocPipelineFile] = useState<File | null>(null);
  const [docPipelineLoading, setDocPipelineLoading] = useState(false);
  const [docPipelineError, setDocPipelineError] = useState<string | null>(null);
  const [docPipelineResult, setDocPipelineResult] = useState<FinancialPipelineResult | null>(null);

  // Hydrate POS file list from localStorage after mount (client-only).
  useEffect(() => {
    const list = loadPosCapturesFromStorage();
    setPosCaptures(list);
    setSelectedCaptureIds(list.map((c) => c.id));
  }, []);

  const toggleCapture = (id: string) => {
    setSelectedCaptureIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllCaptures = () => {
    setSelectedCaptureIds(posCaptures.map((c) => c.id));
  };

  const runPosAnalysis = async (capture: PosCaptureRecord) => {
    setUiError(null);
    setUiMessage(null);
    setRunningCaptureId(capture.id);
    try {
      const result = await apiFetch<PosAnalysisResult>(
        "/api/ai/pos-assessment",
        {
          method: "POST",
          body: JSON.stringify({
            captureId: capture.id,
            fileName: getCaptureFileName(capture),
            mimeType: capture.mimeType,
            base64Data: capture.base64Data,
          }),
        },
        { timeoutMs: API_POS_ASSESSMENT_TIMEOUT_MS }
      );
      setAnalysisByCaptureId((prev) => ({ ...prev, [capture.id]: result }));
      setUiMessage(`AI analysis ready for ${result.fileName}.`);
    } catch (error) {
      setUiError(isApiError(error) ? error.message : "Failed to run AI assessment for this image.");
    } finally {
      setRunningCaptureId(null);
    }
  };

  const openSendDialog = async (captureId: string) => {
    setSendCaptureId(captureId);
    setUiError(null);
    setUiMessage(null);
    setLoadingMerchants(true);
    try {
      const data = await apiFetch<MerchantListResponse>("/api/merchants");
      setMerchantList(data.merchants);
    } catch (error) {
      setUiError(isApiError(error) ? error.message : "Failed to load merchants.");
      setMerchantList([]);
    } finally {
      setLoadingMerchants(false);
    }
  };

  const filteredMerchants = merchantList.filter((m) =>
    m.name.toLowerCase().includes(merchantSearch.trim().toLowerCase())
  );

  const sendAnalysisToMerchant = async (merchantId: string) => {
    if (!sendCaptureId) return;
    const analysis = analysisByCaptureId[sendCaptureId];
    if (!analysis) return;
    setSendingToMerchant(true);
    setUiError(null);
    try {
      const res = await apiFetch<SavePosAssessmentResponse>("/api/ai/pos-assessment/save", {
        method: "POST",
        body: JSON.stringify({
          merchantId,
          analysis,
        }),
      });
      setUiMessage(res.message);
      setSendCaptureId(null);
      setMerchantSearch("");
    } catch (error) {
      setUiError(isApiError(error) ? error.message : "Failed to save analysis for this merchant.");
    } finally {
      setSendingToMerchant(false);
    }
  };

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
    const names = posCaptures
      .filter((c) => selectedCaptureIds.includes(c.id))
      .map((c) => getCaptureFileName(c));
    setEvidenceFileNames(names);

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
                  ? "bg-[#0046FF] text-white"
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
                <Wifi className="h-5 w-5 text-[#0046FF]" />
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
                <Upload className="h-5 w-5 text-[#0046FF]" />
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

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#0046FF]" />
                POS images (Live POS Capture)
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Select which saved capture files the AI should treat as POS evidence when scoring.
                Images stay in your browser; file names are sent to the assessment flow for traceability.
              </p>
            </CardHeader>
            <CardContent>
              {posCaptures.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No saved captures yet. Capture POS receipts or terminal screens first.
                  </p>
                  <Link
                    href="/live-pos-capture"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Open Live POS Capture
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedCaptureIds.length} of {posCaptures.length} file
                      {posCaptures.length === 1 ? "" : "s"} selected
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={selectAllCaptures}
                    >
                      Select all
                    </Button>
                  </div>
                  <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {posCaptures.map((c) => {
                      const name = getCaptureFileName(c);
                      const checked = selectedCaptureIds.includes(c.id);
                      const analysis = analysisByCaptureId[c.id];
                      const isRunning = runningCaptureId === c.id;
                      return (
                        <li key={c.id}>
                          <div className="rounded border p-2">
                            <label className="flex cursor-pointer items-start gap-3 text-sm">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-border accent-[#0046FF]"
                                checked={checked}
                                onChange={() => toggleCapture(c.id)}
                              />
                              <span className="font-mono text-xs leading-snug break-all text-foreground">
                                {name}
                              </span>
                            </label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-[#0046FF] hover:bg-[#0035CC]"
                                onClick={() => runPosAnalysis(c)}
                                disabled={isRunning}
                              >
                                {isRunning ? (
                                  <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Running...
                                  </>
                                ) : (
                                  "Run AI Assessment"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => openSendDialog(c.id)}
                                disabled={!analysis}
                              >
                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                Send to Merchant
                              </Button>
                            </div>
                            {analysis ? (
                              <pre className="mt-2 max-h-52 overflow-auto rounded bg-muted p-2 text-[11px] leading-snug text-foreground">
                                {JSON.stringify(analysis, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multi-document Qwen pipeline (utility / POS / bank) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0046FF]" />
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
                  className="bg-[#0046FF] hover:bg-[#0035CC]"
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
                        ? "border-[#0046FF] bg-[#0046FF]/5 ring-1 ring-[#0046FF]/20"
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
                className="mt-6 bg-[#0046FF] hover:bg-[#0035CC]"
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
            <Loader2 className="h-12 w-12 text-[#0046FF] animate-spin" />
            <h3 className="mt-6 text-lg font-semibold">AI is analyzing merchant data...</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Processing POS transactions, calculating features, generating credit score
            </p>
            {evidenceFileNames.length > 0 ? (
              <div className="mt-4 max-w-lg text-left rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium text-foreground mb-1">POS evidence files</p>
                <ul className="text-xs font-mono text-muted-foreground list-disc list-inside space-y-0.5">
                  {evidenceFileNames.map((name, i) => (
                    <li key={`${name}-${i}`} className="break-all">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                No POS image files selected — demo scoring uses scenario data only.
              </p>
            )}
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
              {evidenceFileNames.length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-foreground mb-2">
                    POS evidence included in this run
                  </p>
                  <ul className="text-xs font-mono text-muted-foreground list-decimal list-inside space-y-1">
                    {evidenceFileNames.map((name, i) => (
                      <li key={`${name}-${i}`} className="break-all">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button
                  className="bg-[#0046FF] hover:bg-[#0035CC]"
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

      <Dialog open={!!sendCaptureId} onOpenChange={(open) => !open && setSendCaptureId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Send AI analysis to merchant</DialogTitle>
            <DialogDescription>
              Choose a merchant to attach the selected POS analysis into credit history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={merchantSearch}
              onChange={(e) => setMerchantSearch(e.target.value)}
              placeholder="Search merchant by name..."
            />
            <div className="max-h-80 overflow-y-auto rounded border">
              {loadingMerchants ? (
                <div className="p-4 text-sm text-muted-foreground">Loading merchants...</div>
              ) : filteredMerchants.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No merchants found.</div>
              ) : (
                <div className="divide-y">
                  {filteredMerchants.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full p-3 text-left hover:bg-muted/40 transition-colors"
                      onClick={() => sendAnalysisToMerchant(m.id)}
                      disabled={sendingToMerchant}
                    >
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.category} • {m.city}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendCaptureId(null)}
              disabled={sendingToMerchant}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
