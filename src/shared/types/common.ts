export type PaginatedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

export type ApiErrorShape = {
  message?: string;
};

export type AsyncState = "idle" | "loading" | "success" | "error";
