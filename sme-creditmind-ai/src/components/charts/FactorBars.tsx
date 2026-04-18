"use client";

import type { CreditFactor } from "@/types/credit-score";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ShoppingCart,
  Users,
  Calendar,
  Smartphone,
  Snowflake,
  Rocket,
} from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  revenue: BarChart3,
  volume: ShoppingCart,
  customers: Users,
  consistency: Calendar,
  digital: Smartphone,
  seasonal: Snowflake,
  growth: Rocket,
};

interface FactorBarsProps {
  factors: CreditFactor[];
}

export function FactorBars({ factors }: FactorBarsProps) {
  const sorted = [...factors].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  return (
    <div className="space-y-3">
      {sorted.map((factor) => {
        const Icon = categoryIcons[factor.category] || BarChart3;
        const barWidth = Math.abs(factor.weight) * 100;
        const isPositive = factor.impact === "positive";
        const isNegative = factor.impact === "negative";

        return (
          <div key={factor.name} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{factor.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isPositive && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                {isNegative && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                {factor.impact === "neutral" && <Minus className="h-3.5 w-3.5 text-amber-500" />}
                <span className="text-xs text-muted-foreground">{factor.dataPoint}</span>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  isPositive && "bg-emerald-500",
                  isNegative && "bg-red-500",
                  factor.impact === "neutral" && "bg-amber-400"
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {factor.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
