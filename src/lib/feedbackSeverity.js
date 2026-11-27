/** Map existing HTTP failures to presentation only; request handling stays in features. */
export function feedbackSeverity(error) {
  const status = error?.response?.status;
  return [400,401,403,404,409,422,429].includes(status) ? "warning" : "error";
}

/** The same background failure should not reopen a dismissed popup on each poll. */
export function feedbackIdentity(error) {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  return JSON.stringify([error.response?.status, error.response?.data?.message, error.code, error.message]);
}

/** Localize server-owned captions only; never translate user-entered content. */
export function feedbackText(value, error) {
  if (typeof value !== "string" || !/[\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/.test(value)) return value;
  const serverMessages = typeof error === "string" ? [error] : [error?.response?.data?.message, error?.response?.data?.detail, error?.response?.data?.error, error?.message];
  if (!serverMessages.includes(value.trim())) return value;
  return ({
    400: "Some information is invalid. Check the form and try again.",
    401: "Your session has expired. Please sign in again.",
    403: "You do not have permission to perform this action.",
    404: "The requested item is unavailable in this workspace.",
    409: "This record has changed. Refresh before trying again.",
    422: "Check the required information and try again.",
    429: "You have reached the limit for this action. Please review the requirements before trying again.",
  })[error?.response?.status] || "Unable to complete your request. Please try again.";
}
