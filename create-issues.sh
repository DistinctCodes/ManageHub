#!/bin/bash

REPO="CodeGirlsInc/SMALDA"
LABEL="backend"

# ─── CRITICAL BUGS ────────────────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-01] Fix incomplete buildDataKey() in StellarService" \
  --label "$LABEL" \
  --body "## Overview
\`buildDataKey()\` returns the string \`\"doc_\"\` without appending the sanitized hash. This breaks **all** Stellar anchoring operations since every document gets stored under the same key.

## File
\`src/stellar/stellar.service.ts\`

## Acceptance Criteria
- [ ] Complete the return statement so it returns \`\"doc_\" + sanitized hash (first 58 chars)\`
- [ ] All Stellar anchoring operations store documents under unique keys
- [ ] Add a unit test verifying the key format for a known hash input"
echo "✓ Issue 1 created"

gh.exe issue create --repo $REPO \
  --title "[BE-02] Fix malformed ternary in GitHub OAuth callback" \
  --label "$LABEL" \
  --body "## Overview
The GitHub OAuth callback contains a syntax error on the identifier assignment:
\`\`\`ts
const identifier = email || (githubId ? github: : null);
\`\`\`
This causes a compile-time failure. The second operand should be \`githubId\`, not \`github:\`.

## File
\`src/auth/auth.controller.ts\`

## Acceptance Criteria
- [ ] Fix the ternary so it reads \`githubId ? githubId : null\`
- [ ] GitHub OAuth callback compiles and resolves without errors"
echo "✓ Issue 2 created"

gh.exe issue create --repo $REPO \
  --title "[BE-03] Fix broken template string in HttpExceptionFilter" \
  --label "$LABEL" \
  --body "## Overview
The logger statement in the HTTP exception filter contains an incomplete template literal/variable that causes a syntax error, breaking global error handling across the entire application.

## File
\`src/common/filters/http-exception.filter.ts\`

## Acceptance Criteria
- [ ] Fix the incomplete template literal in the logger statement
- [ ] Global HTTP exception filter handles all errors correctly
- [ ] Error responses return the correct status code and message"
echo "✓ Issue 3 created"

gh.exe issue create --repo $REPO \
  --title "[BE-04] Fix missing backticks around template strings in OAuth strategies" \
  --label "$LABEL" \
  --body "## Overview
Both \`GoogleStrategy\` and \`GithubStrategy\` use an unquoted template expression for \`callbackURL\` when the env variable is absent:
\`\`\`ts
\${configService.get<string>('APP_URL') || 'http://localhost:6004'}/api/auth/google/callback
\`\`\`
These must be wrapped in backtick template literals or the strategies will fail to initialize.

## Files
- \`src/auth/strategies/google.strategy.ts\`
- \`src/auth/strategies/github.strategy.ts\`

## Acceptance Criteria
- [ ] Wrap fallback callback URLs in backtick template literals in both strategy files
- [ ] Google OAuth strategy initializes correctly when \`GOOGLE_CALLBACK_URL\` is not set
- [ ] GitHub OAuth strategy initializes correctly when \`GITHUB_CALLBACK_URL\` is not set"
echo "✓ Issue 4 created"

gh.exe issue create --repo $REPO \
  --title "[BE-05] Fix GitHub OAuth missing email fallback logic" \
  --label "$LABEL" \
  --body "## Overview
When a GitHub user has no public email, the fallback references an undefined variable (\`github\` instead of \`githubId\`). Additionally, using a GitHub numeric ID as an email will fail the email uniqueness constraint in the database.

## File
\`src/auth/auth.controller.ts\`

## Acceptance Criteria
- [ ] Generate a synthetic email using the pattern \`github_{id}@github.placeholder\` when no public email is available
- [ ] OR explicitly request the \`user:email\` scope so GitHub always returns an email
- [ ] GitHub OAuth login succeeds for users with private/no public email"
echo "✓ Issue 5 created"

# ─── MISSING CONTROLLERS & ENDPOINTS ─────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-06] Create UsersController with full CRUD endpoints" \
  --label "$LABEL" \
  --body "## Overview
No user-facing controller exists. Users have no way to view or manage their own profile through the API.

## Endpoints to Implement
| Method | Path | Description |
|--------|------|-------------|
| \`GET\` | \`/api/users/me\` | Get current user profile |
| \`PATCH\` | \`/api/users/me\` | Update own profile |
| \`DELETE\` | \`/api/users/me\` | Soft-delete own account |
| \`GET\` | \`/api/users\` | List all users (ADMIN only) |
| \`GET\` | \`/api/users/:id\` | Get user by ID (ADMIN only) |
| \`DELETE\` | \`/api/users/:id\` | Delete user by ID (ADMIN only) |

## Acceptance Criteria
- [ ] All endpoints protected with \`JwtAuthGuard\`
- [ ] Admin-only endpoints reject non-admin users with 403
- [ ] Responses use \`UserResponseDto\` (no \`passwordHash\` exposed)
- [ ] Soft-delete sets \`deletedAt\` without permanently removing the record"
echo "✓ Issue 6 created"

gh.exe issue create --repo $REPO \
  --title "[BE-07] Add document listing and retrieval endpoints" \
  --label "$LABEL" \
  --body "## Overview
Currently there is no way to list or retrieve existing documents through the API. Users can upload but never see their files again.

## Endpoints to Implement
| Method | Path | Description |
|--------|------|-------------|
| \`GET\` | \`/api/documents\` | List current user's documents |
| \`GET\` | \`/api/documents/:id\` | Get single document by ID |
| \`DELETE\` | \`/api/documents/:id\` | Delete a document |

## Acceptance Criteria
- [ ] List endpoint supports pagination via \`page\` and \`limit\` query params
- [ ] Users can only access their own documents
- [ ] Returns \`404\` when document is not found
- [ ] Returns \`403\` when user does not own the document"
echo "✓ Issue 7 created"

gh.exe issue create --repo $REPO \
  --title "[BE-08] Add document file download endpoint" \
  --label "$LABEL" \
  --body "## Overview
Users can upload documents but cannot download or retrieve the actual file content. A download endpoint is required to complete the document lifecycle.

## Endpoint to Implement
\`GET /api/documents/:id/file\`

## Acceptance Criteria
- [ ] Streams the file from disk using NestJS \`StreamableFile\`
- [ ] Sets correct \`Content-Type\` header based on stored \`mimeType\`
- [ ] Sets \`Content-Disposition: attachment\` header with original filename
- [ ] Returns \`404\` if document or file is not found
- [ ] Only the document owner or an admin can download the file"
echo "✓ Issue 8 created"

gh.exe issue create --repo $REPO \
  --title "[BE-09] Add health check endpoint using @nestjs/terminus" \
  --label "$LABEL" \
  --body "## Overview
\`@nestjs/terminus\` is installed but never used. There is no way to verify that the application's dependencies (database, Redis) are healthy, which makes monitoring and deployment checks impossible.

## Acceptance Criteria
- [ ] Create a \`HealthModule\` with \`GET /api/health\`
- [ ] Check PostgreSQL connectivity via \`TypeOrmHealthIndicator\`
- [ ] Check Redis connectivity via a custom or built-in indicator
- [ ] Check disk storage threshold
- [ ] Returns \`200 OK\` when all checks pass, \`503\` when any check fails"
echo "✓ Issue 9 created"

gh.exe issue create --repo $REPO \
  --title "[BE-10] Add GET /api/verifications endpoint for admin audit" \
  --label "$LABEL" \
  --body "## Overview
Admins have no way to review verification records across all documents. A dedicated verification listing endpoint is needed for auditing and compliance.

## Acceptance Criteria
- [ ] Create a \`VerificationController\` with \`GET /api/verifications\`
- [ ] Supports filtering by \`status\` and date range (\`from\`, \`to\` query params)
- [ ] Supports pagination via \`page\` and \`limit\`
- [ ] Protected by \`JwtAuthGuard\` + admin \`RolesGuard\`
- [ ] Returns paginated list of \`VerificationResponseDto\`"
echo "✓ Issue 10 created"

# ─── MISSING DTOs & VALIDATION ────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-11] Create request and response DTOs for the Documents module" \
  --label "$LABEL" \
  --body "## Overview
No DTOs exist for the documents module. Endpoints accept and return raw data with no validation or shape guarantees.

## DTOs to Create
- \`CreateDocumentDto\` — \`title\` (required), optional metadata
- \`DocumentResponseDto\` — \`id\`, \`title\`, \`status\`, \`riskScore\`, \`riskFlags\`, \`createdAt\`
- \`UpdateDocumentStatusDto\` — \`status\` with \`DocumentStatus\` enum validation

## Acceptance Criteria
- [ ] All DTOs use \`class-validator\` decorators
- [ ] \`DocumentResponseDto\` excludes \`filePath\` (internal field)
- [ ] \`UpdateDocumentStatusDto\` rejects invalid status values with \`400\`
- [ ] DTOs are applied to all existing document endpoints"
echo "✓ Issue 11 created"

gh.exe issue create --repo $REPO \
  --title "[BE-12] Create UpdateUserDto and UserResponseDto" \
  --label "$LABEL" \
  --body "## Overview
No user DTOs exist. The \`UsersController\` (Issue #6) cannot be safely implemented without them.

## DTOs to Create
- \`UpdateUserDto\` — optional \`fullName\`, \`email\` with \`@IsOptional()\`, \`@IsEmail()\`
- \`UserResponseDto\` — \`id\`, \`email\`, \`fullName\`, \`role\`, \`isVerified\`, \`createdAt\`

## Acceptance Criteria
- [ ] \`UserResponseDto\` uses \`@Exclude()\` on \`passwordHash\` via \`class-transformer\`
- [ ] \`UpdateUserDto\` uses \`@PartialType\` from \`@nestjs/mapped-types\`
- [ ] Global \`ClassSerializerInterceptor\` is enabled to enforce \`@Exclude()\`"
echo "✓ Issue 12 created"

gh.exe issue create --repo $REPO \
  --title "[BE-13] Add shared PaginationDto for all list endpoints" \
  --label "$LABEL" \
  --body "## Overview
List endpoints have no pagination support. Without it, large datasets will cause slow queries and bloated responses.

## Implementation
Create \`src/common/dto/pagination.dto.ts\`:
\`\`\`ts
export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
\`\`\`

## Acceptance Criteria
- [ ] \`PaginationDto\` created in \`src/common/dto/\`
- [ ] Applied to documents list, users list, and verifications list endpoints
- [ ] Responses include \`data\`, \`total\`, \`page\`, and \`limit\` fields"
echo "✓ Issue 13 created"

gh.exe issue create --repo $REPO \
  --title "[BE-14] Add RiskAssessmentResponseDto" \
  --label "$LABEL" \
  --body "## Overview
The \`GET /api/documents/:id/risk\` endpoint returns raw service output with no defined shape. This makes API consumers fragile and the Swagger docs useless for this endpoint.

## DTO Fields
\`documentId\`, \`riskScore\`, \`riskFlags\` (array), \`assessedAt\`

## Acceptance Criteria
- [ ] \`RiskAssessmentResponseDto\` created with proper \`class-validator\` and \`@ApiProperty()\` decorators
- [ ] Applied to \`GET /api/documents/:id/risk\` controller method
- [ ] \`riskFlags\` typed as \`RiskFlag[]\` using the existing enum"
echo "✓ Issue 14 created"

gh.exe issue create --repo $REPO \
  --title "[BE-15] Add VerificationResponseDto" \
  --label "$LABEL" \
  --body "## Overview
Verification endpoints return raw entity data. A typed DTO is needed to define a stable API contract and enable proper Swagger documentation.

## DTO Fields
\`id\`, \`documentId\`, \`stellarTxHash\`, \`stellarLedger\`, \`anchoredAt\`, \`status\`

## Acceptance Criteria
- [ ] \`VerificationResponseDto\` created with \`@ApiProperty()\` decorators
- [ ] Applied to all verification-related controller endpoints
- [ ] \`status\` typed as \`VerificationStatus\` enum"
echo "✓ Issue 15 created"

# ─── SECURITY ─────────────────────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-16] Enable and configure ThrottlerModule for rate limiting" \
  --label "$LABEL" \
  --body "## Overview
\`@nestjs/throttler\` is installed but never configured. All endpoints are currently unprotected against brute-force and abuse.

## Acceptance Criteria
- [ ] Import \`ThrottlerModule.forRootAsync()\` in \`AppModule\` using \`THROTTLE_TTL\` and \`THROTTLE_LIMIT\` env variables
- [ ] Apply \`ThrottlerGuard\` globally via \`APP_GUARD\` provider
- [ ] Apply stricter per-route limits on \`POST /api/auth/login\` and \`POST /api/auth/register\`
- [ ] Return \`429 Too Many Requests\` with a \`Retry-After\` header when limit is exceeded"
echo "✓ Issue 16 created"

gh.exe issue create --repo $REPO \
  --title "[BE-17] Replace synchronize: true with TypeORM migrations" \
  --label "$LABEL" \
  --body "## Overview
\`synchronize: true\` is set in \`AppModule\`. This silently alters or drops database columns when entities change and is unsafe for any non-local environment.

## Steps Required
1. Set \`synchronize: false\` in \`TypeOrmModule\` config
2. Add a \`dataSource.ts\` file for the TypeORM CLI
3. Add \`migration:generate\`, \`migration:run\`, and \`migration:revert\` scripts to \`package.json\`
4. Generate an initial migration from current entities

## Acceptance Criteria
- [ ] \`synchronize: false\` in all environments
- [ ] \`npm run migration:run\` applies the initial schema
- [ ] \`npm run migration:revert\` rolls back the last migration
- [ ] CI/CD pipeline runs migrations before starting the app"
echo "✓ Issue 17 created"

gh.exe issue create --repo $REPO \
  --title "[BE-18] Add RolesGuard and @Roles() decorator" \
  --label "$LABEL" \
  --body "## Overview
\`UserRole\` enum (ADMIN/USER) is defined but never enforced at the controller level. Any authenticated user can access admin-only functionality.

## Implementation
- \`@Roles(...roles: UserRole[])\` custom decorator using \`SetMetadata\`
- \`RolesGuard\` that reads roles metadata from the handler and checks \`request.user.role\`

## Acceptance Criteria
- [ ] \`@Roles()\` decorator created in \`src/auth/decorators/\`
- [ ] \`RolesGuard\` registered globally or applied per-route
- [ ] Admin-only endpoints (user list, user delete, verification audit) reject USER role with \`403\`
- [ ] Unit test covering guard logic for both roles"
echo "✓ Issue 18 created"

gh.exe issue create --repo $REPO \
  --title "[BE-19] Validate Stellar hash input in StellarService" \
  --label "$LABEL" \
  --body "## Overview
\`anchorHash()\` and \`verifyHash()\` accept any string with no format validation. A malformed or oversized input could trigger unexpected Stellar SDK errors or produce invalid on-chain records.

## Acceptance Criteria
- [ ] Add regex validation for SHA-256 hex format: \`/^[a-f0-9]{64}\$/i\`
- [ ] Throw \`BadRequestException\` for any input that does not match
- [ ] Unit tests cover valid hash, short hash, non-hex string, and empty string inputs"
echo "✓ Issue 19 created"

gh.exe issue create --repo $REPO \
  --title "[BE-20] Sanitize and validate file uploads in DocumentsController" \
  --label "$LABEL" \
  --body "## Overview
The current upload interceptor only checks MIME type and file size. This is insufficient and leaves the app vulnerable to path traversal and MIME spoofing.

## Acceptance Criteria
- [ ] Whitelist file extensions: \`.pdf\`, \`.png\`, \`.jpg\`, \`.jpeg\`
- [ ] Validate MIME type matches actual file magic bytes, not just the declared MIME header
- [ ] Store uploaded files with UUID-based names (not original filenames) to prevent path traversal
- [ ] Ensure \`UPLOAD_DIR\` is outside the web root and not publicly accessible"
echo "✓ Issue 20 created"

gh.exe issue create --repo $REPO \
  --title "[BE-21] Remove hardcoded fallback secrets and enforce env validation" \
  --label "$LABEL" \
  --body "## Overview
Several config values fall back to hardcoded strings when env variables are missing (e.g., \`JWT_SECRET\`). This means the app can start in an insecure state without any warning.

## Acceptance Criteria
- [ ] Add \`Joi\` or \`zod\` schema validation to \`ConfigModule.forRoot()\`
- [ ] All required env variables are listed and typed in the validation schema
- [ ] App throws a descriptive error and refuses to start if any required variable is missing
- [ ] No hardcoded secret strings remain as fallback values in any config file"
echo "✓ Issue 21 created"

# ─── DATABASE & MIGRATIONS ────────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-22] Add migrations/ directory and initial migration file" \
  --label "$LABEL" \
  --body "## Overview
No migration files exist. Once \`synchronize: false\` is set (Issue #17), the database schema has no managed history and deployments will fail.

## Acceptance Criteria
- [ ] \`src/migrations/\` directory created
- [ ] Initial migration generated from current \`User\`, \`Document\`, and \`VerificationRecord\` entities
- [ ] Migration file committed to version control
- [ ] CI/CD pipeline runs \`migration:run\` on each deploy before starting the server"
echo "✓ Issue 22 created"

gh.exe issue create --repo $REPO \
  --title "[BE-23] Add indexes for common query patterns on entities" \
  --label "$LABEL" \
  --body "## Overview
Several frequently queried fields lack database indexes, which will cause slow full-table scans as data grows.

## Indexes to Add
- \`Document.ownerId\` — frequently filtered in user document queries
- \`Document.status\` — filtered in queue and listing
- \`Document.createdAt\` — used for sorting and pagination
- \`VerificationRecord.status\` — filtered in admin audit views
- \`User.isVerified\` — filtered in admin user management

## Acceptance Criteria
- [ ] TypeORM \`@Index()\` decorator added to all fields listed above
- [ ] A new migration is generated to reflect the index additions"
echo "✓ Issue 23 created"

gh.exe issue create --repo $REPO \
  --title "[BE-24] Enable soft deletes on Document and VerificationRecord entities" \
  --label "$LABEL" \
  --body "## Overview
\`User\` already uses \`@DeleteDateColumn()\` for soft deletes but \`Document\` and \`VerificationRecord\` do not. Hard-deleting these records destroys audit history and breaks the Stellar verification trail.

## Acceptance Criteria
- [ ] Add \`@DeleteDateColumn() deletedAt\` to \`Document\` entity
- [ ] Add \`@DeleteDateColumn() deletedAt\` to \`VerificationRecord\` entity
- [ ] All queries that should exclude deleted records use \`withDeleted: false\` (default)
- [ ] Admin endpoints can optionally include soft-deleted records using \`withDeleted: true\`
- [ ] Generate a migration for the new columns"
echo "✓ Issue 24 created"

# ─── QUEUE & ASYNC PROCESSING ─────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-25] Add dead-letter queue handling for failed jobs" \
  --label "$LABEL" \
  --body "## Overview
When a job exhausts all 3 retry attempts it is only logged. No state is updated, no notification is sent, and the document or verification record is left in a stale in-progress status forever.

## File
\`src/queue/document.processor.ts\`

## Acceptance Criteria
- [ ] Implement a \`failed\` event listener on the BullMQ worker
- [ ] Update document status to \`REJECTED\` when the \`analyze\` job permanently fails
- [ ] Update verification record status to \`FAILED\` when the \`anchor\` job permanently fails
- [ ] Send an alert email via \`MailService\` on permanent failure
- [ ] Log structured error details including job id, type, and error message"
echo "✓ Issue 25 created"

gh.exe issue create --repo $REPO \
  --title "[BE-26] Add job progress tracking and completion events" \
  --label "$LABEL" \
  --body "## Overview
Jobs complete silently with no progress updates. The frontend has no way to show real-time processing status to users.

## Acceptance Criteria
- [ ] Call \`job.updateProgress()\` at key steps inside the processor (e.g., 25% after risk flags, 75% after score calculation, 100% on completion)
- [ ] Emit \`EventEmitter2\` events on job completion and failure for internal pub-sub
- [ ] Document the event names and payload shapes in a comment block"
echo "✓ Issue 26 created"

gh.exe issue create --repo $REPO \
  --title "[BE-27] Implement queue monitoring endpoint for admins" \
  --label "$LABEL" \
  --body "## Overview
There is no visibility into the BullMQ queue state. Failed or stuck jobs are invisible until they cause user-facing problems.

## Endpoint to Implement
\`GET /api/queue/stats\` — admin only

## Acceptance Criteria
- [ ] Returns counts for: \`waiting\`, \`active\`, \`completed\`, \`failed\`, \`delayed\` jobs
- [ ] Protected by \`JwtAuthGuard\` + \`RolesGuard\` (ADMIN only)
- [ ] Uses the BullMQ \`Queue\` instance's \`getJobCounts()\` method
- [ ] Returns \`403\` for non-admin users"
echo "✓ Issue 27 created"

gh.exe issue create --repo $REPO \
  --title "[BE-28] Add job deduplication to prevent duplicate Stellar anchoring" \
  --label "$LABEL" \
  --body "## Overview
If a document is submitted for verification multiple times before the first job completes, multiple anchor jobs run independently and create multiple Stellar transactions for the same document hash — wasting fees and polluting the ledger.

## Acceptance Criteria
- [ ] Set BullMQ \`jobId\` to \`documentId\` when enqueuing anchor jobs
- [ ] BullMQ deduplication prevents a second identical job from being added while the first is active or waiting
- [ ] Add a test or manual verification step confirming only one Stellar tx is created per document"
echo "✓ Issue 28 created"

# ─── CACHING ──────────────────────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-29] Integrate Redis caching for risk assessment results" \
  --label "$LABEL" \
  --body "## Overview
\`cache-manager\` and \`cache-manager-redis-store\` are installed but never configured or used. Every call to \`GET /api/documents/:id/risk\` re-computes or re-queries the same data.

## Acceptance Criteria
- [ ] Configure \`CacheModule.registerAsync()\` in \`AppModule\` with Redis store and env-based TTL
- [ ] Apply \`@UseInterceptors(CacheInterceptor)\` to \`GET /api/documents/:id/risk\`
- [ ] Cache TTL set to 5 minutes
- [ ] Cache entry is invalidated when the document's risk data is updated via \`updateRisk()\`"
echo "✓ Issue 29 created"

gh.exe issue create --repo $REPO \
  --title "[BE-30] Cache Stellar hash verification results in Redis" \
  --label "$LABEL" \
  --body "## Overview
\`StellarService.verifyHash()\` makes a live Horizon API call on every invocation. Confirmed hashes are immutable on the blockchain and never need to be re-fetched.

## Acceptance Criteria
- [ ] Cache positive (\`true\`) verification results in Redis with no expiry (confirmed hashes are permanent)
- [ ] Cache negative (\`false\`) results with a 60-second TTL (allow eventual confirmation)
- [ ] Cache key format: \`stellar:verify:{hash}\`
- [ ] Cache layer uses the shared \`CacheModule\` from Issue #29"
echo "✓ Issue 30 created"

# ─── LOGGING & OBSERVABILITY ──────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-31] Add structured request/response logging with correlation IDs" \
  --label "$LABEL" \
  --body "## Overview
The current \`LoggerMiddleware\` only logs the HTTP method and URL. There is no request tracing, response status, or duration — making production debugging very difficult.

## Acceptance Criteria
- [ ] Generate a UUID \`correlationId\` per request and attach it to the request object
- [ ] Log request method, URL, and \`correlationId\` on incoming request
- [ ] Log response status code and duration (ms) on response finish
- [ ] Redact sensitive headers (\`Authorization\`, \`Cookie\`) from logs
- [ ] \`correlationId\` is passed through to service-level logs"
echo "✓ Issue 31 created"

gh.exe issue create --repo $REPO \
  --title "[BE-32] Add AuditLog entity and service for sensitive operations" \
  --label "$LABEL" \
  --body "## Overview
There is no audit trail for sensitive operations. When a document is deleted, a user role is changed, or a verification is triggered, there is no record of who performed the action or when.

## AuditLog Entity Fields
\`id\` (UUID), \`userId\`, \`action\` (string), \`resourceType\` (string), \`resourceId\` (string), \`metadata\` (JSON), \`createdAt\`

## Acceptance Criteria
- [ ] \`AuditLog\` entity and \`AuditService\` created in a new \`audit\` module
- [ ] \`AuditService.log()\` called in: document upload, document delete, verification trigger, user role change
- [ ] Audit logs are read-only (no update or delete endpoints)
- [ ] Admin endpoint \`GET /api/audit\` returns paginated audit log"
echo "✓ Issue 32 created"

# ─── TESTING ──────────────────────────────────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-33] Write unit tests for RiskAssessmentService" \
  --label "$LABEL" \
  --body "## Overview
No unit tests exist for the risk assessment logic. Bugs in flag detection or score calculation go undetected until production.

## Test Cases to Cover
- [ ] Each of the 6 flag detection rules independently
- [ ] Score calculation with a single flag
- [ ] Score calculation with multiple flags (sum of weights)
- [ ] Score is capped at 100 when all flags are triggered
- [ ] Edge cases: empty title, zero-byte file, user with no other documents

## File
\`src/risk-assessment/risk-assessment.service.spec.ts\`"
echo "✓ Issue 33 created"

gh.exe issue create --repo $REPO \
  --title "[BE-34] Write unit tests for StellarService" \
  --label "$LABEL" \
  --body "## Overview
\`StellarService\` has no tests. Stellar SDK calls are expensive and unpredictable in a real environment, so mocked unit tests are essential.

## Test Cases to Cover
- [ ] \`anchorHash()\` success path returns correct \`txHash\` and \`ledger\` values
- [ ] \`anchorHash()\` throws when Stellar submission fails
- [ ] \`verifyHash()\` returns \`true\` when the hash exists on the ledger
- [ ] \`verifyHash()\` returns \`false\` on a 404 response
- [ ] \`buildDataKey()\` returns the correct key format for a known hash

## File
\`src/stellar/stellar.service.spec.ts\`"
echo "✓ Issue 34 created"

gh.exe issue create --repo $REPO \
  --title "[BE-35] Write e2e tests for the authentication flow" \
  --label "$LABEL" \
  --body "## Overview
The auth flow is the most critical path in the application and has zero automated test coverage.

## Test Cases to Cover
- [ ] \`POST /api/auth/register\` — success, duplicate email (409), invalid payload (400)
- [ ] \`POST /api/auth/login\` — success, wrong password (401), unknown email (401)
- [ ] \`POST /api/auth/refresh\` — valid token, expired token (401), tampered token (401)
- [ ] Protected endpoint returns \`401\` with no token
- [ ] Protected endpoint returns \`401\` with an expired token

## File
\`test/auth.e2e-spec.ts\`"
echo "✓ Issue 35 created"

gh.exe issue create --repo $REPO \
  --title "[BE-36] Write e2e tests for document upload and verification flow" \
  --label "$LABEL" \
  --body "## Overview
The document upload and verification pipeline has no e2e test coverage.

## Test Cases to Cover
- [ ] \`POST /api/documents/upload\` — success, oversized file (400), unsupported MIME type (400), unauthenticated (401)
- [ ] \`POST /api/documents/:id/verify\` — success, document not found (404), wrong owner (403)
- [ ] \`GET /api/documents/:id/verification\` — confirmed record, pending record, not found (404)

## File
\`test/documents.e2e-spec.ts\`"
echo "✓ Issue 36 created"

# ─── DEVELOPER EXPERIENCE & CODE QUALITY ─────────────────────────────────────

gh.exe issue create --repo $REPO \
  --title "[BE-37] Add Swagger/OpenAPI decorators to all controllers and DTOs" \
  --label "$LABEL" \
  --body "## Overview
Swagger is configured in \`main.ts\` and available at \`/api/docs\`, but no decorators are used. The generated documentation is empty and unusable by frontend developers or API consumers.

## Acceptance Criteria
- [ ] \`@ApiOperation()\` and \`@ApiResponse()\` added to every controller endpoint
- [ ] \`@ApiBearerAuth()\` added to all JWT-protected endpoints
- [ ] \`@ApiProperty()\` added to all DTO fields
- [ ] \`@ApiTags()\` added to each controller
- [ ] \`/api/docs\` renders a fully usable, accurate API reference"
echo "✓ Issue 37 created"

gh.exe issue create --repo $REPO \
  --title "[BE-38] Add @nestjs/schedule cron job for stale document cleanup" \
  --label "$LABEL" \
  --body "## Overview
\`@nestjs/schedule\` is installed but never used. Documents can get stuck in \`ANALYZING\` or \`PENDING\` status indefinitely if a queue job silently fails without triggering the dead-letter handler.

## Acceptance Criteria
- [ ] Create a \`TasksModule\` with a \`@Cron()\` job that runs nightly (e.g., \`0 2 * * *\`)
- [ ] Find all documents in \`ANALYZING\` or \`PENDING\` status for more than 24 hours
- [ ] Re-enqueue their analysis jobs OR mark them \`REJECTED\` with a \`timeout\` reason
- [ ] Log the count of documents cleaned up in each run"
echo "✓ Issue 38 created"

gh.exe issue create --repo $REPO \
  --title "[BE-39] Add document export endpoints for PDF and Excel" \
  --label "$LABEL" \
  --body "## Overview
\`pdfkit\` and \`exceljs\` are installed but never used. Users have no way to export their document records for offline use or compliance reporting.

## Endpoints to Implement
- \`GET /api/documents/:id/export/pdf\` — PDF report with metadata, risk score, flags, and Stellar tx hash
- \`GET /api/documents/export/excel\` — \`.xlsx\` spreadsheet of all user documents

## Acceptance Criteria
- [ ] PDF includes: document title, upload date, status, risk score, each risk flag, and Stellar tx hash
- [ ] Excel includes one row per document with all key fields as columns
- [ ] Both endpoints are protected with \`JwtAuthGuard\`
- [ ] Correct \`Content-Type\` and \`Content-Disposition\` headers set for file download"
echo "✓ Issue 39 created"

gh.exe issue create --repo $REPO \
  --title "[BE-40] Improve risk assessment with real document content analysis" \
  --label "$LABEL" \
  --body "## Overview
Current risk flag detection is based entirely on file metadata (title length, file size, document count). It does not read document content, making it unreliable for real land document analysis.

## Acceptance Criteria
- [ ] Integrate \`pdf-parse\` to extract text content from uploaded PDF documents
- [ ] Detect parcel number patterns via regex on extracted text
- [ ] Check for known issuer names and signature field keywords in document text
- [ ] Replace the file-size-based forgery heuristic (\`fileSize < 50KB\`) with a content-integrity check
- [ ] Detect duplicate parcel IDs across documents via a database query on extracted metadata
- [ ] Update unit tests (Issue #33) to cover the new content-based detection rules"
echo "✓ Issue 40 created"

echo ""
echo "✅ All 40 issues created successfully on $REPO"
