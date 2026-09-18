/**
 * Shared API Response and Error Types
 * Standardized across the entire frontend application
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginatedMeta;
  message?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[] | Record<string, unknown>;
  statusCode?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginatedMeta;
}

export interface NormalizedError {
  isNormalized: true;
  code: string;
  message: string;
  statusCode: number;
  details?: ApiErrorDetail[] | Record<string, unknown>;
  rawError?: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
