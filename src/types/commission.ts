/**
 * Commission Domain Types
 */

export type PayoutStatus = "pending" | "requested" | "approved" | "paid" | "rejected";

export interface CommissionRecord {
  id: string;
  partnerId: string;
  admissionId?: string;
  leadId?: string;
  studentName?: string;
  courseName?: string;
  admissionFee?: number;
  commissionRate?: number;
  earnedAmount: number;
  pendingAmount: number;
  paidAmount: number;
  payoutStatus: PayoutStatus;
  payoutDate?: string;
  requestedAt?: string;
  approvedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommissionSummary {
  totalEarned: number;
  pendingPayout: number;
  totalPaid: number;
  lastPayoutDate?: string;
}
