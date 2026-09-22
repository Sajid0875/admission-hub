/**
 * Admission Domain Types
 */

export type PaymentStatus = "pending" | "partial" | "full" | "refunded" | "cancelled";
export type PaymentMode =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "card"
  | "cheque"
  | "online"
  | "gateway";
export type VerificationStatus = "pending" | "verified" | "rejected";

export interface AdmissionDocument {
  id: string;
  name: string;
  url: string;
  type?: string;
  uploadedAt?: string;
}

export interface Admission {
  id: string;
  leadId?: string;
  studentName: string;
  studentId?: string;
  courseId: string;
  courseName?: string;
  fee: number;
  amountPaid: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  verificationStatus?: VerificationStatus;
  joiningDate: string;
  partnerId?: string;
  commissionAmount?: number;
  remarks?: string;
  documents?: AdmissionDocument[];
  createdAt?: string;
  updatedAt?: string;
}
