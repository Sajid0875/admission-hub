import type { UserRole } from "@/types/auth";
import type { NormalizedError } from "@/types/api";

/**
 * Dashboard Service & Contract Definitions
 *
 * TODO-CONTRACT: Keystone HLD/LLD and SRS documents define Redis dashboard caching and
 * pipeline stages, but do NOT provide server-side aggregate dashboard endpoints
 * (such as GET /api/v1/dashboard/summary or GET /api/v1/dashboard/pipeline).
 *
 * Per architectural constraints, we do NOT compute totals by downloading huge datasets.
 * We define the service interface below and provide a role-aware mock adapter for Phase 3.
 */

export interface KpiMetric {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral" | "urgent";
  iconName?: "users" | "user-plus" | "clock" | "graduation-cap" | "dollar-sign" | "building" | "check-circle" | "shield";
  trendLabel?: string;
  highlight?: boolean;
}

export interface PipelineLeadPreview {
  id: string;
  name: string;
  phone?: string;
  course?: string;
  timeAgo: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

export interface PipelineStageSummary {
  stage: "new" | "contacted" | "follow_up" | "demo" | "admitted" | "lost";
  label: string;
  count: number;
  colorClass: string;
  leads: PipelineLeadPreview[];
}

export interface UpcomingFollowUpItem {
  id: string;
  leadId: string;
  studentName: string;
  scheduledTime: string;
  priority: "normal" | "high" | "urgent";
  phone: string;
  email: string;
  courseInterest: string;
  notes?: string;
}

export interface RecentActivityItem {
  id: string;
  type: "lead_created" | "lead_contacted" | "follow_up_scheduled" | "admission_confirmed" | "payout_requested" | "partner_approved";
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  partnerName?: string;
}

export interface CommissionMetricSummary {
  totalEarned: number;
  pendingPayout: number;
  paidOut: number;
  currency: string;
  nextPayoutDate?: string;
  eligibleForPayout: boolean;
}

export interface DashboardSummaryData {
  role: UserRole;
  partnerId?: string | null;
  partnerName?: string;
  lastUpdated: string;
  kpis: KpiMetric[];
  pipeline: PipelineStageSummary[];
  upcomingFollowUps: UpcomingFollowUpItem[];
  recentActivity: RecentActivityItem[];
  commission?: CommissionMetricSummary;
  // Support-specific operational metrics
  supportMetrics?: {
    pendingVerifications: number;
    openTickets: number;
    resolvedToday: number;
    systemHealth: "optimal" | "degraded" | "maintenance";
  };
}

// Role-specific mock fixtures conforming to documented business flow
const PARTNER_ADMIN_FIXTURE: DashboardSummaryData = {
  role: "partner_admin",
  partnerId: "partner_001",
  partnerName: "Apex Academy",
  lastUpdated: new Date().toISOString(),
  kpis: [
    {
      id: "total_leads",
      label: "Total Leads",
      value: "1,248",
      change: "+12%",
      changeType: "increase",
      iconName: "users",
      trendLabel: "vs last month",
    },
    {
      id: "new_leads",
      label: "New Leads",
      value: "42",
      change: "+5%",
      changeType: "increase",
      iconName: "user-plus",
      trendLabel: "this week",
    },
    {
      id: "followups_due",
      label: "Follow Ups Due",
      value: "18",
      change: "18 Urgent",
      changeType: "urgent",
      iconName: "clock",
      trendLabel: "action required",
      highlight: true,
    },
    {
      id: "admissions",
      label: "Admissions",
      value: "120",
      change: "+18%",
      changeType: "increase",
      iconName: "graduation-cap",
      trendLabel: "this month",
    },
    {
      id: "pending_commission",
      label: "Pending Commission",
      value: "$4,250",
      change: "Eligible",
      changeType: "increase",
      iconName: "dollar-sign",
      trendLabel: "ready for payout",
    },
  ],
  pipeline: [
    {
      stage: "new",
      label: "New",
      count: 42,
      colorClass: "bg-blue-500",
      leads: [
        { id: "lead_101", name: "Zainab Rashid", course: "Data Science Masters", timeAgo: "10m ago", priority: "high" },
        { id: "lead_102", name: "Omar Farooq", course: "Full Stack Development", timeAgo: "2h ago", priority: "medium" },
      ],
    },
    {
      stage: "contacted",
      label: "Contacted",
      count: 28,
      colorClass: "bg-indigo-500",
      leads: [
        { id: "lead_103", name: "Fatima Malik", course: "Digital Marketing", timeAgo: "Yesterday", priority: "medium" },
        { id: "lead_104", name: "Bilal Ahmed", course: "Data Science Masters", timeAgo: "2d ago", priority: "low" },
      ],
    },
    {
      stage: "follow_up",
      label: "Follow Up",
      count: 18,
      colorClass: "bg-amber-500",
      leads: [
        { id: "lead_105", name: "Ali Khan", course: "Cloud Architecture", timeAgo: "Today 2:00 PM", priority: "urgent" },
        { id: "lead_106", name: "Aisha Tariq", course: "UI/UX Design", timeAgo: "Today 4:30 PM", priority: "high" },
      ],
    },
    {
      stage: "demo",
      label: "Demo Scheduled",
      count: 15,
      colorClass: "bg-purple-500",
      leads: [
        { id: "lead_107", name: "Hamza Sheikh", course: "Cybersecurity Analyst", timeAgo: "Tomorrow 11:00 AM", priority: "high" },
      ],
    },
    {
      stage: "admitted",
      label: "Admitted",
      count: 120,
      colorClass: "bg-emerald-500",
      leads: [
        { id: "lead_108", name: "Hassan Tahir", course: "Full Stack Development", timeAgo: "Enrolled", priority: "medium" },
      ],
    },
  ],
  upcomingFollowUps: [
    {
      id: "fu_1",
      leadId: "lead_105",
      studentName: "Ali Khan",
      scheduledTime: "Today • 2:00 PM",
      priority: "urgent",
      phone: "+92 300 1234567",
      email: "ali.khan@example.com",
      courseInterest: "Cloud Architecture",
      notes: "Follow up on scholarship pricing inquiry and semester payment plan.",
    },
    {
      id: "fu_2",
      leadId: "lead_106",
      studentName: "Ahmed Khan",
      scheduledTime: "Today • 4:00 PM",
      priority: "normal",
      phone: "+92 321 7654321",
      email: "ahmed.k@example.com",
      courseInterest: "Data Science Masters",
      notes: "Student attended webinar, reviewing curriculum syllabus.",
    },
    {
      id: "fu_3",
      leadId: "lead_109",
      studentName: "Sara Ali",
      scheduledTime: "Today • 5:30 PM",
      priority: "high",
      phone: "+92 333 9876543",
      email: "sara.ali@example.com",
      courseInterest: "Full Stack Development",
      notes: "Requested confirmation of weekend batch timings.",
    },
  ],
  recentActivity: [
    {
      id: "act_1",
      type: "admission_confirmed",
      title: "Admission Confirmed",
      description: "Hassan Tahir enrolled in Full Stack Development (Fee Batch 2026-Q3).",
      timestamp: "25 minutes ago",
      actor: "Sarah Connor (Counselor)",
    },
    {
      id: "act_2",
      type: "lead_created",
      title: "New Intake Lead",
      description: "Zainab Rashid submitted inquiry via Facebook Ads portal.",
      timestamp: "1 hour ago",
      actor: "System Webhook",
    },
    {
      id: "act_3",
      type: "payout_requested",
      title: "Payout Requested",
      description: "Requested withdrawal of $2,500 approved commission.",
      timestamp: "4 hours ago",
      actor: "David White (Partner Admin)",
    },
    {
      id: "act_4",
      type: "follow_up_scheduled",
      title: "Follow-up Logged",
      description: "Completed call with Bilal Ahmed; rescheduled to Thursday.",
      timestamp: "6 hours ago",
      actor: "Elena Ramos (Counselor)",
    },
  ],
  commission: {
    totalEarned: 18450,
    pendingPayout: 4250,
    paidOut: 14200,
    currency: "USD",
    nextPayoutDate: "2026-09-15",
    eligibleForPayout: true,
  },
};

const TEAM_MEMBER_FIXTURE: DashboardSummaryData = {
  role: "team_member",
  partnerId: "partner_001",
  partnerName: "Apex Academy",
  lastUpdated: new Date().toISOString(),
  kpis: [
    {
      id: "my_leads",
      label: "My Assigned Leads",
      value: "28",
      change: "+4 this week",
      changeType: "increase",
      iconName: "users",
      trendLabel: "active pipeline",
    },
    {
      id: "my_followups",
      label: "My Follow-ups Today",
      value: "7",
      change: "3 Urgent",
      changeType: "urgent",
      iconName: "clock",
      trendLabel: "due today",
      highlight: true,
    },
    {
      id: "my_admissions",
      label: "My Converted Admissions",
      value: "14",
      change: "+2 this month",
      changeType: "increase",
      iconName: "graduation-cap",
      trendLabel: "target: 18",
    },
    {
      id: "conversion_rate",
      label: "Conversion Rate",
      value: "24.6%",
      change: "+3.2%",
      changeType: "increase",
      iconName: "check-circle",
      trendLabel: "vs team avg (21%)",
    },
  ],
  pipeline: [
    {
      stage: "new",
      label: "New Assigned",
      count: 6,
      colorClass: "bg-blue-500",
      leads: [
        { id: "lead_201", name: "Zubair Hashmi", course: "Python for AI", timeAgo: "30m ago", priority: "high" },
        { id: "lead_202", name: "Khadija Bibi", course: "Data Science", timeAgo: "3h ago", priority: "medium" },
      ],
    },
    {
      stage: "contacted",
      label: "Contacted",
      count: 8,
      colorClass: "bg-indigo-500",
      leads: [
        { id: "lead_203", name: "Usman Ghani", course: "Cloud Architecture", timeAgo: "Yesterday", priority: "medium" },
      ],
    },
    {
      stage: "follow_up",
      label: "Follow Up Required",
      count: 7,
      colorClass: "bg-amber-500",
      leads: [
        { id: "lead_204", name: "Mustafa Qazi", course: "Full Stack Web", timeAgo: "Today 1:30 PM", priority: "urgent" },
        { id: "lead_205", name: "Areeba Noor", course: "UI/UX Bootcamp", timeAgo: "Today 3:00 PM", priority: "high" },
      ],
    },
    {
      stage: "demo",
      label: "Demo Booked",
      count: 3,
      colorClass: "bg-purple-500",
      leads: [
        { id: "lead_206", name: "Danish Irfan", course: "DevOps Engineer", timeAgo: "Today 6:00 PM", priority: "high" },
      ],
    },
    {
      stage: "admitted",
      label: "Admitted by Me",
      count: 14,
      colorClass: "bg-emerald-500",
      leads: [
        { id: "lead_207", name: "Maryam Jamil", course: "Data Science", timeAgo: "Enrolled", priority: "medium" },
      ],
    },
  ],
  upcomingFollowUps: [
    {
      id: "fu_tm_1",
      leadId: "lead_204",
      studentName: "Mustafa Qazi",
      scheduledTime: "Today • 1:30 PM",
      priority: "urgent",
      phone: "+92 301 5551234",
      email: "mustafa.qazi@example.com",
      courseInterest: "Full Stack Web",
      notes: "Student waiting on parent approval for upfront discount.",
    },
    {
      id: "fu_tm_2",
      leadId: "lead_205",
      studentName: "Areeba Noor",
      scheduledTime: "Today • 3:00 PM",
      priority: "high",
      phone: "+92 334 6667890",
      email: "areeba.noor@example.com",
      courseInterest: "UI/UX Bootcamp",
      notes: "Review portfolio requirements and send installment links.",
    },
  ],
  recentActivity: [
    {
      id: "act_tm_1",
      type: "admission_confirmed",
      title: "Admission Converted",
      description: "Maryam Jamil completed initial enrollment installment.",
      timestamp: "2 hours ago",
      actor: "Sarah Connor (You)",
    },
    {
      id: "act_tm_2",
      type: "lead_contacted",
      title: "Call Logged",
      description: "Discussed course roadmap with Usman Ghani.",
      timestamp: "5 hours ago",
      actor: "Sarah Connor (You)",
    },
  ],
  // Team members do not receive commission financial breakdown
  commission: undefined,
};

const SUPER_ADMIN_FIXTURE: DashboardSummaryData = {
  role: "super_admin",
  partnerId: null,
  partnerName: "WhiteDavid23 Global Platform",
  lastUpdated: new Date().toISOString(),
  kpis: [
    {
      id: "active_partners",
      label: "Active Partners",
      value: "14",
      change: "+2 Pending Approval",
      changeType: "increase",
      iconName: "building",
      trendLabel: "network scale",
    },
    {
      id: "global_leads",
      label: "Total Network Leads",
      value: "8,420",
      change: "+22% MoM",
      changeType: "increase",
      iconName: "users",
      trendLabel: "all partner tenants",
    },
    {
      id: "global_admissions",
      label: "Total Admissions",
      value: "940",
      change: "11.2% conv",
      changeType: "increase",
      iconName: "graduation-cap",
      trendLabel: "converted students",
    },
    {
      id: "pending_payouts",
      label: "Pending Payout Approvals",
      value: "$18,600",
      change: "5 Requests",
      changeType: "urgent",
      iconName: "dollar-sign",
      trendLabel: "requires approval",
      highlight: true,
    },
  ],
  pipeline: [
    {
      stage: "new",
      label: "Network New",
      count: 312,
      colorClass: "bg-blue-500",
      leads: [
        { id: "lead_sa_1", name: "Aarav Sharma", course: "Full Stack Cloud", timeAgo: "15m ago (Apex)", priority: "medium" },
        { id: "lead_sa_2", name: "Meera Patel", course: "Data Analytics", timeAgo: "45m ago (Nexus)", priority: "high" },
      ],
    },
    {
      stage: "contacted",
      label: "Network Contacted",
      count: 184,
      colorClass: "bg-indigo-500",
      leads: [],
    },
    {
      stage: "follow_up",
      label: "Network In Follow-up",
      count: 142,
      colorClass: "bg-amber-500",
      leads: [],
    },
    {
      stage: "demo",
      label: "Network Demos",
      count: 98,
      colorClass: "bg-purple-500",
      leads: [],
    },
    {
      stage: "admitted",
      label: "Platform Admissions",
      count: 940,
      colorClass: "bg-emerald-500",
      leads: [],
    },
  ],
  upcomingFollowUps: [
    {
      id: "fu_sa_1",
      leadId: "lead_sa_101",
      studentName: "Global Partner Review: Beacon Learning",
      scheduledTime: "Today • 3:00 PM",
      priority: "high",
      phone: "+1 415 555 0192",
      email: "admin@beaconlearning.edu",
      courseInterest: "Partner Onboarding",
      notes: "Verify business tax documentation and partner commission agreement.",
    },
  ],
  recentActivity: [
    {
      id: "act_sa_1",
      type: "payout_requested",
      title: "Partner Payout Pending",
      description: "Apex Academy requested payout of $2,500. Awaiting Super Admin review.",
      timestamp: "1 hour ago",
      actor: "David White",
      partnerName: "Apex Academy",
    },
    {
      id: "act_sa_2",
      type: "partner_approved",
      title: "Partner Onboarded",
      description: "Horizon EdTech tenant provisioned and activated successfully.",
      timestamp: "4 hours ago",
      actor: "Alex Vance (Super Admin)",
      partnerName: "Horizon EdTech",
    },
    {
      id: "act_sa_3",
      type: "admission_confirmed",
      title: "Milestone Reached",
      description: "Network achieved 900+ verified admissions this semester.",
      timestamp: "Yesterday",
      actor: "System Milestone",
    },
  ],
  commission: {
    totalEarned: 114500,
    pendingPayout: 18600,
    paidOut: 95900,
    currency: "USD",
    nextPayoutDate: "2026-09-15",
    eligibleForPayout: false,
  },
};

const SUPPORT_FIXTURE: DashboardSummaryData = {
  role: "support",
  partnerId: null,
  partnerName: "Support Operational Desk",
  lastUpdated: new Date().toISOString(),
  kpis: [
    {
      id: "verification_queue",
      label: "Pending Verifications",
      value: "9",
      change: "3 Urgent",
      changeType: "urgent",
      iconName: "shield",
      trendLabel: "unverified documents",
      highlight: true,
    },
    {
      id: "open_tickets",
      label: "Open Partner Tickets",
      value: "5",
      change: "2 New",
      changeType: "neutral",
      iconName: "clock",
      trendLabel: "avg response 28m",
    },
    {
      id: "resolved_today",
      label: "Resolved Today",
      value: "14",
      change: "98% satisfaction",
      changeType: "increase",
      iconName: "check-circle",
      trendLabel: "operational velocity",
    },
    {
      id: "system_status",
      label: "Gateway Status",
      value: "Optimal",
      change: "100% Uptime",
      changeType: "increase",
      iconName: "building",
      trendLabel: "API & Redis active",
    },
  ],
  pipeline: [],
  upcomingFollowUps: [
    {
      id: "fu_sup_1",
      leadId: "lead_sup_1",
      studentName: "Tariq Aziz (Document Verification)",
      scheduledTime: "Today • 2:30 PM",
      priority: "urgent",
      phone: "+92 300 4443322",
      email: "tariq.aziz@example.com",
      courseInterest: "Full Stack Development",
      notes: "Verify high school transcript and payment slip for Apex Academy admission #ADM-882.",
    },
  ],
  recentActivity: [
    {
      id: "act_sup_1",
      type: "lead_contacted",
      title: "Verification Approved",
      description: "Approved identity credential for student #ADM-880.",
      timestamp: "45 minutes ago",
      actor: "Marcus Brody (Support)",
    },
    {
      id: "act_sup_2",
      type: "follow_up_scheduled",
      title: "Ticket Escalation",
      description: "Assisted partner counselor with lead duplicate resolution.",
      timestamp: "2 hours ago",
      actor: "Marcus Brody (Support)",
    },
  ],
  supportMetrics: {
    pendingVerifications: 9,
    openTickets: 5,
    resolvedToday: 14,
    systemHealth: "optimal",
  },
};

export const dashboardService = {
  /**
   * Fetch aggregate dashboard summary for the active role & partner context
   * TODO-CONTRACT: Connect to GET /api/v1/dashboard/summary once backend provisions aggregate route
   */
  async getDashboardSummary(
    role: UserRole = "partner_admin",
    partnerId?: string | null,
    options?: { simulateError?: boolean; simulateEmpty?: boolean }
  ): Promise<DashboardSummaryData> {
    // Realistic API network simulation
    await new Promise((resolve) => setTimeout(resolve, 450));

    if (options?.simulateError) {
      const error: NormalizedError = {
        isNormalized: true,
        code: "DASHBOARD_SERVICE_UNAVAILABLE",
        message: "Failed to load dashboard metrics. The analytics service did not respond.",
        statusCode: 503,
      };
      throw error;
    }

    if (options?.simulateEmpty) {
      return {
        role,
        partnerId,
        lastUpdated: new Date().toISOString(),
        kpis: [],
        pipeline: [],
        upcomingFollowUps: [],
        recentActivity: [],
      };
    }

    switch (role) {
      case "super_admin":
        return SUPER_ADMIN_FIXTURE;
      case "team_member":
      case "counselor":
        return TEAM_MEMBER_FIXTURE;
      case "support":
        return SUPPORT_FIXTURE;
      case "partner_admin":
      default:
        return PARTNER_ADMIN_FIXTURE;
    }
  },
};
