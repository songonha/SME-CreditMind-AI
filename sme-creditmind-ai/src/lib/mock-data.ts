import type { Merchant } from "@/types/merchant";
import type { CreditScore, CreditFactor } from "@/types/credit-score";
import type { MonthlyRevenue } from "@/types/transaction";
import type { DashboardStats } from "@/types/dashboard";

// ─── Demo Merchants ────────────────────────────────────────────

export const merchants: Merchant[] = [
  {
    id: "m-001",
    name: "Pho Ha Noi - 123 Nguyen Hue",
    category: "F&B / Restaurant",
    subCategory: "Vietnamese Cuisine",
    address: "123 Nguyen Hue, Phuong Ben Nghe",
    district: "Quan 1",
    city: "Ho Chi Minh City",
    posProvider: "VNPay",
    contactName: "Nguyen Van An",
    contactPhone: "0901234567",
    contactEmail: "an@phonoihanoi.vn",
    status: "ACTIVE",
    monthsActive: 18,
    createdAt: "2024-10-15T08:00:00Z",
    updatedAt: "2026-04-10T12:00:00Z",
    latestScore: { score: 823, grade: "A", riskLevel: "VERY_LOW", preApprovedLimit: 450_000_000, recommendation: "APPROVE" },
  },
  {
    id: "m-002",
    name: "TechShop Saigon",
    category: "Retail / Electronics",
    subCategory: "Consumer Electronics",
    address: "456 Le Loi, Phuong Ben Thanh",
    district: "Quan 1",
    city: "Ho Chi Minh City",
    posProvider: "Momo",
    contactName: "Tran Thi Bich",
    contactPhone: "0912345678",
    contactEmail: "bich@techshopsaigon.vn",
    status: "ACTIVE",
    monthsActive: 8,
    createdAt: "2025-08-20T08:00:00Z",
    updatedAt: "2026-04-09T15:30:00Z",
    latestScore: { score: 541, grade: "C", riskLevel: "MEDIUM", preApprovedLimit: 120_000_000, recommendation: "REVIEW" },
  },
  {
    id: "m-003",
    name: "Cafe Saigon Roasters",
    category: "F&B / Cafe",
    subCategory: "Specialty Coffee",
    address: "78 Hai Ba Trung, Phuong Da Kao",
    district: "Quan 1",
    city: "Ho Chi Minh City",
    posProvider: "ZaloPay",
    contactName: "Le Minh Duc",
    contactPhone: "0923456789",
    contactEmail: "duc@saigonroasters.vn",
    status: "ACTIVE",
    monthsActive: 4,
    createdAt: "2025-12-01T08:00:00Z",
    updatedAt: "2026-04-08T10:00:00Z",
    latestScore: { score: 312, grade: "E", riskLevel: "VERY_HIGH", preApprovedLimit: 0, recommendation: "DECLINE" },
  },
  {
    id: "m-004",
    name: "Banh Mi Express Q7",
    category: "F&B / Quick Service",
    subCategory: "Street Food",
    address: "22 Nguyen Thi Thap, Tan Phong",
    district: "Quan 7",
    city: "Ho Chi Minh City",
    posProvider: "VNPay",
    contactName: "Pham Hoang Long",
    contactPhone: "0934567890",
    contactEmail: "long@banhmiq7.vn",
    status: "ACTIVE",
    monthsActive: 14,
    createdAt: "2025-02-10T08:00:00Z",
    updatedAt: "2026-04-10T08:00:00Z",
    latestScore: { score: 712, grade: "B", riskLevel: "LOW", preApprovedLimit: 280_000_000, recommendation: "APPROVE" },
  },
  {
    id: "m-005",
    name: "Beauty Corner Spa",
    category: "Services / Beauty",
    subCategory: "Spa & Wellness",
    address: "55 Phan Xich Long, Phuong 2",
    district: "Phu Nhuan",
    city: "Ho Chi Minh City",
    posProvider: "Momo",
    contactName: "Vo Thi Mai",
    contactPhone: "0945678901",
    contactEmail: "mai@beautycorner.vn",
    status: "ACTIVE",
    monthsActive: 11,
    createdAt: "2025-05-15T08:00:00Z",
    updatedAt: "2026-04-07T14:00:00Z",
    latestScore: { score: 678, grade: "B", riskLevel: "LOW", preApprovedLimit: 200_000_000, recommendation: "APPROVE" },
  },
  {
    id: "m-006",
    name: "MiniMart Binh Thanh",
    category: "Retail / Convenience",
    subCategory: "Mini Supermarket",
    address: "101 Xo Viet Nghe Tinh, Phuong 21",
    district: "Binh Thanh",
    city: "Ho Chi Minh City",
    posProvider: "VNPay",
    contactName: "Hoang Duc Tai",
    contactPhone: "0956789012",
    contactEmail: "tai@minimart-bt.vn",
    status: "ACTIVE",
    monthsActive: 22,
    createdAt: "2024-06-10T08:00:00Z",
    updatedAt: "2026-04-10T16:00:00Z",
    latestScore: { score: 891, grade: "A", riskLevel: "VERY_LOW", preApprovedLimit: 500_000_000, recommendation: "APPROVE" },
  },
  {
    id: "m-007",
    name: "Fashion House Thu Duc",
    category: "Retail / Fashion",
    subCategory: "Clothing & Accessories",
    address: "200 Vo Van Ngan, Linh Chieu",
    district: "Thu Duc",
    city: "Ho Chi Minh City",
    posProvider: "ZaloPay",
    contactName: "Dang Phuong Thao",
    contactPhone: "0967890123",
    contactEmail: "thao@fashionhouse.vn",
    status: "ACTIVE",
    monthsActive: 6,
    createdAt: "2025-10-20T08:00:00Z",
    updatedAt: "2026-04-06T11:00:00Z",
    latestScore: { score: 445, grade: "D", riskLevel: "HIGH", preApprovedLimit: 40_000_000, recommendation: "REVIEW" },
  },
  {
    id: "m-008",
    name: "Gym Fit Pro",
    category: "Services / Fitness",
    subCategory: "Gym & Training",
    address: "88 Nguyen Van Linh, Tan Phong",
    district: "Quan 7",
    city: "Ho Chi Minh City",
    posProvider: "Momo",
    contactName: "Bui Thanh Son",
    contactPhone: "0978901234",
    contactEmail: "son@gymfitpro.vn",
    status: "ACTIVE",
    monthsActive: 16,
    createdAt: "2024-12-01T08:00:00Z",
    updatedAt: "2026-04-10T09:00:00Z",
    latestScore: { score: 756, grade: "B", riskLevel: "LOW", preApprovedLimit: 300_000_000, recommendation: "APPROVE" },
  },
];

