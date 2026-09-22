/**
 * Course Domain Types
 */

export type CourseStatus = "active" | "inactive" | "archived";

export interface CourseFAQ {
  question: string;
  answer: string;
}

export interface Course {
  id: string;
  title: string;
  courseName?: string;
  code?: string;
  duration?: string;
  fee: number;
  description?: string;
  syllabus?: string[];
  syllabusUrl?: string;
  brochureUrl?: string;
  demoUrl?: string;
  benefits?: string | string[];
  faqs?: CourseFAQ[];
  faq?: string;
  status: CourseStatus;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCoursePayload {
  title: string;
  duration: string;
  fee: number;
  description?: string | null;
  syllabusUrl?: string | null;
  brochureUrl?: string | null;
  demoUrl?: string | null;
  benefits?: string | null;
  faq?: string | null;
}
