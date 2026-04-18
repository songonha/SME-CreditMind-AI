export type PaymentMethod = "CARD" | "EWALLET" | "QR_CODE" | "BANK_TRANSFER" | "CASH";

export interface Transaction {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  terminalId?: string;
  customerId?: string;
  category?: string;
  description?: string;
  transactionAt: string;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  transactionCount: number;
  uniqueCustomers: number;
  avgTicketSize: number;
}