// ─── Credit Score Detail (for merchant m-001) ──────────────────

const phoFactors: CreditFactor[] = [
  { name: "Revenue Stability", impact: "positive", weight: 0.85, description: "Consistent monthly revenue with low variance (CoV: 0.12). Strong upward trend over 18 months.", dataPoint: "Avg 320M VND/month", category: "revenue" },
  { name: "Transaction Volume", impact: "positive", weight: 0.78, description: "High daily transaction count averaging 85 transactions/day, indicating healthy foot traffic.", dataPoint: "85 txn/day avg", category: "volume" },
  { name: "Customer Base", impact: "positive", weight: 0.72, description: "Growing customer base with 62% repeat customer rate. Unique customers increased 15% QoQ.", dataPoint: "62% repeat rate", category: "customers" },
  { name: "Operating Consistency", impact: "positive", weight: 0.90, description: "Active 98% of calendar days. No gaps longer than 2 days (holidays only).", dataPoint: "98% active days", category: "consistency" },
  { name: "Digital Payment Adoption", impact: "positive", weight: 0.65, description: "72% of transactions are digital (card + e-wallet + QR), above industry average of 55%.", dataPoint: "72% digital", category: "digital" },
  { name: "Seasonal Resilience", impact: "neutral", weight: 0.15, description: "Moderate seasonality — Tet holiday shows 25% revenue increase, but Feb post-Tet dips 15%.", dataPoint: "Seasonal index: 0.85", category: "seasonal" },
  { name: "Growth Momentum", impact: "positive", weight: 0.70, description: "Strong positive growth trend. Revenue grew 23% year-over-year. Accelerating in recent quarter.", dataPoint: "+23% YoY", category: "growth" },
];

