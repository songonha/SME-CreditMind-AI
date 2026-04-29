export function formatVND(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: "text-emerald-800 bg-emerald-50/90 border-emerald-200/80",
    B: "text-sky-800 bg-sky-50/90 border-sky-200/80",
    C: "text-amber-800 bg-amber-50/90 border-amber-200/80",
    D: "text-orange-800 bg-orange-50/90 border-orange-200/80",
    E: "text-red-800 bg-red-50/90 border-red-200/80",
  };
  return colors[grade] ?? "text-muted-foreground bg-muted/80 border-border";
}

export function getRecommendationStyle(rec: string): { label: string; className: string } {
  switch (rec) {
    case "APPROVE":
      return { label: "Approve", className: "text-emerald-800 bg-emerald-100/70 border-0" };
    case "REVIEW":
      return { label: "Review", className: "text-amber-900 bg-amber-100/70 border-0" };
    case "DECLINE":
      return { label: "Decline", className: "text-red-900 bg-red-100/70 border-0" };
    default:
      return { label: rec, className: "text-muted-foreground bg-muted border-0" };
  }
}

export function getScoreColor(score: number): string {
  if (score >= 800) return "oklch(0.45 0.09 155)";
  if (score >= 650) return "oklch(0.48 0.08 250)";
  if (score >= 500) return "oklch(0.48 0.09 85)";
  if (score >= 350) return "oklch(0.5 0.11 55)";
  return "oklch(0.5 0.12 22)";
}
