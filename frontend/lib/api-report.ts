import * as Sentry from "@sentry/nextjs";

export interface ApiErrorReportContext {
  api: string;
  method: string;
  pathTemplate: string;
  status: number;
  requestId?: string | null;
}

export function getRequestId(response: Response): string | null {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("request-id") ??
    null
  );
}

export function getApiErrorMessage(
  body: { message?: unknown } | null,
  fallback: string,
): string {
  if (body && typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message;
  }
  return fallback;
}

export function reportApiError(context: ApiErrorReportContext): void {
  const { api, method, pathTemplate, status, requestId } = context;
  const error = new Error(`${api} request failed (${status})`);

  Sentry.captureException(error, {
    tags: {
      api,
      statusCode: String(status),
    },
    // Report only non-sensitive metadata. Never attach request or response
    // bodies: they can contain plaintext passwords, tokens or signatures.
    extra: {
      method,
      pathTemplate,
      statusCode: status,
      requestId: requestId ?? null,
    },
  });
}