export const creditScores: Record<string, CreditScore> = {
  "m-001": {
    id: "cs-001",
    merchantId: "m-001",
    score: 823,
    baseScore: 680,
    aiAdjustment: 143,
    grade: "A",
    riskLevel: "VERY_LOW",
    preApprovedLimit: 450_000_000,
    confidence: 0.92,
    factors: phoFactors,
    narrative: `**Pho Ha Noi** demonstrates exceptional financial health based on 18 months of POS transaction data. The restaurant maintains consistent monthly revenue averaging 320 million VND with a remarkably low coefficient of variation (0.12), indicating stable and predictable cash flows.

Key strengths include a high daily transaction volume of 85 transactions per day, a robust repeat customer rate of 62%, and an impressive digital payment adoption rate of 72% — significantly above the F&B industry average of 55%.

The business shows strong growth momentum with 23% year-over-year revenue increase and accelerating quarterly performance. Operating consistency is near-perfect at 98% active days, with only brief holiday closures.

**Recommendation:** Approve with pre-approved credit limit of 450,000,000 VND. This merchant represents a low-risk, high-quality borrower suitable for the SME lending portfolio. Suggested monitoring: quarterly revenue review with automatic limit adjustment.`,
    recommendation: "APPROVE",
    assessedBy: "AI + Loan Officer Review",
    validUntil: "2026-07-10T00:00:00Z",
    createdAt: "2026-04-10T12:00:00Z",
  },
  "m-002": {
    id: "cs-002",
    merchantId: "m-002",
    score: 541,
    baseScore: 470,
    aiAdjustment: 71,
    grade: "C",
    riskLevel: "MEDIUM",
    preApprovedLimit: 120_000_000,
    confidence: 0.74,
    factors: [
      { name: "Revenue Stability", impact: "neutral", weight: 0.40, description: "Moderate revenue variance (CoV: 0.28). Some months show significant dips.", dataPoint: "Avg 180M VND/month", category: "revenue" },
      { name: "Transaction Volume", impact: "positive", weight: 0.55, description: "Decent transaction count at 42 transactions/day average.", dataPoint: "42 txn/day avg", category: "volume" },
      { name: "Customer Base", impact: "negative", weight: -0.30, description: "Customer concentration risk — top 15 customers account for 40% of revenue.", dataPoint: "40% concentration", category: "customers" },
      { name: "Operating Consistency", impact: "neutral", weight: 0.35, description: "Active 85% of calendar days. Occasional 3-4 day gaps noted.", dataPoint: "85% active days", category: "consistency" },
      { name: "Digital Payment Adoption", impact: "positive", weight: 0.50, description: "Good digital adoption at 65%, driven by Momo integration.", dataPoint: "65% digital", category: "digital" },
      { name: "Seasonal Resilience", impact: "negative", weight: -0.45, description: "High seasonal sensitivity — electronics sales drop 40% in Q1 post-Tet.", dataPoint: "Seasonal index: 0.60", category: "seasonal" },
      { name: "Growth Momentum", impact: "neutral", weight: 0.20, description: "Flat growth trend. Revenue essentially unchanged over 8 months.", dataPoint: "+2% total", category: "growth" },
    ],
    narrative: `**TechShop Saigon** presents a moderate risk profile based on 8 months of transaction history. While the business shows decent daily transaction volumes and good digital payment adoption through Momo, several risk factors warrant attention.

Revenue stability is a concern with a coefficient of variation of 0.28, suggesting unpredictable monthly cash flows. More critically, customer concentration is high — the top 15 customers represent 40% of total revenue, creating dependency risk.

The electronics retail sector also shows significant seasonal sensitivity, with post-Tet Q1 typically seeing 40% revenue declines. Growth has been essentially flat since operations began.

**Recommendation:** Manual review recommended. Consider approving with a conservative limit of 120,000,000 VND with monthly monitoring conditions and a 6-month review cycle.`,
    recommendation: "REVIEW",
    validUntil: "2026-07-10T00:00:00Z",
    createdAt: "2026-04-09T15:30:00Z",
  },
  "m-003": {
    id: "cs-003",
    merchantId: "m-003",
    score: 312,
    baseScore: 290,
    aiAdjustment: 22,
    grade: "E",
    riskLevel: "VERY_HIGH",
    preApprovedLimit: 0,
    confidence: 0.68,
    factors: [
      { name: "Revenue Stability", impact: "negative", weight: -0.65, description: "Revenue declining month-over-month. CoV: 0.45 indicates high instability.", dataPoint: "Avg 85M VND/month, declining", category: "revenue" },
      { name: "Transaction Volume", impact: "negative", weight: -0.40, description: "Low transaction count at 22 transactions/day, trending downward.", dataPoint: "22 txn/day, -15% trend", category: "volume" },
      { name: "Customer Base", impact: "negative", weight: -0.55, description: "Declining unique customers. Repeat rate only 28%, well below industry average.", dataPoint: "28% repeat rate", category: "customers" },
      { name: "Operating Consistency", impact: "negative", weight: -0.50, description: "Only active 72% of calendar days. Multiple gaps of 5+ days.", dataPoint: "72% active days", category: "consistency" },
      { name: "Digital Payment Adoption", impact: "neutral", weight: 0.20, description: "Moderate digital adoption at 48%.", dataPoint: "48% digital", category: "digital" },
      { name: "Seasonal Resilience", impact: "neutral", weight: 0.00, description: "Insufficient data for seasonal analysis (only 4 months).", dataPoint: "N/A", category: "seasonal" },
      { name: "Growth Momentum", impact: "negative", weight: -0.80, description: "Strong negative trend. Revenue decreased 30% from month 1 to month 4.", dataPoint: "-30% decline", category: "growth" },
    ],
    narrative: `**Cafe Saigon Roasters** presents a high-risk profile based on only 4 months of limited transaction data. The business shows concerning trends across multiple dimensions.

Revenue has been declining consistently, dropping 30% from the first month to the most recent, with high month-to-month variance. Daily transaction volume is low at 22 per day and trending downward. The repeat customer rate of only 28% suggests difficulties in customer retention.

Operating consistency is also a concern, with the business active only 72% of calendar days and multiple extended closures noted. With only 4 months of data, seasonal patterns cannot be assessed.

**Recommendation:** Decline at this time. The merchant should be placed on a monitoring list for reassessment after 6 months of improved performance data. Consider offering business advisory services.`,
    recommendation: "DECLINE",
    validUntil: "2026-07-10T00:00:00Z",
    createdAt: "2026-04-08T10:00:00Z",
  },
};

