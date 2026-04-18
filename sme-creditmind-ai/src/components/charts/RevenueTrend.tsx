"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyRevenue } from "@/types/transaction";
import { formatVND } from "@/lib/format";

interface RevenueTrendProps {
  data: MonthlyRevenue[];
}

export function RevenueTrend({ data }: RevenueTrendProps) {
  const chartData = data.map((d) => ({
    ...d,
    revenueM: d.revenue / 1_000_000,
    label: d.month.slice(2).replace("-", "/"),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0046FF" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#0046FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(v: number) => `${v}M`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as MonthlyRevenue & { label: string };
            return (
              <div className="rounded-lg border bg-card p-3 shadow-lg">
                <p className="text-sm font-semibold">{d.label}</p>
                <p className="text-sm text-[#0046FF]">Revenue: {formatVND(d.revenue)}</p>
                <p className="text-xs text-muted-foreground">{d.transactionCount} transactions</p>
                <p className="text-xs text-muted-foreground">{d.uniqueCustomers} unique customers</p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="revenueM"
          stroke="#0046FF"
          strokeWidth={2}
          fill="url(#revenueGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
