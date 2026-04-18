import type { CreditGrade, RiskLevel, Recommendation } from "./merchant";

export interface CreditScore {
  id: string;
  merchantId: string;
  score: number;
  baseScore: number;
  aiAdjustment: number;
  grade: CreditGrade;
  riskLevel: RiskLevel;
  preApprovedLimit: number;
  confidence: number;
  factors: CreditFactor[];
  narrative: string;
  recommendation: Recommendation;
  assessedBy?: string;
  validUntil: string;
  createdAt: string;
}

export interface CreditFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
  dataPoint: string;
  category: "revenue" | "volume" | "customers" | "consistency" | "digital" | "seasonal" | "growth";
}

export interface ScoreHistory {
  date: string;
  score: number;
  grade: CreditGrade;
}