// ─── Monthly Revenue Data ──────────────────────────────────────

export const monthlyRevenue: Record<string, MonthlyRevenue[]> = {
  "m-001": [
    { month: "2025-05", revenue: 280_000_000, transactionCount: 2380, uniqueCustomers: 890, avgTicketSize: 117_647 },
    { month: "2025-06", revenue: 295_000_000, transactionCount: 2520, uniqueCustomers: 920, avgTicketSize: 117_063 },
    { month: "2025-07", revenue: 310_000_000, transactionCount: 2600, uniqueCustomers: 950, avgTicketSize: 119_231 },
    { month: "2025-08", revenue: 305_000_000, transactionCount: 2550, uniqueCustomers: 940, avgTicketSize: 119_608 },
    { month: "2025-09", revenue: 320_000_000, transactionCount: 2650, uniqueCustomers: 980, avgTicketSize: 120_755 },
    { month: "2025-10", revenue: 330_000_000, transactionCount: 2700, uniqueCustomers: 1010, avgTicketSize: 122_222 },
    { month: "2025-11", revenue: 325_000_000, transactionCount: 2680, uniqueCustomers: 1000, avgTicketSize: 121_269 },
    { month: "2025-12", revenue: 355_000_000, transactionCount: 2900, uniqueCustomers: 1100, avgTicketSize: 122_414 },
    { month: "2026-01", revenue: 380_000_000, transactionCount: 3100, uniqueCustomers: 1200, avgTicketSize: 122_581 },
    { month: "2026-02", revenue: 290_000_000, transactionCount: 2200, uniqueCustomers: 850, avgTicketSize: 131_818 },
    { month: "2026-03", revenue: 340_000_000, transactionCount: 2750, uniqueCustomers: 1050, avgTicketSize: 123_636 },
    { month: "2026-04", revenue: 350_000_000, transactionCount: 2800, uniqueCustomers: 1080, avgTicketSize: 125_000 },
  ],
  "m-002": [
    { month: "2025-09", revenue: 190_000_000, transactionCount: 1300, uniqueCustomers: 480, avgTicketSize: 146_154 },
    { month: "2025-10", revenue: 195_000_000, transactionCount: 1350, uniqueCustomers: 500, avgTicketSize: 144_444 },
    { month: "2025-11", revenue: 210_000_000, transactionCount: 1450, uniqueCustomers: 530, avgTicketSize: 144_828 },
    { month: "2025-12", revenue: 250_000_000, transactionCount: 1700, uniqueCustomers: 620, avgTicketSize: 147_059 },
    { month: "2026-01", revenue: 150_000_000, transactionCount: 1000, uniqueCustomers: 380, avgTicketSize: 150_000 },
    { month: "2026-02", revenue: 140_000_000, transactionCount: 950, uniqueCustomers: 360, avgTicketSize: 147_368 },
    { month: "2026-03", revenue: 175_000_000, transactionCount: 1200, uniqueCustomers: 440, avgTicketSize: 145_833 },
    { month: "2026-04", revenue: 180_000_000, transactionCount: 1250, uniqueCustomers: 460, avgTicketSize: 144_000 },
  ],
  "m-003": [
    { month: "2026-01", revenue: 110_000_000, transactionCount: 750, uniqueCustomers: 320, avgTicketSize: 146_667 },
    { month: "2026-02", revenue: 95_000_000, transactionCount: 650, uniqueCustomers: 280, avgTicketSize: 146_154 },
    { month: "2026-03", revenue: 80_000_000, transactionCount: 580, uniqueCustomers: 240, avgTicketSize: 137_931 },
    { month: "2026-04", revenue: 72_000_000, transactionCount: 500, uniqueCustomers: 200, avgTicketSize: 144_000 },
  ],
};

