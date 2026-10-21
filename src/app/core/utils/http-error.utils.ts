import { HttpErrorResponse } from '@angular/common/http';

/** Extracts a user-facing message from any error thrown by an API call. */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Unable to reach the server. Check your connection.';
    const message = (error.error as { message?: string } | null)?.message;
    return message ?? fallback;
  }
  return fallback;
}
