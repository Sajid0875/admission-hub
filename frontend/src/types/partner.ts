/**
 * Partner Domain Types
 */

export type PartnerStatus = "pending" | "active" | "suspended" | "rejected";

export interface PartnerContactInfo {
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface Partner {
  id: string;
  academyName: string;
  partnerName?: string;
  ownerName?: string;
  email: string;
  mobile?: string;
  phone?: string;
  logo?: string;
  status: PartnerStatus;
  commissionType?: string;
  commissionRate?: number;
  contact?: PartnerContactInfo;
  createdAt?: string;
  updatedAt?: string;
}
