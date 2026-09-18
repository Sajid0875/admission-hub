/**
 * Course Domain Types
 */

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
  benefits?: string[];
  faqs?: CourseFAQ[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