// ─── Dashboard Stats ───────────────────────────────────────────

export const dashboardStats: DashboardStats = {
  totalMerchants: 247,
  totalApproved: 189,
  totalReview: 38,
  totalDeclined: 20,
  avgScore: 672,
  totalPortfolioValue: 12_500_000_000,
  scoreDistribution: [
    { range: "0-200", count: 8 },
    { range: "200-400", count: 22 },
    { range: "400-600", count: 58 },
    { range: "600-800", count: 102 },
    { range: "800-1000", count: 57 },
  ],
  gradeDistribution: [
    { grade: "A", count: 57, color: "#10b981" },
    { grade: "B", count: 102, color: "#3b82f6" },
    { grade: "C", count: 58, color: "#f59e0b" },
    { grade: "D", count: 22, color: "#f97316" },
    { grade: "E", count: 8, color: "#ef4444" },
  ],
  recentAssessments: [
    { id: "ra-1", merchantId: "m-006", merchantName: "MiniMart Binh Thanh", category: "Retail / Convenience", score: 891, grade: "A", recommendation: "APPROVE", preApprovedLimit: 500_000_000, assessedAt: "2026-04-10T16:00:00Z" },
    { id: "ra-2", merchantId: "m-001", merchantName: "Pho Ha Noi - 123 Nguyen Hue", category: "F&B / Restaurant", score: 823, grade: "A", recommendation: "APPROVE", preApprovedLimit: 450_000_000, assessedAt: "2026-04-10T12:00:00Z" },
    { id: "ra-3", merchantId: "m-004", merchantName: "Banh Mi Express Q7", category: "F&B / Quick Service", score: 712, grade: "B", recommendation: "APPROVE", preApprovedLimit: 280_000_000, assessedAt: "2026-04-10T08:00:00Z" },
    { id: "ra-4", merchantId: "m-008", merchantName: "Gym Fit Pro", category: "Services / Fitness", score: 756, grade: "B", recommendation: "APPROVE", preApprovedLimit: 300_000_000, assessedAt: "2026-04-10T09:00:00Z" },
    { id: "ra-5", merchantId: "m-002", merchantName: "TechShop Saigon", category: "Retail / Electronics", score: 541, grade: "C", recommendation: "REVIEW", preApprovedLimit: 120_000_000, assessedAt: "2026-04-09T15:30:00Z" },
    { id: "ra-6", merchantId: "m-003", merchantName: "Cafe Saigon Roasters", category: "F&B / Cafe", score: 312, grade: "E", recommendation: "DECLINE", preApprovedLimit: 0, assessedAt: "2026-04-08T10:00:00Z" },
    { id: "ra-7", merchantId: "m-005", merchantName: "Beauty Corner Spa", category: "Services / Beauty", score: 678, grade: "B", recommendation: "APPROVE", preApprovedLimit: 200_000_000, assessedAt: "2026-04-07T14:00:00Z" },
    { id: "ra-8", merchantId: "m-007", merchantName: "Fashion House Thu Duc", category: "Retail / Fashion", score: 445, grade: "D", recommendation: "REVIEW", preApprovedLimit: 40_000_000, assessedAt: "2026-04-06T11:00:00Z" },
  ],
  alerts: [
    { id: "a-1", merchantId: "m-003", merchantName: "Cafe Saigon Roasters", type: "score_drop", message: "Credit score dropped 45 points in the last 30 days. Revenue declining trend detected.", severity: "high", createdAt: "2026-04-10T08:00:00Z" },
    { id: "a-2", merchantId: "m-007", merchantName: "Fashion House Thu Duc", type: "anomaly", message: "Unusual 3-day gap in transactions detected (Apr 3-5). Possible operational issue.", severity: "medium", createdAt: "2026-04-06T09:00:00Z" },
    { id: "a-3", merchantId: "m-001", merchantName: "Pho Ha Noi - 123 Nguyen Hue", type: "new_assessment", message: "New assessment completed. Score improved +12 points to 823 (Grade A).", severity: "low", createdAt: "2026-04-10T12:00:00Z" },
    { id: "a-4", merchantId: "m-005", merchantName: "Beauty Corner Spa", type: "expiring", message: "Credit assessment expires in 15 days. Schedule reassessment.", severity: "medium", createdAt: "2026-04-10T07:00:00Z" },
  ],
};
