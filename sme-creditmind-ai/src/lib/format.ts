export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: "text-emerald-600 bg-emerald-50 border-emerald-200",
    B: "text-blue-600 bg-blue-50 border-blue-200",
    C: "text-amber-600 bg-amber-50 border-amber-200",
    D: "text-orange-600 bg-orange-50 border-orange-200",
    E: "text-red-600 bg-red-50 border-red-200",
  };
  return colors[grade] ?? "text-gray-600 bg-gray-50 border-gray-200";
}

export function getRecommendationStyle(rec: string): { label: string; className: string } {
  switch (rec) {
    case "APPROVE":
      return { label: "Approve", className: "text-emerald-700 bg-emerald-100" };
    case "REVIEW":
      return { label: "Review", className: "text-amber-700 bg-amber-100" };
    case "DECLINE":
      return { label: "Decline", className: "text-red-700 bg-red-100" };
    default:
      return { label: rec, className: "text-gray-700 bg-gray-100" };
  }
}

export function getScoreColor(score: number): string {
  if (score >= 800) return "#10b981";
  if (score >= 650) return "#3b82f6";
  if (score >= 500) return "#f59e0b";
  if (score >= 350) return "#f97316";
  return "#ef4444";
}
