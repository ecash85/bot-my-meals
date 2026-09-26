export const LOGIN_SAME_DEVICE_COPY =
  "Request the link on this phone, then open the email on this same phone.";

export const LOGIN_SAME_DEVICE_HELPER =
  "Opening the link on another device sends you back here.";

export const CHECK_EMAIL_TITLE = "Check your email";
export const CHECK_EMAIL_STATUS = "Link on its way";
export const CHECK_EMAIL_HELPER =
  "Opening the link on another device sends you back here.";
export const CHECK_EMAIL_RESEND = "Resend";
export const CHECK_EMAIL_DIFFERENT = "Use a different email";

export function checkEmailBody(email: string): string {
  return `We sent a sign-in link to ${email}. Open it on this same phone (Safari, not Gmail’s in-app browser).`;
}

export const LOGIN_CALLBACK_ERROR_PARAM = "error";
export const LOGIN_CALLBACK_ERROR_VALUE = "auth";

export const LOGIN_CALLBACK_FAILED_COPY =
  "Sign-in didn't finish on this browser. Request a new link on this phone and open it here (Safari, not Gmail's in-app browser).";

export function loginCallbackFailedPath(): string {
  return `/login?${LOGIN_CALLBACK_ERROR_PARAM}=${LOGIN_CALLBACK_ERROR_VALUE}`;
}

export function loginCallbackFailedMessage(
  errorParam: string | string[] | null | undefined,
): string | null {
  const value = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  return value === LOGIN_CALLBACK_ERROR_VALUE ? LOGIN_CALLBACK_FAILED_COPY : null;
}

export function safeAuthNext(next: string | string[] | null | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/week";
  }
  return value;
}

export function authCallbackRedirectPath({
  next,
  code,
  exchangeFailed,
}: {
  next: string;
  code: string | null;
  exchangeFailed: boolean;
}): string {
  if (code && exchangeFailed) {
    return loginCallbackFailedPath();
  }
  return safeAuthNext(next);
}
