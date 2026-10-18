import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Where the UI and its JSON document are mounted, relative to the app root.
 */
export const SWAGGER_PATH = 'api/docs';

/**
 * Name of the cookie the auth controller issues. Documented as a security
 * scheme so the generated UI can present it alongside the bearer token
 * (issue #1951).
 */
export const SWAGGER_COOKIE_AUTH_NAME = 'accessToken';

export interface SwaggerEnvironment {
  NODE_ENV?: string;
  SWAGGER_ENABLED?: string;
  SWAGGER_USER?: string;
  SWAGGER_PASSWORD?: string;
  [key: string]: string | undefined;
}

/**
 * Swagger is a development tool. It exposes the entire API surface — every
 * admin route and the exact shape of every webhook — so it must never be on
 * by default in production (issue #1951). `SWAGGER_ENABLED=true` is the
 * explicit, auditable opt-in for a controlled environment.
 */
export function isSwaggerEnabled(
  env: SwaggerEnvironment = process.env,
): boolean {
  if (env.SWAGGER_ENABLED === 'true') {
    return true;
  }
  return env.NODE_ENV !== 'production';
}

/** Length-checked constant-time string comparison for the basic-auth check. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function basicAuthMiddleware(user: string, password: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() === 'basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator !== -1) {
        const inputUser = decoded.slice(0, separator);
        const inputPassword = decoded.slice(separator + 1);
        if (safeEqual(inputUser, user) && safeEqual(inputPassword, password)) {
          next();
          return;
        }
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="ManageHub API docs"');
    res.status(401).send('Authentication required');
  };
}

function buildDocumentConfig() {
  return new DocumentBuilder()
    .setTitle('ManageHub API')
    .setDescription(
      'ManageHub backend API.\n\n' +
        '## Payment state machine\n' +
        'INITIATED -> AWAITING_CONFIRMATION -> CONFIRMED | FAILED | EXPIRED\n' +
        'CONFIRMED -> REFUNDED | PARTIALLY_REFUNDED\n' +
        'All transitions are enforced by a single guarded service method.\n\n' +
        '## Credit ledger\n' +
        'Charges too small to settle on-chain per event move value inside a ' +
        'double-entry ledger instead: a charge debits the member and credits ' +
        'platform revenue, and value only crosses the platform boundary ' +
        'later, in one netted settlement batch per recipient.\n' +
        '- Every ledger transaction balances (debits == credits) and its ' +
        '`reference` is unique, so any retry is a no-op rather than a ' +
        'duplicate.\n' +
        '- A charge is refused if it would breach the account overdraft ' +
        'ceiling (0 by default), checked under the account row lock so ' +
        'concurrent charges cannot overdraw together.\n' +
        '- Revenue splits are basis points summing to exactly 10000, ' +
        'allocated by the largest-remainder method so rounding never loses ' +
        'or duplicates a minor unit.\n' +
        '- Settlement never marks a ledger entry settled until the payout ' +
        'rail confirms the transfer from fresh state.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(SWAGGER_COOKIE_AUTH_NAME)
    .build();
}

/**
 * Mounts Swagger UI + the OpenAPI document when enabled, optionally behind
 * HTTP basic auth. Returns whether it was actually served so callers and
 * tests can assert the decision without inspecting routes.
 */
export function setupSwagger(
  app: INestApplication,
  env: SwaggerEnvironment = process.env,
): boolean {
  const logger = new Logger('Swagger');

  if (!isSwaggerEnabled(env)) {
    logger.log(
      'Swagger UI and OpenAPI document are disabled (production default). ' +
        'Set SWAGGER_ENABLED=true to expose them.',
    );
    return false;
  }

  const document = SwaggerModule.createDocument(app, buildDocumentConfig());

  if (env.SWAGGER_USER && env.SWAGGER_PASSWORD) {
    app.use(
      `/${SWAGGER_PATH}`,
      basicAuthMiddleware(env.SWAGGER_USER, env.SWAGGER_PASSWORD),
    );
    logger.log('Swagger UI is protected with HTTP basic auth.');
  }

  SwaggerModule.setup(SWAGGER_PATH, app, document);
  logger.log(`Swagger UI served at /${SWAGGER_PATH}`);
  return true;
}
