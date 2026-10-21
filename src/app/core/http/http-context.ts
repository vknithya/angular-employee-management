import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Set on a request when the caller shows its own error UI instead of the global toast. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function skipErrorToast(): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST, true);
}
