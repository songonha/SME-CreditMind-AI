"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  MapPin,
  Calendar,
  CreditCard,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { GradeBadge, RecommendationBadge, ScoreDisplay } from "@/components/shared/RiskBadge";
import { formatVND } from "@/lib/format";
import { apiFetch, isApiError } from "@/lib/api";
import type { Merchant } from "@/types/merchant";

interface MerchantListResponse {
  merchants: Merchant[];
  total: number;
}

export default function MerchantsPage() {
  const [allMerchants, setAllMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MerchantListResponse>("/api/merchants")
      .then((data) => setAllMerchants(data.merchants))
      .catch((error) => {
        if (isApiError(error)) {
          console.error("Merchant list API error:", {
            code: error.code,
            status: error.status,
            message: error.message,
          });
          return;
        }
        console.error(error);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = allMerchants.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      (m.district ?? "").toLowerCase().includes(search.toLowerCase());
    const matchGrade =
      !gradeFilter || m.latestScore?.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const grades = ["A", "B", "C", "D", "E"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0046FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Merchants</h1>
        <p className="text-muted-foreground">
          Manage and assess your SME merchant portfolio.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base">All Merchants ({filtered.length})</CardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, category, district..."
                  className="pl-10 h-9 w-full sm:w-72"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-muted-foreground mr-1" />
                <Button
                  variant={gradeFilter === null ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setGradeFilter(null)}
                >
                  All
                </Button>
                {grades.map((g) => (
                  <Button
                    key={g}
                    variant={gradeFilter === g ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setGradeFilter(gradeFilter === g ? null : g)}
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <div className="flex items-center gap-1">
                    Merchant
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>POS</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    Months
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-right">Pre-Approved</TableHead>
                <TableHead className="text-center">Decision</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.contactName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {m.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {m.district}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {m.posProvider}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm">{m.monthsActive}</TableCell>
                  <TableCell className="text-center">
                    {m.latestScore ? (
                      <ScoreDisplay score={m.latestScore.score} size="sm" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {m.latestScore ? (
                      <GradeBadge grade={m.latestScore.grade} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {m.latestScore && m.latestScore.preApprovedLimit > 0 ? (
                      <div className="flex items-center justify-end gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatVND(m.latestScore.preApprovedLimit)}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {m.latestScore ? (
                      <RecommendationBadge recommendation={m.latestScore.recommendation} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/merchants/${m.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
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
