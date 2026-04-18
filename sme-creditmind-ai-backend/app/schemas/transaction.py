from pydantic import BaseModel


class MonthlyRevenueOut(BaseModel):
    month: str
    revenue: float
    transactionCount: int
    uniqueCustomers: int
    avgTicketSize: float


class TransactionUploadResponse(BaseModel):
    merchantId: str
    totalImported: int
    monthsCovered: int
    message: str
