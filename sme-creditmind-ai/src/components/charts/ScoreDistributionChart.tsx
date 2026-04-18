"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ScoreDistributionItem } from "@/types/dashboard";

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#10b981"];

interface ScoreDistributionChartProps {
  data: ScoreDistributionItem[];
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="range" tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ScoreDistributionItem;
            return (
              <div className="rounded-lg border bg-card p-2 shadow-lg text-sm">
                <p className="font-semibold">Score {d.range}</p>
                <p className="text-muted-foreground">{d.count} merchants</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
