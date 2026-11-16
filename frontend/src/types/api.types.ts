// Matches the actual Spring Boot ApiResponse<T> envelope exactly
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  errorCode: string | null;
  data: T | null;
  fieldErrors: Array<{ field: string; message: string }> | null;
  timestamp: string;
  correlationId: string | null;
}

// Matches the actual Spring Boot PagedResponse<T> envelope exactly
export interface PagedResponse<T> {
  content: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
