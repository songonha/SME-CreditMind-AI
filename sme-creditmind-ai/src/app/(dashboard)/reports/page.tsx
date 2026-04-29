"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Download, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, apiFetchBlob, isApiError } from "@/lib/api";

type ReportRow = {
  id: string;
  title: string;
  reportType: string;
  createdAt: string;
};

type ReportListResponse = { reports: ReportRow[] };

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await apiFetch<ReportListResponse>("/api/reports");
      setReports(list.reports);
    } catch (e) {
      setError(isApiError(e) ? e.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const blob = await apiFetchBlob("/api/reports/generate/portfolio-summary", {
        method: "POST",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      await load();
    } catch (e) {
      setError(isApiError(e) ? e.message : "Could not generate report.");
    } finally {
      setGenerating(false);
    }
  };

  const download = async (id: string, title: string) => {
    try {
      const blob = await apiFetchBlob(`/api/reports/${id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(isApiError(e) ? e.message : "Download failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download compliance-ready portfolio reports (entitlement required).
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link
              href="/billing"
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              View usage &amp; plans
            </Link>
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={generating || loading}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-3">
              {reports.length === 0 && (
                <p className="text-sm text-muted-foreground">No reports yet. Generate one above.</p>
              )}
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {r.reportType}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {r.createdAt.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-emerald-700 bg-emerald-50">
                      Ready
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => download(r.id, r.title)}
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
