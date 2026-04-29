"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, isApiError } from "@/lib/api";
import type { Merchant } from "@/types/merchant";

type LoanCaseRow = {
  id: string;
  merchantId: string;
  status: string;
  decisionNote: string;
  createdAt: string;
  updatedAt: string;
};

type MerchantListResponse = {
  merchants: Merchant[];
  total: number;
};

export default function LoanQueuePage() {
  const [cases, setCases] = useState<LoanCaseRow[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<LoanCaseRow[]>("/api/loan-cases"),
      apiFetch<MerchantListResponse>("/api/merchants"),
    ])
      .then(([caseRows, merch]) => {
        if (!cancelled) {
          setCases(caseRows);
          setMerchants(merch.merchants);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isApiError(error)) {
            console.error("Loan queue load error:", error.message);
          }
          setCases([]);
          setMerchants([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of merchants) {
      m.set(x.id, x.name);
    }
    return m;
  }, [merchants]);

  const sorted = useMemo(
    () => [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [cases]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary" />
          Loan applications
        </h1>
        <p className="text-muted-foreground mt-1">Sorted by most recently updated.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">List ({sorted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No loan cases yet. Create one from an SME detail page (Approve / Decline / Review).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Note</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.id}</TableCell>
                    <TableCell className="font-medium">
                      {nameById.get(c.merchantId) ?? c.merchantId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[240px] truncate text-muted-foreground text-sm">
                      {c.decisionNote || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/merchants/${c.merchantId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
