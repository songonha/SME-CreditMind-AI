export interface DashboardStats {
  totalMerchants: number;
  totalApproved: number;
  totalReview: number;
  totalDeclined: number;
  avgScore: number;
  totalPortfolioValue: number;
  scoreDistribution: ScoreDistributionItem[];
  gradeDistribution: GradeDistributionItem[];
  recentAssessments: RecentAssessment[];
  alerts: Alert[];
}

export interface ScoreDistributionItem {
  range: string;
  count: number;
}

export interface GradeDistributionItem {
  grade: string;
  count: number;
  color: string;
}

export interface RecentAssessment {
  id: string;
  merchantId: string;
  merchantName: string;
  category: string;
  score: number;
  grade: string;
  recommendation: string;
  preApprovedLimit: number;
  assessedAt: string;
}

export interface Alert {
  id: string;
  merchantId: string;
  merchantName: string;
  type: "score_drop" | "anomaly" | "new_assessment" | "expiring";
  message: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
}
