export interface SearchParamReader {
  get(name: string): string | null;
}

const PROVIDER_ERROR_STATUSES = new Set([
  "cancelled",
  "canceled",
  "failed",
  "failure",
  "declined",
  "denied",
  "error",
]);
const MAX_ERROR_MESSAGE_LENGTH = 240;

function readParam(params: SearchParamReader, names: string[]): string | null {
  for (const name of names) {
    const value = params.get(name)?.replace(/\s+/g, " ").trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function truncate(value: string, maxLength = MAX_ERROR_MESSAGE_LENGTH): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value;
}

export function getProviderReturnErrorMessage(
  params: SearchParamReader,
): string | null {
  const description = readParam(params, ["error_description", "error_message"]);
  const code = readParam(params, ["error", "error_code"]);
  const status = readParam(params, ["status", "payment_status"]);
  const normalizedStatus = status?.toLowerCase();
  const normalizedCode = code?.toLowerCase();
  const cancelledParam = readParam(params, ["cancelled", "canceled"]);
  const wasCancelled = ["1", "true", "yes"].includes(
    (cancelledParam ?? "").toLowerCase(),
  );
  const hasErrorStatus = Boolean(
    normalizedStatus &&
      PROVIDER_ERROR_STATUSES.has(normalizedStatus),
  );
  const hasCancelledCode = Boolean(
    normalizedCode && PROVIDER_ERROR_STATUSES.has(normalizedCode),
  );

  if (!description && !code && !hasErrorStatus && !wasCancelled) {
    return null;
  }

  if (description) {
    return truncate(description);
  }

  if (
    wasCancelled ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled" ||
    normalizedCode === "cancelled" ||
    normalizedCode === "canceled"
  ) {
    return "The payment was cancelled. No payment was completed.";
  }

  if (hasErrorStatus || hasCancelledCode) {
    return "The payment provider reported a failure. Please try again or choose another payment method.";
  }

  return `The payment provider reported an error${code ? ` (${truncate(code, 80)})` : ""}. Please try again.`;
}
