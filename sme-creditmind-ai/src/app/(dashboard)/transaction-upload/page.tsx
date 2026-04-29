"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch, apiUploadJson, isApiError } from "@/lib/api";
import type { Merchant } from "@/types/merchant";

type MerchantListResponse = {
  merchants: Merchant[];
  total: number;
};

type UploadResponse = {
  merchantId: string;
  totalImported: number;
  monthsCovered: number;
  message: string;
};

function TransactionUploadContent() {
  const searchParams = useSearchParams();
  const merchantIdFromUrl = searchParams.get("merchantId")?.trim() ?? "";

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setListError(null);
    apiFetch<MerchantListResponse>("/api/merchants")
      .then((data) => {
        setMerchants(data.merchants);
        const q = merchantIdFromUrl;
        if (q && data.merchants.some((m) => m.id === q)) {
          setMerchantId(q);
        }
      })
      .catch((err) => {
        setMerchants([]);
        if (isApiError(err)) {
          if (err.status === 401) {
            setListError(
              "Could not authenticate (401). Sign out and sign in again — the app will store your org and token after login."
            );
          } else if (err.status === 403) {
            setListError(
              "You are not allowed to view merchants (403). Check organization context (X-Organization-Id) after signing in."
            );
          } else {
            setListError(err.message || "Could not load merchant list.");
          }
        } else {
          setListError("Could not load merchant list. Make sure the backend is running (same port as BACKEND_INTERNAL_ORIGIN, e.g. 8012 with npm run dev:win).");
        }
      })
      .finally(() => setLoadingList(false));
  }, [merchantIdFromUrl]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!merchantId) {
      setError("Select a merchant to attach transactions.");
      return;
    }
    if (!file) {
      setError("Choose a CSV, JSON, or Excel (.xlsx) file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("merchant_id", merchantId);
      formData.append("file", file);
      const data = await apiUploadJson<UploadResponse>("/api/transactions/upload", formData, {
        timeoutMs: 120_000,
      });
      setResult(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (loadingList) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">POS upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import transaction files (CSV, JSON, Excel) to refresh revenue and KPIs.
        </p>
        {merchantIdFromUrl && merchants.some((m) => m.id === merchantIdFromUrl) ? (
          <p className="mt-2 text-sm text-primary">
            Merchant pre-selected from link (<code className="rounded bg-muted px-1 text-xs">?merchantId=</code>).
          </p>
        ) : null}
        {listError ? (
          <div
            className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{listError}</span>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileUp className="h-5 w-5 text-primary" />
            Choose file
          </CardTitle>
          <CardDescription>
            Each row needs a positive amount and a transaction timestamp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="merchant" className="text-sm font-medium text-foreground">
                Merchant
              </label>
              <select
                id="merchant"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
              >
                <option value="">Select SME / merchant</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.city}
                  </option>
                ))}
              </select>
              {merchants.length === 0 && !listError ? (
                <p className="text-xs text-amber-700 dark:text-amber-200">
                  No merchants in your organization yet. Seed the backend: in the{" "}
                  <code className="rounded bg-muted px-1">sme-creditmind-ai-backend</code> folder run{" "}
                  <code className="rounded bg-muted px-1">python app/seed.py</code> (or{" "}
                  <code className="rounded bg-muted px-1">npm run seed:backend:win</code> from the repo root).
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="file" className="text-sm font-medium text-foreground">
                File
              </label>
              <InputFile
                id="file"
                onFile={(f) => {
                  setFile(f);
                  setResult(null);
                  setError(null);
                }}
              />
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground/80">Suggested column names</summary>
                <p className="mt-2 pl-1 border-l-2 border-border">
                  <code className="rounded bg-muted px-1">amount</code>,{" "}
                  <code className="rounded bg-muted px-1">transaction_at</code> or{" "}
                  <code className="rounded bg-muted px-1">date</code>; optional{" "}
                  <code className="rounded bg-muted px-1">payment_method</code>,{" "}
                  <code className="rounded bg-muted px-1">currency</code>,{" "}
                  <code className="rounded bg-muted px-1">customer_id</code>.
                </p>
              </details>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{result.message}</p>
                  <p className="mt-1 text-xs opacity-90">
                    Imported {result.totalImported} transactions — {result.monthsCovered} month(s) with data.
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={uploading || merchants.length === 0} className="w-full sm:w-auto">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload &amp; refresh aggregates
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TransactionUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TransactionUploadContent />
    </Suspense>
  );
}

function InputFile({
  id,
  onFile,
}: {
  id: string;
  onFile: (f: File | null) => void;
}) {
  return (
    <input
      id={id}
      type="file"
      accept=".csv,.json,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
    />
  );
}
