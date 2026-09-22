"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableLoadingState,
  TableEmptyState,
} from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { commissionRuleService } from "@/services/api/commissionRuleService";
import { courseService } from "@/services/api/courseService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { CommissionRule, CommissionRuleType } from "@/types/commission";

export default function CommissionRulesPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<CommissionRule | null>(null);
  const [deleteRule, setDeleteRule] = useState<CommissionRule | null>(null);

  const [courseId, setCourseId] = useState("");
  const [commissionType, setCommissionType] = useState<CommissionRuleType>("PERCENTAGE");
  const [rate, setRate] = useState("10");
  const [partnerType, setPartnerType] = useState("");

  const [editRate, setEditRate] = useState("");
  const [editType, setEditType] = useState<CommissionRuleType>("PERCENTAGE");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["commission-rules"],
    queryFn: () => commissionRuleService.getRules({ page: 1, limit: 50 }),
    enabled: isSuperAdmin,
  });

  const { data: coursesPage } = useQuery({
    queryKey: ["courses", "rules-picker"],
    queryFn: () => courseService.getCourses({ page: 1, limit: 50 }),
    enabled: isSuperAdmin,
  });

  const rules = data?.data ?? [];
  const courseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of coursesPage?.data ?? []) {
      map.set(c.id, c.title);
    }
    return map;
  }, [coursesPage?.data]);

  const courseOptions = [
    { value: "", label: "Global default (no course)" },
    ...(coursesPage?.data ?? []).map((c) => ({
      value: c.id,
      label: c.title,
    })),
  ];

  const resetCreateForm = () => {
    setCourseId("");
    setCommissionType("PERCENTAGE");
    setRate("10");
    setPartnerType("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      commissionRuleService.createRule({
        courseId: courseId || null,
        partnerType: partnerType.trim() || null,
        commissionType,
        rate: Number(rate),
      }),
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      addToast({
        type: "success",
        title: "Rule Created",
        message: `${formatRate(rule)} rule is now active.`,
      });
      setIsCreateOpen(false);
      resetCreateForm();
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Create Failed",
        message: (err as { message?: string })?.message || "Could not create commission rule.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editRule) throw new Error("No rule selected");
      return commissionRuleService.updateRule(editRule.id, {
        commissionType: editType,
        rate: Number(editRate),
      });
    },
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      addToast({
        type: "success",
        title: "Rule Updated",
        message: `Rate is now ${formatRate(rule)}.`,
      });
      setEditRule(null);
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Update Failed",
        message: (err as { message?: string })?.message || "Could not update commission rule.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commissionRuleService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      addToast({
        type: "info",
        title: "Rule Deleted",
        message: "Commission rule removed. Existing commission records keep their snapshot rate.",
      });
      setDeleteRule(null);
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: (err as { message?: string })?.message || "Could not delete commission rule.",
      });
    },
  });

  function formatRate(rule: CommissionRule): string {
    if (rule.commissionType === "PERCENTAGE") return `${rule.rate}%`;
    return `₹${rule.rate.toLocaleString()}`;
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <Alert variant="error" title="Super Admin only">
          Commission rules are global configuration. Partner roles cannot view or edit them.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Commission Rules</h1>
            <span className="bg-amber-50 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
              Super Admin
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Rate config applied when admissions are verified. Historical records keep their snapshot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Rule
          </Button>
        </div>
      </div>

      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Percentage rates use whole numbers (e.g. <strong>10</strong> = 10%). Flat rates are absolute amounts in INR.
          At most one rule per course is allowed.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Partner type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingState colSpan={5} />
            ) : rules.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                title="No commission rules"
                description="Create a percentage or flat rule to drive payout calculations."
              />
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium text-slate-900">
                    {rule.courseId
                      ? courseTitleById.get(rule.courseId) ?? (
                          <span className="font-mono text-[11px] text-slate-500">{rule.courseId}</span>
                        )
                      : "Global default"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                      <Percent className="w-3 h-3" />
                      {rule.commissionType}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">{formatRate(rule)}</TableCell>
                  <TableCell className="text-slate-600">{rule.partnerType || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditRule(rule);
                          setEditRate(String(rule.rate));
                          setEditType(rule.commissionType);
                        }}
                        leftIcon={<Pencil className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteRule(rule)}
                        leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetCreateForm();
        }}
        title="Create Commission Rule"
      >
        <div className="space-y-4">
          <Select
            label="Course"
            options={courseOptions}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          />
          <Select
            label="Commission type"
            options={[
              { value: "PERCENTAGE", label: "Percentage (%)" },
              { value: "FLAT", label: "Flat amount (₹)" },
            ]}
            value={commissionType}
            onChange={(e) => setCommissionType(e.target.value as CommissionRuleType)}
          />
          <Input
            label={commissionType === "PERCENTAGE" ? "Rate (%)" : "Flat amount (₹)"}
            type="number"
            min={0}
            max={commissionType === "PERCENTAGE" ? 100 : undefined}
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <Input
            label="Partner type (optional)"
            placeholder="e.g. franchise"
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !rate || Number(rate) < 0}
            >
              {createMutation.isPending ? "Creating…" : "Create Rule"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit */}
      <Modal
        isOpen={Boolean(editRule)}
        onClose={() => setEditRule(null)}
        title="Edit Commission Rule"
      >
        <div className="space-y-4">
          <Select
            label="Commission type"
            options={[
              { value: "PERCENTAGE", label: "Percentage (%)" },
              { value: "FLAT", label: "Flat amount (₹)" },
            ]}
            value={editType}
            onChange={(e) => setEditType(e.target.value as CommissionRuleType)}
          />
          <Input
            label={editType === "PERCENTAGE" ? "Rate (%)" : "Flat amount (₹)"}
            type="number"
            min={0}
            max={editType === "PERCENTAGE" ? 100 : undefined}
            step="0.01"
            value={editRate}
            onChange={(e) => setEditRate(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditRule(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editRate || Number(editRate) < 0}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={Boolean(deleteRule)}
        onClose={() => setDeleteRule(null)}
        title="Delete Commission Rule?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This permanently removes the rule. Existing commission ledger rows keep the rate they
            already snapped.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteRule(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteRule && deleteMutation.mutate(deleteRule.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Rule"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
