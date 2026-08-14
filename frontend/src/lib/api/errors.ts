import axios, { AxiosError } from "axios";

type ErrorValue = string | string[] | Record<string, string | string[]>;

interface ApiErrorBody {
  detail?: string;
  message?: string;
  non_field_errors?: string[];
  [key: string]: ErrorValue | undefined;
}

const flattenFieldErrors = (value: ErrorValue): string[] => {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((nestedValue) => flattenFieldErrors(nestedValue));
  }

  return [];
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const axiosError = error as AxiosError<ApiErrorBody>;
  const data = axiosError.response?.data;

  if (!data) {
    return "Network error. Please check your connection and try again.";
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.message) {
    return data.message;
  }

  if (data.non_field_errors?.length) {
    return data.non_field_errors.join(" ");
  }

  const fieldErrorMessages = Object.entries(data)
    .filter(([key]) => !["detail", "message", "non_field_errors"].includes(key))
    .flatMap(([, value]) => (value ? flattenFieldErrors(value) : []));

  if (fieldErrorMessages.length) {
    return fieldErrorMessages.join(" ");
  }

  return fallback;
};
