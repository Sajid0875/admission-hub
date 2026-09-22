"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Calendar,
  DollarSign,
  UserCheck,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Edit3,
  Save,
  X,
  History,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { LeadStatusBadge, LeadPriorityBadge, LeadScorePill } from "@/components/leads/LeadStatusBadge";
import { LeadPipelineStepper } from "@/components/leads/LeadPipelineStepper";
import { leadService } from "@/services/api/leadService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { LeadStatus, LeadPriority, UpdateLeadPayload, FollowupTask } from "@/types/lead";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = (params?.id as string) || "";
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  const currentUser = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // Edit lead state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    studentName: string;
    phone: string;
    whatsapp: string;
    email: string;
    city: string;
    priority: LeadPriority;
    notes: string;
    budget: string;
  }>({
    studentName: "",
    phone: "",
    whatsapp: "",
    email: "",
    city: "",
    priority: "medium",
    notes: "",
    budget: "",
  });
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // New follow-up task modal state
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState<boolean>(false);
  const [followupNotes, setFollowupNotes] = useState<string>("");
  const [followupDate, setFollowupDate] = useState<string>("");
  const [followupPriority, setFollowupPriority] = useState<LeadPriority>("medium");

  // Fetch lead data
  const {
    data: lead,
    isLoading: isLoadingLead,
    isError: isErrorLead,
    error: leadError,
  } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadService.getLeadById(leadId),
    enabled: !!leadId,
  });

  // Fetch activities
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: () => leadService.getLeadActivities(leadId),
    enabled: !!leadId,
  });

  // Fetch follow-ups
  const { data: followups = [], isLoading: isLoadingFollowups } = useQuery({
    queryKey: ["lead-followups", leadId],
    queryFn: () => leadService.getLeadFollowups(leadId),
    enabled: !!leadId,
  });

  // Populate edit form when lead is loaded
  useEffect(() => {
    if (lead) {
      setEditForm({
        studentName: lead.studentName || "",
        phone: lead.phone || "",
        whatsapp: lead.whatsapp || lead.phone || "",
        email: lead.email || "",
        city: lead.city || "",
        priority: lead.priority || "medium",
        notes: lead.notes || "",
        budget: lead.budget ? String(lead.budget) : "",
      });
      setIsDirty(false);
    }
  }, [lead]);

  // Permission checks:
  // Super Admin & Partner Admin have full update access.
  // Team Member / Counselor has access if assigned to them or has lead:update.
  const isOwner = lead?.assignedTo === currentUser?.id || !lead?.assignedTo;
  const canUpdate =
    hasPermission("lead:update") || (currentUser?.role === "team_member" && isOwner);

  // Mutation to update lead fields/status
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateLeadPayload) => leadService.updateLead(leadId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      addToast({
        type: "success",
        title: "Lead Updated",
        message: `Changes to ${updated.studentName} were saved.`,
      });
      setIsEditing(false);
      setIsDirty(false);
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Update Failed",
        message: (err as Error)?.message || "Failed to update lead.",
      });
    },
  });

  // Mutation to create follow-up task
  const createFollowupMutation = useMutation({
    mutationFn: (task: Omit<FollowupTask, "id" | "leadId">) =>
      leadService.createFollowup(leadId, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-followups", leadId] });
      addToast({
        type: "success",
        title: "Follow-up Scheduled",
        message: "New reminder has been assigned to this lead.",
      });
      setIsFollowupModalOpen(false);
      setFollowupNotes("");
      setFollowupDate("");
    },
  });

  const handleStatusTransition = (newStatus: LeadStatus) => {
    if (!canUpdate) {
      addToast({
        type: "error",
        title: "Access Restricted",
        message: "You do not have permission to transition lead stages.",
      });
      return;
    }
    updateMutation.mutate({ status: newStatus });
  };

  const handleFieldChange = (key: keyof typeof editForm, val: string) => {
    setEditForm((prev) => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      studentName: editForm.studentName.trim(),
      phone: editForm.phone.trim(),
      whatsapp: editForm.whatsapp.trim() || undefined,
      email: editForm.email.trim() || undefined,
      city: editForm.city.trim() || undefined,
      priority: editForm.priority,
      notes: editForm.notes.trim() || undefined,
      budget: editForm.budget ? Number(editForm.budget) : undefined,
    });
  };

  const handleCancelEdit = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditing(false);
    }
  };

  if (isLoadingLead) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading lead details...</p>
      </div>
    );
  }

  if (isErrorLead || !lead) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Lead Record Not Found</h2>
        <p className="text-xs text-slate-500">
          {(leadError as Error)?.message || "The requested lead does not exist or was deleted."}
        </p>
        <Link href="/leads">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Leads Inbox
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors p-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </Link>

        <div className="flex items-center gap-2">
          {canUpdate && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Edit Details
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFollowupModalOpen(true)}
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
          >
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {isEditing && isDirty && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <span className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Unsaved Changes: You have modified lead fields. Remember to save your changes.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              isLoading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Lead Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{lead.studentName}</h1>
            <LeadStatusBadge status={lead.status} />
            {lead.isDuplicate && (
              <span className="text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                Duplicate Detected
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-600">
            {lead.courseInterest || "General Academic Inquiry"}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
            <span>Intake ID: <strong className="font-mono text-slate-600">{lead._id || lead.id}</strong></span>
            <span>•</span>
            <span>Channel: <strong className="capitalize text-slate-600">{lead.source || "Website"}</strong></span>
          </div>
        </div>

        {/* Lead Score & Priority Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center min-w-[100px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Lead Score
            </span>
            <div className="mt-1">
              <LeadScorePill score={lead.leadScore} />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center min-w-[100px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Priority
            </span>
            <div className="mt-1">
              <LeadPriorityBadge priority={lead.priority} />
            </div>
          </div>
        </div>
      </div>

      {/* Status Pipeline Visualizer Stepper */}
      <LeadPipelineStepper
        currentStatus={lead.status}
        onStatusSelect={handleStatusTransition}
        canEdit={canUpdate}
        isUpdating={updateMutation.isPending}
      />

      {/* Main Grid: Details + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Contact, Academic, & Counseling Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Edit Form or Read-Only Profile */}
          {isEditing ? (
            <form
              onSubmit={handleSaveEdit}
              className="bg-white rounded-2xl border border-blue-200 p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  Edit Student & Intake Information
                </h3>
                <span className="text-xs text-slate-400">Multi-tenant backend scoped</span>
              </div>

              <div className="space-y-3">
                <Input
                  label="Student Full Name"
                  value={editForm.studentName}
                  onChange={(e) => handleFieldChange("studentName", e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Phone Number"
                    value={editForm.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    required
                  />
                  <Input
                    label="WhatsApp Number"
                    value={editForm.whatsapp}
                    onChange={(e) => handleFieldChange("whatsapp", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Email Address"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                  />
                  <Input
                    label="City / Location"
                    value={editForm.city}
                    onChange={(e) => handleFieldChange("city", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Lead Priority"
                    value={editForm.priority}
                    onChange={(e) => handleFieldChange("priority", e.target.value)}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                      { value: "urgent", label: "Urgent" },
                    ]}
                  />
                  <Input
                    label="Budget (INR)"
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => handleFieldChange("budget", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Counselor Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => handleFieldChange("notes", e.target.value)}
                    placeholder="Enter discussion summary, student preferences, or follow-up notes..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={updateMutation.isPending}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Contact Channels
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium">Phone</div>
                        <div className="text-xs font-semibold text-slate-800 font-mono">{lead.phone}</div>
                      </div>
                    </div>
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-xs font-semibold text-blue-600 hover:underline p-1"
                    >
                      Call
                    </a>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium">WhatsApp</div>
                        <div className="text-xs font-semibold text-slate-800 font-mono">
                          {lead.whatsapp || lead.phone}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${(lead.whatsapp || lead.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-emerald-600 hover:underline p-1"
                    >
                      Chat
                    </a>
                  </div>

                  {/* Email */}
                  {lead.email && (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400 font-medium">Email</div>
                          <div className="text-xs font-semibold text-slate-800">{lead.email}</div>
                        </div>
                      </div>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline p-1"
                      >
                        Send Email
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic & Counselor Notes */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Academic Profile & Notes
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Course Interest</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {lead.courseInterest || "General Inquiry"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">City Location</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {lead.city || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Budget Range</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {lead.budget ? `₹${lead.budget.toLocaleString()}` : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Assigned Counselor</span>
                    <span className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      {lead.assignedUserName || lead.assignedTo || "Unassigned"}
                    </span>
                  </div>
                </div>

                {lead.notes && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Notes
                    </span>
                    <p className="text-slate-700 leading-relaxed">{lead.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Scheduled Follow-up Tasks
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFollowupModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Task
              </Button>
            </div>

            {isLoadingFollowups ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading tasks...</div>
            ) : followups.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No active follow-up tasks. Click &quot;Add Task&quot; to set a reminder.
              </div>
            ) : (
              <div className="space-y-2.5">
                {followups.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            task.status === "completed" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        <span className="font-semibold text-slate-800">
                          {task.notes || "Follow up with student"}
                        </span>
                        <LeadPriorityBadge priority={task.priority} />
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 font-medium pl-4">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Due: {new Date(task.dueDate).toLocaleString()}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        task.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Activity Timeline */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Audit & Activity Timeline
              </h3>
              <span className="text-[11px] text-slate-400">Chronological</span>
            </div>

            {isLoadingActivities ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading activities...</div>
            ) : activities.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No activity records logged yet.
              </div>
            ) : (
              <div className="relative pl-5 border-l-2 border-slate-200 space-y-5 pt-1">
                {activities.map((act) => (
                  <div key={act.id} className="relative group">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[25px] top-1.5 ring-4 ring-white shadow-2xs" />
                    <div className="text-[11px] text-slate-400 font-medium">
                      {new Date(act.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">
                      {act.description}
                    </div>
                    {act.performedBy && (
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span>By:</span>
                        <strong className="text-slate-600 font-medium">{act.performedBy}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discard Changes Warning Modal */}
      <Modal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits on this lead record. Are you sure you want to discard them?"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setShowDiscardConfirm(false)}>
              Keep Editing
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setShowDiscardConfirm(false);
                setIsEditing(false);
                setIsDirty(false);
                if (lead) {
                  setEditForm({
                    studentName: lead.studentName || "",
                    phone: lead.phone || "",
                    whatsapp: lead.whatsapp || lead.phone || "",
                    email: lead.email || "",
                    city: lead.city || "",
                    priority: lead.priority || "medium",
                    notes: lead.notes || "",
                    budget: lead.budget ? String(lead.budget) : "",
                  });
                }
              }}
            >
              Discard Changes
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600">
          All modifications made during this edit session will be reset to their current server values.
        </p>
      </Modal>

      {/* Add Follow-up Task Modal */}
      <Modal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        title="Schedule Follow-up Task"
        description="Set a reminder date and notes for this student lead."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsFollowupModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!followupNotes.trim()) {
                  addToast({
                    type: "error",
                    title: "Missing Notes",
                    message: "Please enter task description or notes.",
                  });
                  return;
                }
                createFollowupMutation.mutate({
                  dueDate: followupDate || new Date(Date.now() + 86400000).toISOString(),
                  priority: followupPriority,
                  status: "pending",
                  notes: followupNotes.trim(),
                });
              }}
              isLoading={createFollowupMutation.isPending}
            >
              Schedule Task
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Task Description *"
            placeholder="e.g. Call student to discuss semester fee discount"
            value={followupNotes}
            onChange={(e) => setFollowupNotes(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Due Date & Time"
              type="datetime-local"
              value={followupDate}
              onChange={(e) => setFollowupDate(e.target.value)}
            />

            <Select
              label="Task Priority"
              value={followupPriority}
              onChange={(e) => setFollowupPriority(e.target.value as LeadPriority)}
              options={[
                { value: "low", label: "Low Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "high", label: "High Priority" },
                { value: "urgent", label: "Urgent Priority" },
              ]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
