/**
 * Request-id middleware (#1930).
 *
 * The bootstrap previously referenced `randomUUID` without importing it, which
 * broke request-id generation. This module imports it from `crypto` and
 * produces a request id for every request, honouring an incoming header.
 */
import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.length > 0 ? incoming : randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
