"use client";

import { FileText, Download, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const reports = [
  { id: 1, name: "Q1 2026 Portfolio Summary", type: "Portfolio", date: "2026-04-01", status: "Ready" },
  { id: 2, name: "March 2026 Risk Assessment Report", type: "Risk", date: "2026-03-31", status: "Ready" },
  { id: 3, name: "New Merchant Onboarding — Batch #12", type: "Assessment", date: "2026-03-25", status: "Ready" },
  { id: 4, name: "Compliance Audit — Grade D/E Merchants", type: "Compliance", date: "2026-03-20", status: "Ready" },
  { id: 5, name: "February 2026 Risk Assessment Report", type: "Risk", date: "2026-02-28", status: "Archived" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download compliance-ready portfolio reports.
          </p>
        </div>
        <Button className="bg-[#0046FF] hover:bg-[#0035CC]">
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0046FF]/10">
                    <FileText className="h-5 w-5 text-[#0046FF]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{r.type}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {r.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={r.status === "Ready" ? "text-emerald-700 bg-emerald-50" : ""}
                  >
                    {r.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
