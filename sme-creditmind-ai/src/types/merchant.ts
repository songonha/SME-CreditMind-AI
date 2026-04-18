export type MerchantStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Merchant {
  id: string;
  name: string;
  businessRegNo?: string;
  taxId?: string;
  category: string;
  subCategory?: string;
  address?: string;
  district?: string;
  city: string;
  posProvider: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: MerchantStatus;
  monthsActive: number;
  createdAt: string;
  updatedAt: string;
  latestScore?: CreditScoreSummary;
}

export interface CreditScoreSummary {
  score: number;
  grade: CreditGrade;
  riskLevel: RiskLevel;
  preApprovedLimit: number;
  recommendation: Recommendation;
}

export type CreditGrade = "A" | "B" | "C" | "D" | "E";
export type RiskLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type Recommendation = "APPROVE" | "REVIEW" | "DECLINE";
