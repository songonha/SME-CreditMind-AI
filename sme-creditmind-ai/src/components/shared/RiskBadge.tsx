import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getGradeColor, getRecommendationStyle } from "@/lib/format";

export function GradeBadge({ grade, className }: { grade: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-bold text-sm px-2.5 py-0.5", getGradeColor(grade), className)}>
      {grade}
    </Badge>
  );
}

export function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const { label, className } = getRecommendationStyle(recommendation);
  return (
    <Badge className={cn("font-medium", className)}>
      {label}
    </Badge>
  );
}

export function ScoreDisplay({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const getColor = () => {
    if (score >= 800) return "text-emerald-600";
    if (score >= 650) return "text-blue-600";
    if (score >= 500) return "text-amber-600";
    if (score >= 350) return "text-orange-600";
    return "text-red-600";
  };

  const sizeClasses = {
    sm: "text-lg font-bold",
    md: "text-2xl font-bold",
    lg: "text-5xl font-extrabold",
  };

  return (
    <span className={cn(getColor(), sizeClasses[size])}>
      {score}
    </span>
  );
}
