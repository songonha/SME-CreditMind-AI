"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const EMPTY_CREATE_FORM = {
  name: "",
  category: "",
  subCategory: "",
  posProvider: "VNPay",
  city: "Ho Chi Minh City",
  district: "",
  address: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  businessRegNo: "",
  taxId: "",
};

function MerchantsPageContent() {
  const searchParams = useSearchParams();
  const reviewOnly = searchParams.get("filter") === "review";

  const [allMerchants, setAllMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({ ...EMPTY_CREATE_FORM }));

  const loadMerchants = useCallback(async () => {
    setListError(null);
    try {
      const data = await apiFetch<MerchantListResponse>("/api/merchants");
      setAllMerchants(data.merchants);
    } catch (error) {
      if (isApiError(error)) {
        console.error("Merchant list API error:", {
          code: error.code,
          status: error.status,
          message: error.message,
        });
        setListError(error.message);
      } else {
        console.error(error);
        setListError("Could not load the merchant list.");
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMerchants().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadMerchants]);

  const filtered = allMerchants.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      (m.district ?? "").toLowerCase().includes(search.toLowerCase());
    const matchGrade =
      !gradeFilter || m.latestScore?.grade === gradeFilter;
    const matchReview =
      !reviewOnly || m.latestScore?.recommendation === "REVIEW";
    return matchSearch && matchGrade && matchReview;
  });

  const grades = ["A", "B", "C", "D", "E"];

  const resetCreateForm = () => setForm({ ...EMPTY_CREATE_FORM });

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const name = form.name.trim();
    const category = form.category.trim();
    const posProvider = form.posProvider.trim();
    if (!name || !category || !posProvider) {
      setCreateError("Merchant name, category, and POS channel are required.");
      return;
    }
    setCreateSubmitting(true);
    try {
      const payload: Record<string, string> = {
        name,
        category,
        posProvider,
        city: form.city.trim() || "Ho Chi Minh City",
      };
      const add = (val: string, key: string) => {
        const t = val.trim();
        if (t) payload[key] = t;
      };
      add(form.subCategory, "subCategory");
      add(form.address, "address");
      add(form.district, "district");
      add(form.contactName, "contactName");
      add(form.contactPhone, "contactPhone");
      add(form.contactEmail, "contactEmail");
      add(form.businessRegNo, "businessRegNo");
      add(form.taxId, "taxId");

      const created = await apiFetch<Merchant>("/api/merchants", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAllMerchants((prev) => [created, ...prev]);
      setCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      setCreateError(isApiError(err) ? err.message : "Could not create merchant.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SME profiles</h1>
          <p className="text-muted-foreground">List and create new merchants.</p>
          {reviewOnly ? (
            <p className="mt-2 text-sm text-primary">
              Filter: <strong>Review</strong> (<code className="rounded bg-muted px-1 text-xs">?filter=review</code>).
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          className="shrink-0 w-full sm:w-auto"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create merchant
        </Button>
      </div>

      {listError ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p className="font-medium">Could not load list</p>
          <p className="mt-1">{listError}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Check the backend (see BACKEND_INTERNAL_ORIGIN / uvicorn port, often 8012 with dev:win) and error logs.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base">
              All Merchants ({listError ? "—" : filtered.length})
            </CardTitle>
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateError(null);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create merchant</DialogTitle>
            <DialogDescription>
              Add an SME profile to the current organization; then upload POS data and run an assessment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="m-name" className="text-sm font-medium">
                  Merchant name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="m-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. ABC Store"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-category" className="text-sm font-medium">
                  Category <span className="text-destructive">*</span>
                </label>
                <Input
                  id="m-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="F&B / Retail / …"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-pos" className="text-sm font-medium">
                  POS provider <span className="text-destructive">*</span>
                </label>
                <Input
                  id="m-pos"
                  value={form.posProvider}
                  onChange={(e) => setForm((f) => ({ ...f, posProvider: e.target.value }))}
                  placeholder="VNPay, Momo, …"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-sub" className="text-sm font-medium">
                  Sub-category
                </label>
                <Input
                  id="m-sub"
                  value={form.subCategory}
                  onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-city" className="text-sm font-medium">
                  City
                </label>
                <Input
                  id="m-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-district" className="text-sm font-medium">
                  District
                </label>
                <Input
                  id="m-district"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  placeholder="District 1, …"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="m-addr" className="text-sm font-medium">
                  Address
                </label>
                <Input
                  id="m-addr"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-contact" className="text-sm font-medium">
                  Contact name
                </label>
                <Input
                  id="m-contact"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-phone" className="text-sm font-medium">
                  Phone
                </label>
                <Input
                  id="m-phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="m-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="m-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-reg" className="text-sm font-medium">
                  Business registration no.
                </label>
                <Input
                  id="m-reg"
                  value={form.businessRegNo}
                  onChange={(e) => setForm((f) => ({ ...f, businessRegNo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="m-tax" className="text-sm font-medium">
                  Tax ID
                </label>
                <Input
                  id="m-tax"
                  value={form.taxId}
                  onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                />
              </div>
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSubmitting}
              >
                {createSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MerchantsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MerchantsPageContent />
    </Suspense>
  );
}
