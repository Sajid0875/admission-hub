import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type { Course, CourseStatus, CreateCoursePayload } from "@/types/course";
import { areMocksEnabled, isMockableOfflineError } from "@/lib/mocks";
import { normalizePaginatedResponse } from "@/lib/mappers";

export interface CourseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "all";
}

const SEED_COURSES: Course[] = [
  {
    id: "course_fs",
    title: "Full Stack Software Engineering",
    duration: "6 months",
    fee: 55000,
    description: "Mock full-stack program",
    status: "active",
    isActive: true,
  },
];

function shouldUseMockFallback(err: unknown): boolean {
  if (!areMocksEnabled()) return false;
  return isMockableOfflineError(err as NormalizedError);
}

function mapStatus(raw?: string): CourseStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "INACTIVE":
      return "inactive";
    case "ARCHIVED":
      return "archived";
    default:
      return "active";
  }
}

export function mapBackendCourse(raw: unknown): Course {
  const c = raw as {
    id: string;
    title?: string;
    description?: string | null;
    duration?: string;
    fee?: number;
    syllabusUrl?: string | null;
    brochureUrl?: string | null;
    demoUrl?: string | null;
    benefits?: string | null;
    faq?: string | null;
    status?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  const status = mapStatus(c.status);
  return {
    id: c.id,
    title: c.title ?? "Untitled Course",
    duration: c.duration,
    fee: Number(c.fee ?? 0),
    description: c.description ?? undefined,
    syllabusUrl: c.syllabusUrl ?? undefined,
    brochureUrl: c.brochureUrl ?? undefined,
    demoUrl: c.demoUrl ?? undefined,
    benefits: c.benefits ?? undefined,
    faq: c.faq ?? undefined,
    status,
    isActive: status === "active",
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined,
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
  };
}

export const courseService = {
  async getCourses(params: CourseQueryParams = {}): Promise<PaginatedResponse<Course>> {
    const { page = 1, limit = 25, search = "", status = "all" } = params;
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", String(limit));
    if (search.trim()) q.set("search", search.trim());
    if (status !== "all") q.set("status", status);

    try {
      const raw = await apiClient.getRawInstance().get(`/courses?${q.toString()}`);
      return normalizePaginatedResponse(raw.data, mapBackendCourse);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return {
        success: true,
        data: SEED_COURSES,
        meta: {
          page: 1,
          limit: 25,
          total: SEED_COURSES.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  },

  async createCourse(payload: CreateCoursePayload): Promise<Course> {
    try {
      const res = await apiClient
        .getRawInstance()
        .post<{ course: unknown }>("/courses", payload);
      return mapBackendCourse(res.data.course ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return {
        id: `course_${Date.now()}`,
        title: payload.title,
        duration: payload.duration,
        fee: payload.fee,
        description: payload.description ?? undefined,
        status: "active",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    }
  },

  async changeCourseStatus(
    courseId: string,
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  ): Promise<Course> {
    try {
      const res = await apiClient
        .getRawInstance()
        .patch<{ course: unknown }>(`/courses/${courseId}/status`, { status });
      return mapBackendCourse(res.data.course ?? res.data);
    } catch (err: unknown) {
      throw err;
    }
  },
};
