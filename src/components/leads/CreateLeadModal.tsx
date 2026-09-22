"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { useUIStore } from "@/stores/useUIStore";
import { leadService } from "@/services/api/leadService";
import { isNormalizedError } from "@/services/api/client";
import type { CreateLeadPayload, LeadPriority } from "@/types/lead";
import { User, Phone, Mail, MapPin, DollarSign, AlertTriangle, Check, BookOpen } from "lucide-react";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COURSE_OPTIONS = [
  { value: "course_ds", label: "Data Science & AI Immersive" },
  { value: "course_fs", label: "Full Stack Software Engineering" },
  { value: "course_cloud", label: "Cloud Architecture & DevOps" },
  { value: "course_ui", label: "UI/UX & Product Design" },
  { value: "course_cyber", label: "Cybersecurity Analyst Certificate" },
];

const SOURCE_OPTIONS = [
  { value: "website", label: "Website Form" },
  { value: "walk-in", label: "Campus Walk-in" },
  { value: "referral", label: "Student Referral" },
  { value: "social_media", label: "Social Media Campaign" },
  { value: "google_ads", label: "Google Search Ads" },
  { value: "education_fair", label: "Education Fair" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "high", label: "High Priority" },
  { value: "urgent", label: "Urgent Priority" },
];

export function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  // Form state
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [courseId, setCourseId] = useState("course_ds");
  const [source, setSource] = useState("website");
  const [priority, setPriority] = useState<LeadPriority>("high");
  const [budget, setBudget] = useState("");

  // Error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const resetForm = () => {
    setStudentName("");
    setPhone("");
    setWhatsapp("");
    setSameAsPhone(true);
    setEmail("");
    setCity("");
    setCourseId("course_ds");
    setSource("website");
    setPriority("high");
    setBudget("");
    setFieldErrors({});
    setDuplicateError(null);
    setGeneralError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!studentName.trim()) {
      errors.studentName = "Student full name is required.";
    } else if (studentName.trim().length < 2) {
      errors.studentName = "Name must be at least 2 characters.";
    }

    if (!phone.trim()) {
      errors.phone = "Primary contact phone number is required.";
    } else if (!/^[+]?[\d\s-]{7,16}$/.test(phone.trim())) {
      errors.phone = "Please enter a valid phone number with country code.";
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (budget.trim() && (isNaN(Number(budget)) || Number(budget) < 0)) {
      errors.budget = "Budget must be a positive number.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateLeadPayload) => {
      return await leadService.createLead(payload);
    },
    onSuccess: (newLead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      addToast({
        type: "success",
        title: "Lead Created Successfully",
        message: `${newLead.studentName} has been enrolled into the lead pipeline.`,
      });
      handleClose();
    },
    onError: (err: unknown) => {
      if (isNormalizedError(err)) {
        // 409 Conflict: Duplicate Lead
        if (err.statusCode === 409 || err.code === "DUPLICATE_LEAD" || err.code === "CONFLICT_OR_DUPLICATE") {
          setDuplicateError(
            err.message || "This phone number already exists as a lead for this partner"
          );
          return;
        }

        // 400 Bad Request: Map field validation errors
        if (err.statusCode === 400 && err.details) {
          const mapped: Record<string, string> = {};
          if (Array.isArray(err.details)) {
            err.details.forEach((d) => {
              if (d.field) mapped[d.field] = d.message;
            });
          }
          setFieldErrors(mapped);
          setGeneralError(err.message || "Validation failed for one or more fields.");
          return;
        }

        setGeneralError(err.message || "Failed to create lead. Please try again.");
      } else {
        setGeneralError("An unexpected network error occurred.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);
    setGeneralError(null);

    if (!validateForm()) return;

    const selectedCourse = COURSE_OPTIONS.find((c) => c.value === courseId);

    const payload: CreateLeadPayload = {
      studentName: studentName.trim(),
      phone: phone.trim(),
      whatsapp: sameAsPhone ? phone.trim() : whatsapp.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      courseId,
      courseInterest: selectedCourse?.label || "General Course Inquiry",
      source,
      priority,
      budget: budget.trim() ? Number(budget) : undefined,
    };

    createMutation.mutate(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Lead"
      description="Create a new student intake lead. Scoped automatically to your partner workspace."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={createMutation.isPending}
          >
            Create Lead
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 409 Duplicate Error Banner */}
        {duplicateError && (
          <Alert
            variant="error"
            title="Duplicate Lead Detected (HTTP 409)"
            className="animate-in fade-in duration-200"
          >
            <div className="flex flex-col gap-1 text-xs">
              <p>{duplicateError}</p>
              <p className="text-slate-600">
                To prevent duplicate commission assignment, duplicate phone numbers cannot be re-entered.
              </p>
            </div>
          </Alert>
        )}

        {/* General Error Banner */}
        {generalError && (
          <Alert variant="error" title="Submission Error" className="animate-in fade-in duration-200">
            {generalError}
          </Alert>
        )}

        {/* Student Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-slate-800 font-semibold text-xs uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Student Contact Details</span>
          </div>

          <Input
            label="Full Name *"
            placeholder="e.g. Aarav Sharma"
            value={studentName}
            onChange={(e) => {
              setStudentName(e.target.value);
              if (fieldErrors.studentName) {
                setFieldErrors((prev) => ({ ...prev, studentName: "" }));
              }
            }}
            error={fieldErrors.studentName}
            disabled={createMutation.isPending}
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number *"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => {
                const val = e.target.value;
                setPhone(val);
                if (sameAsPhone) setWhatsapp(val);
                if (duplicateError) setDuplicateError(null);
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: "" }));
                }
              }}
              error={fieldErrors.phone}
              disabled={createMutation.isPending}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">WhatsApp Number</label>
                <button
                  type="button"
                  onClick={() => {
                    setSameAsPhone(!sameAsPhone);
                    if (!sameAsPhone) setWhatsapp(phone);
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
                >
                  {sameAsPhone ? "✓ Same as phone" : "Use custom"}
                </button>
              </div>
              <Input
                placeholder="WhatsApp Number"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={sameAsPhone || createMutation.isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. student@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
              error={fieldErrors.email}
              disabled={createMutation.isPending}
            />

            <Input
              label="City / Location"
              placeholder="e.g. Mumbai, Maharashtra"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={createMutation.isPending}
            />
          </div>
        </div>

        {/* Program & Lead Routing Information */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-slate-800 font-semibold text-xs uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Academic Interest & Pipeline Intake</span>
          </div>

          <Select
            label="Interested Course *"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={COURSE_OPTIONS}
            disabled={createMutation.isPending}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Source Channel *"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={SOURCE_OPTIONS}
              disabled={createMutation.isPending}
            />

            <Select
              label="Intake Priority *"
              value={priority}
              onChange={(e) => setPriority(e.target.value as LeadPriority)}
              options={PRIORITY_OPTIONS}
              disabled={createMutation.isPending}
            />

            <Input
              label="Budget (INR)"
              type="number"
              placeholder="e.g. 45000"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                if (fieldErrors.budget) {
                  setFieldErrors((prev) => ({ ...prev, budget: "" }));
                }
              }}
              error={fieldErrors.budget}
              disabled={createMutation.isPending}
            />
          </div>
        </div>

        {/* Information Callout */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500">
          <p>
            • Tenant scoping: Automatically bound to your active partner context by the backend.
            <br />
            • Lead Scoring & Duplicate Detection are processed server-side upon record ingestion.
          </p>
        </div>
      </form>
    </Modal>
  );
}
