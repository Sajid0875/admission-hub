/**
 * Lead Domain Types
 */

export type LeadStatus = "new" | "contacted" | "follow_up" | "demo" | "admitted" | "lost";
export type LeadPriority = "low" | "medium" | "high" | "urgent";

export interface FollowupTask {
  id: string;
  leadId: string;
  dueDate: string;
  priority: LeadPriority;
  status: "pending" | "completed" | "snoozed" | "cancelled";
  outcome?: "connected" | "no_response" | "call_later" | "interested_later" | "demo_booked" | "lost";
  notes?: string;
  scheduledAt?: string;
  createdAt?: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: "call" | "whatsapp" | "email" | "note" | "status_change" | "task";
  description: string;
  performedBy?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  _id?: string;
  studentName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  courseId?: string;
  courseInterest?: string;
  source?: string;
  budget?: number;
  priority: LeadPriority;
  status: LeadStatus;
  leadScore?: number;
  partnerId?: string;
  assignedTo?: string;
  assignedUserName?: string;
  isDuplicate?: boolean;
  followUpDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus | "all";
  priority?: LeadPriority | "all";
  courseId?: string;
}

export interface CreateLeadPayload {
  studentName: string;
  phone: string;
  email?: string;
  courseId?: string;
  courseInterest?: string;
  source?: string;
  priority: LeadPriority;
  budget?: number;
  whatsapp?: string;
  city?: string;
}

export interface UpdateLeadPayload {
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedTo?: string;
  followUpDate?: string;
  notes?: string;
  studentName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  budget?: number;
}

