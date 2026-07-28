import type { ZodError } from "zod";

// Keeps only the first message per field, indexed by path ("." for nested fields).
export const fieldErrors = (error: ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_global";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
};
