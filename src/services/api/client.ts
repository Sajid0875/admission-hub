import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ApiErrorResponse, ApiSuccessResponse, NormalizedError, PaginatedResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

/**
 * Normalized Error Type Guard
 */
export function isNormalizedError(error: unknown): error is NormalizedError {
  return typeof error === "object" && error !== null && (error as NormalizedError).isNormalized === true;
}

/**
 * Normalize any API/Network error into a standard structure
 */
export function normalizeApiError(error: unknown): NormalizedError {
  if (isNormalizedError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const status = axiosError.response?.status || 500;
    const responseData = axiosError.response?.data;

    // Check if backend returned structured error
    if (responseData && typeof responseData === "object" && "error" in responseData) {
      const errPayload = responseData.error;
      return {
        isNormalized: true,
        code: errPayload.code || `HTTP_${status}`,
        message: errPayload.message || axiosError.message || "An unexpected error occurred",
        statusCode: status,
        details: errPayload.details,
        rawError: error,
      };
    }

    // Handle standard HTTP status codes
    let code = `HTTP_${status}`;
    let message = axiosError.message || "Request failed";

    switch (status) {
      case 400:
        code = "VALIDATION_ERROR";
        message = "The request payload failed validation. Please check the highlighted fields.";
        break;
      case 401:
        code = "UNAUTHENTICATED";
        message = "Your session has expired. Please sign in again.";
        break;
      case 403:
        code = "FORBIDDEN";
        message = "Access restricted: You do not have sufficient permissions to perform this action.";
        break;
      case 404:
        code = "NOT_FOUND";
        message = "The requested resource was not found.";
        break;
      case 409:
        code = "DUPLICATE_LEAD";
        message = "This phone number already exists as a lead for this partner.";
        break;
      case 422:
        code = "VALIDATION_ERROR";
        message = "Validation failed for the submitted data.";
        break;
      case 500:
      case 502:
      case 503:
        code = "SERVER_ERROR";
        message = "A server error occurred. Please try again later.";
        break;
    }

    // Network disconnection / timeout or macOS AirTunes port 5000 collision
    const serverHeader = String(axiosError.response?.headers?.["server"] || "");
    if (axiosError.code === "ECONNABORTED" || !axiosError.response || serverHeader.includes("AirTunes")) {
      code = "NETWORK_ERROR";
      message = "Unable to connect to server. Please check your network connection.";
    }

    return {
      isNormalized: true,
      code,
      message,
      statusCode: status,
      rawError: error,
    };
  }

  if (error instanceof Error) {
    return {
      isNormalized: true,
      code: "CLIENT_ERROR",
      message: error.message,
      statusCode: 0,
      rawError: error,
    };
  }

  return {
    isNormalized: true,
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred.",
    statusCode: 0,
    rawError: error,
  };
}

/**
 * Central Axios Instance
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Attach Auth Bearer Token
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(normalizeApiError(error));
  }
);

// Response Interceptor: Normalize Responses & Errors
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const normalized = normalizeApiError(error);

    // Handle token expiry / 401 session clearing
    if (normalized.statusCode === 401 && typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    // Handle 403 Forbidden
    if (normalized.statusCode === 403 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("auth:forbidden", {
          detail: { message: normalized.message },
        })
      );
    }

    return Promise.reject(normalized);
  }
);

/**
 * Reusable Typed API Client Entry Point
 */
export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.get<ApiSuccessResponse<T> | T>(url, config);
      if (res.data && typeof res.data === "object" && "data" in res.data && "success" in res.data) {
        return (res.data as ApiSuccessResponse<T>).data;
      }
      return res.data as T;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async getPaginated<T>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> {
    try {
      const res = await axiosInstance.get<PaginatedResponse<T>>(url, config);
      if (res.data && typeof res.data === "object" && "meta" in res.data) {
        return res.data;
      }
      // Fallback if data array is returned directly
      const rawData = (res.data as unknown as { data?: T[] })?.data || (Array.isArray(res.data) ? res.data : []);
      return {
        success: true,
        data: rawData as T[],
        meta: {
          page: 1,
          limit: (rawData as T[]).length || 20,
          total: (rawData as T[]).length || 0,
        },
      };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.post<ApiSuccessResponse<T> | T>(url, data, config);
      if (res.data && typeof res.data === "object" && "data" in res.data && "success" in res.data) {
        return (res.data as ApiSuccessResponse<T>).data;
      }
      return res.data as T;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.put<ApiSuccessResponse<T> | T>(url, data, config);
      if (res.data && typeof res.data === "object" && "data" in res.data && "success" in res.data) {
        return (res.data as ApiSuccessResponse<T>).data;
      }
      return res.data as T;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.patch<ApiSuccessResponse<T> | T>(url, data, config);
      if (res.data && typeof res.data === "object" && "data" in res.data && "success" in res.data) {
        return (res.data as ApiSuccessResponse<T>).data;
      }
      return res.data as T;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await axiosInstance.delete<ApiSuccessResponse<T> | T>(url, config);
      if (res.data && typeof res.data === "object" && "data" in res.data && "success" in res.data) {
        return (res.data as ApiSuccessResponse<T>).data;
      }
      return res.data as T;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  getRawInstance(): AxiosInstance {
    return axiosInstance;
  },
};
