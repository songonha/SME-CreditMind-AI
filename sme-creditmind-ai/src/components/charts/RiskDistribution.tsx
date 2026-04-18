"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { GradeDistributionItem } from "@/types/dashboard";

interface RiskDistributionProps {
  data: GradeDistributionItem[];
}

export function RiskDistribution({ data }: RiskDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            dataKey="count"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GradeDistributionItem;
              return (
                <div className="rounded-lg border bg-card p-2 shadow-lg text-sm">
                  <span className="font-semibold">Grade {d.grade}</span>: {d.count} ({((d.count / total) * 100).toFixed(0)}%)
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.grade} className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-medium w-14">Grade {item.grade}</span>
            <span className="text-muted-foreground">{item.count}</span>
            <span className="text-muted-foreground text-xs">
              ({((item.count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
