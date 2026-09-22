"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Archive,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { courseService } from "@/services/api/courseService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { Course } from "@/types/course";

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("6 months");
  const [fee, setFee] = useState("55000");
  const [description, setDescription] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["courses", search],
    queryFn: () =>
      courseService.getCourses({
        page: 1,
        limit: 50,
        search: search.trim() || undefined,
      }),
  });

  const courses = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      courseService.createCourse({
        title: title.trim(),
        duration: duration.trim(),
        fee: Number(fee),
        description: description.trim() || null,
      }),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      addToast({
        type: "success",
        title: "Course Created",
        message: `${course.title} is now in the global catalog.`,
      });
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      setDuration("6 months");
      setFee("55000");
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Create Failed",
        message: (err as { message?: string })?.message || "Could not create course.",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" | "ARCHIVED" }) =>
      courseService.changeCourseStatus(id, status),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      addToast({
        type: "info",
        title: "Course Updated",
        message: `${course.title} is now ${course.status}.`,
      });
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Status Change Failed",
        message: (err as { message?: string })?.message || "Could not update course status.",
      });
    },
  });

  const getStatusBadge = (course: Course) => {
    switch (course.status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
            <Archive className="w-3 h-3" />
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Catalog</h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {data?.meta.total ?? courses.length} Courses
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global program catalog used for admissions and commission rules.
            {!isSuperAdmin && " Read-only for your role."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>
          {isSuperAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Course
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search course title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingState colSpan={5} />
          ) : courses.length === 0 ? (
            <TableEmptyState
              colSpan={5}
              title="No courses found"
              description="Super Admin can add programs to the global catalog."
            />
          ) : (
            courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">{course.title}</div>
                      {course.description && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {course.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-700">{course.duration || "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-slate-900">
                    ₹{course.fee.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(course)}</TableCell>
                <TableCell className="text-right">
                  {isSuperAdmin ? (
                    <div className="inline-flex items-center gap-2">
                      {course.status === "active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({ id: course.id, status: "INACTIVE" })
                          }
                          disabled={statusMutation.isPending}
                        >
                          Deactivate
                        </Button>
                      ) : course.status === "inactive" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({ id: course.id, status: "ACTIVE" })
                          }
                          disabled={statusMutation.isPending}
                        >
                          Activate
                        </Button>
                      ) : null}
                      {course.status !== "archived" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({ id: course.id, status: "ARCHIVED" })
                          }
                          disabled={statusMutation.isPending}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">View only</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Course"
        description="Creates a global catalog entry (Super Admin only)."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!title.trim() || !duration.trim() || Number(fee) <= 0) {
                  addToast({
                    type: "error",
                    title: "Missing Fields",
                    message: "Title, duration, and a positive fee are required.",
                  });
                  return;
                }
                createMutation.mutate();
              }}
              isLoading={createMutation.isPending}
            >
              Create Course
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Data Science & AI Immersive"
            required
            autoFocus
          />
          <Input
            label="Duration *"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 6 months"
            required
          />
          <Input
            label="Fee (INR) *"
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short program summary"
          />
        </div>
      </Modal>
    </div>
  );
}
