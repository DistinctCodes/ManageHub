import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema for the entities that existed before migrations were added.
 * This migration is intentionally self-contained: do not edit it when entities
 * change; create a new migration instead.
 */
export class InitialSchema1720000000000 implements MigrationInterface {
  name = 'InitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statements = [
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
      `CREATE TYPE "users_role_enum" AS ENUM ('super_admin', 'admin', 'staff', 'user')`,
      `CREATE TYPE "users_membershipStatus_enum" AS ENUM ('active', 'inactive', 'suspended')`,
      `CREATE TYPE "workspaces_type_enum" AS ENUM ('HotDesk', 'DedicatedDesk', 'PrivateOffice', 'MeetingRoom', 'Virtual', 'Hybrid')`,
      `CREATE TYPE "bookings_planType_enum" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')`,
      `CREATE TYPE "bookings_status_enum" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed')`,
      `CREATE TYPE "payments_provider_enum" AS ENUM ('paystack', 'soroban')`,
      `CREATE TYPE "payments_status_enum" AS ENUM ('pending', 'success', 'failed', 'refunded')`,
      `CREATE TYPE "notifications_type_enum" AS ENUM ('booking_confirmed', 'booking_cancelled', 'booking_completed', 'payment_success', 'payment_failed', 'payment_refunded', 'invoice_generated', 'general')`,
      `CREATE TYPE "parking_spots_type_enum" AS ENUM ('STANDARD', 'ACCESSIBLE', 'MOTORCYCLE', 'EV_CHARGING')`,
      `CREATE TYPE "visitors_status_enum" AS ENUM ('expected', 'checked_in', 'checked_out', 'cancelled')`,
      `CREATE TYPE "membership_plans_billingCycle_enum" AS ENUM ('monthly', 'quarterly', 'yearly')`,
      `CREATE TYPE "user_memberships_status_enum" AS ENUM ('active', 'cancelled', 'expired', 'past_due')`,
      `CREATE TYPE "invoices_status_enum" AS ENUM ('pending', 'paid', 'void')`,
      `CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstname" varchar NOT NULL,
        "lastname" varchar NOT NULL, "username" varchar, "email" varchar NOT NULL,
        "password" varchar NOT NULL, "role" "users_role_enum" NOT NULL DEFAULT 'user',
        "passwordResetToken" varchar, "passwordResetExpiresIn" TIMESTAMP WITH TIME ZONE,
        "lastPasswordResetSentAt" TIMESTAMP WITH TIME ZONE, "verificationToken" varchar,
        "verificationTokenExpiry" TIMESTAMP WITH TIME ZONE, "lastVerificationEmailSent" TIMESTAMP WITH TIME ZONE,
        "verificationCode" varchar, "verificationCodeExpiresAt" TIMESTAMP WITH TIME ZONE,
        "passwordResetCode" varchar, "passwordResetCodeExpiresAt" TIMESTAMP WITH TIME ZONE,
        "isVerified" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true,
        "isDeleted" boolean NOT NULL DEFAULT false, "isSuspended" boolean NOT NULL DEFAULT false,
        "profilePicture" varchar(500), "phone" varchar(15),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "twoFactorEnabled" boolean NOT NULL DEFAULT false, "totpSecret" varchar(255), "totpBackupCodes" jsonb,
        "membershipStatus" "users_membershipStatus_enum" NOT NULL DEFAULT 'inactive',
        "memberSince" TIMESTAMP WITH TIME ZONE, "profileCompleteness" integer NOT NULL DEFAULT 0,
        "deletedAt" TIMESTAMP, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`,
      `CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" varchar NOT NULL,
        "type" "workspaces_type_enum" NOT NULL, "totalSeats" integer NOT NULL DEFAULT 1,
        "availableSeats" integer NOT NULL DEFAULT 1, "hourlyRate" bigint NOT NULL, "description" text,
        "amenities" text, "images" text, "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_6d79a7b5b10bbfb9d4c83851c8b" PRIMARY KEY ("id"))`,
      `CREATE TABLE "resources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" varchar(120) NOT NULL, "description" text,
        "priceKoboPerSession" integer NOT NULL DEFAULT 0, "quantity" integer NOT NULL DEFAULT 1,
        "isAvailable" boolean NOT NULL DEFAULT true, "applicableWorkspaceTypes" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_8a8725e8e7a1e0f9d89f2b51087" PRIMARY KEY ("id"))`,
      `CREATE TABLE "membership_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" varchar(255) NOT NULL, "description" text,
        "priceKobo" integer NOT NULL, "billingCycle" "membership_plans_billingCycle_enum" NOT NULL,
        "features" jsonb NOT NULL DEFAULT '[]', "bookingHoursIncluded" integer NOT NULL DEFAULT 0,
        "guestPassesPerMonth" integer NOT NULL DEFAULT 0, "isActive" boolean NOT NULL DEFAULT true,
        "displayOrder" integer NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_3a8d62e1a8bf91a9ec90cb00435" PRIMARY KEY ("id"))`,
      `CREATE TABLE "hub_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hubName" varchar(255) NOT NULL DEFAULT 'ManageHub',
        "address" text, "city" varchar(100), "country" varchar(100),
        "timezone" varchar(100) NOT NULL DEFAULT 'Africa/Lagos', "currency" varchar(3) NOT NULL DEFAULT 'NGN',
        "vatRatePercent" numeric(5,2) NOT NULL DEFAULT 7.5, "businessHours" jsonb,
        "contactEmail" varchar(255), "contactPhone" varchar(30), "logoUrl" varchar(500),
        "primaryColor" varchar(7), "faviconUrl" varchar(500), "bookingLeadTimeHours" integer NOT NULL DEFAULT 1,
        "maxBookingDaysAhead" integer NOT NULL DEFAULT 90, "cancellationPolicyHours" integer NOT NULL DEFAULT 24,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_43c5dc35d7b9a55958135f1d707" PRIMARY KEY ("id"))`,
      `CREATE TABLE "contact_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" varchar(100) NOT NULL,
        "email" varchar(254) NOT NULL, "phone" varchar(20), "company" varchar(150),
        "subject" varchar(200) NOT NULL, "message" text NOT NULL, "ipAddress" varchar(64),
        "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_90f79b85f4040f1d5d4c7a381a8" PRIMARY KEY ("id"))`,
      `CREATE TABLE "newsletter_subscriber" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" varchar(254) NOT NULL,
        "isVerified" boolean NOT NULL DEFAULT false, "verifiedAt" TIMESTAMP WITH TIME ZONE,
        "verificationToken" varchar(128), "verificationTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "subscribedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "unsubscribedAt" TIMESTAMP WITH TIME ZONE,
        "isActive" boolean NOT NULL DEFAULT true, "unsubscribeToken" varchar(128) NOT NULL,
        "consentedAt" TIMESTAMP WITH TIME ZONE, "ipAddress" varchar(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_a950c1f9463468eb3b7f3e72f85" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_c7c77fa243eefb2415b13f1b4e4" UNIQUE ("email"))`,
      `CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "workspaceId" uuid NOT NULL,
        "planType" "bookings_planType_enum" NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL,
        "totalAmount" bigint NOT NULL, "status" "bookings_status_enum" NOT NULL DEFAULT 'pending',
        "seatCount" integer NOT NULL DEFAULT 1, "notes" text, "sorobanEscrowId" varchar,
        "reminderSent" boolean NOT NULL DEFAULT false, "isGuestBooking" boolean NOT NULL DEFAULT false,
        "guestInfo" jsonb, "resourceIds" jsonb DEFAULT '[]', "resourcesTotalKobo" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
      `CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" uuid NOT NULL, "userId" uuid,
        "amount" bigint NOT NULL, "currency" varchar(3) NOT NULL DEFAULT 'NGN',
        "provider" "payments_provider_enum" NOT NULL, "providerReference" varchar,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending', "paidAt" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_3759f43a3b6e0a0f0b3a0e69f15" PRIMARY KEY ("id"))`,
      `CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "token" text NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE, "revoked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_2c9e1f220f24e47f1d3e2b7f7c1" PRIMARY KEY ("id"))`,
      `CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL,
        "type" "notifications_type_enum" NOT NULL, "title" varchar(255) NOT NULL, "message" text NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_600b0c7c4d80c5d9753430c1b0c" PRIMARY KEY ("id"))`,
      `CREATE TABLE "parking_spots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "spotNumber" varchar(20) NOT NULL, "level" varchar(80),
        "type" "parking_spots_type_enum" NOT NULL DEFAULT 'STANDARD', "assignedToUserId" uuid,
        "assignedAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_b1f1e1b1d17a8e55f0c7d24c2d4" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_9029c1554442554cb425953fe07" UNIQUE ("spotNumber"))`,
      `CREATE TABLE "visitors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hostUserId" uuid NOT NULL,
        "visitorName" varchar(255) NOT NULL, "visitorEmail" varchar(255), "visitorPhone" varchar(30),
        "company" varchar(255), "purpose" text, "expectedArrival" TIMESTAMP WITH TIME ZONE,
        "actualArrival" TIMESTAMP WITH TIME ZONE, "actualDeparture" TIMESTAMP WITH TIME ZONE,
        "status" "visitors_status_enum" NOT NULL DEFAULT 'expected', "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a0e9b4e2ec4a3382f0ec8c0f694" PRIMARY KEY ("id"))`,
      `CREATE TABLE "user_memberships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "planId" uuid NOT NULL,
        "status" "user_memberships_status_enum" NOT NULL DEFAULT 'active', "startDate" date NOT NULL,
        "currentPeriodEnd" date NOT NULL, "cancelledAt" TIMESTAMP WITH TIME ZONE,
        "paystackSubscriptionCode" varchar, "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_7851b22f9bc6dfcba7f72b9cf44" PRIMARY KEY ("id"))`,
      `CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceNumber" varchar(20) NOT NULL,
        "userId" uuid NOT NULL, "bookingId" uuid NOT NULL, "paymentId" uuid, "amountKobo" bigint NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'NGN', "status" "invoices_status_enum" NOT NULL DEFAULT 'pending',
        "paidAt" TIMESTAMP WITH TIME ZONE, "lineItems" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_bf8e0f9dd4558ef209ec1117824" UNIQUE ("invoiceNumber"))`,
      `CREATE TABLE "workspace_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "workspaceId" uuid NOT NULL,
        "bookingId" uuid, "checkedInAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "checkedOutAt" TIMESTAMP WITH TIME ZONE, "durationMinutes" integer, "notes" text,
        CONSTRAINT "PK_10e0f9f7c43fc652dbe237a85d4" PRIMARY KEY ("id"))`,
      'CREATE INDEX "IDX_38a69a58a323647f2e75eb994d" ON "bookings" ("userId")',
      'CREATE INDEX "IDX_96d2c1b1f22ea3d78ae391fd19" ON "bookings" ("workspaceId")',
      'CREATE INDEX "IDX_48b267d894e32a25ebde4b207a" ON "bookings" ("status")',
      'CREATE INDEX "IDX_1ead3dc5d71db0ea822706e389" ON "payments" ("bookingId")',
      'CREATE INDEX "IDX_d35cb3c13a18e1ea1705b2817b" ON "payments" ("userId")',
      'CREATE INDEX "IDX_6bd9aa51f09e7dd2727adb8a6e" ON "payments" ("providerReference")',
      'CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId")',
      'CREATE UNIQUE INDEX "IDX_4542dd2f38a61354a040ba9fd5" ON "refresh_tokens" ("token")',
      'CREATE INDEX "IDX_5340fc241f57310d243e5ab20b" ON "notifications" ("userId", "isRead")',
      'CREATE INDEX "IDX_fb09e99f779f9317007c6038b7" ON "parking_spots" ("assignedToUserId")',
      'CREATE UNIQUE INDEX "IDX_9029c1554442554cb425953fe0" ON "parking_spots" ("spotNumber")',
      'CREATE INDEX "IDX_f94513cc0fbd207bf58fb79964" ON "visitors" ("hostUserId")',
      'CREATE INDEX "IDX_3f3f7723178f97804d2f789179" ON "visitors" ("status")',
      'CREATE INDEX "IDX_53b6d0c12bf234b3a6a003da1c" ON "user_memberships" ("userId")',
      'CREATE INDEX "IDX_bd9c6600f8f1c53d856a373ea1" ON "user_memberships" ("status")',
      'CREATE UNIQUE INDEX "IDX_bf8e0f9dd4558ef209ec111782" ON "invoices" ("invoiceNumber")',
      'CREATE INDEX "IDX_fcbe490dc37a1abf68f19c5ccb" ON "invoices" ("userId")',
      'CREATE INDEX "IDX_eca01fda44679cc1c342822e01" ON "invoices" ("bookingId")',
      'CREATE INDEX "IDX_f0409cb0365b7d0cc097d6861d" ON "workspace_logs" ("workspaceId", "checkedInAt")',
      'CREATE INDEX "IDX_3f0e626284faa95cdde4799a3d" ON "workspace_logs" ("userId", "checkedInAt")',
      'CREATE INDEX "IDX_c7c77fa243eefb2415b13f1b4e" ON "newsletter_subscriber" ("email")',
      'CREATE INDEX "IDX_19aa53c6630913c18dd641a739" ON "newsletter_subscriber" ("isActive")',
      'CREATE INDEX "IDX_607cf367dae44af2260c472799" ON "newsletter_subscriber" ("isVerified")',
      'ALTER TABLE "bookings" ADD CONSTRAINT "FK_38a69a58a323647f2e75eb994de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT',
      'ALTER TABLE "bookings" ADD CONSTRAINT "FK_96d2c1b1f22ea3d78ae391fd19a" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT',
      'ALTER TABLE "payments" ADD CONSTRAINT "FK_1ead3dc5d71db0ea822706e389d" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT',
      'ALTER TABLE "payments" ADD CONSTRAINT "FK_d35cb3c13a18e1ea1705b2817b1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT',
      'ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
      'ALTER TABLE "parking_spots" ADD CONSTRAINT "FK_fb09e99f779f9317007c6038b77" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL',
      'ALTER TABLE "visitors" ADD CONSTRAINT "FK_f94513cc0fbd207bf58fb79964b" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE CASCADE',
      'ALTER TABLE "user_memberships" ADD CONSTRAINT "FK_53b6d0c12bf234b3a6a003da1cf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
      'ALTER TABLE "user_memberships" ADD CONSTRAINT "FK_a12d606085f96c77e18c9bb7968" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT',
      'ALTER TABLE "invoices" ADD CONSTRAINT "FK_fcbe490dc37a1abf68f19c5ccb9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT',
      'ALTER TABLE "invoices" ADD CONSTRAINT "FK_eca01fda44679cc1c342822e01b" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT',
      'ALTER TABLE "invoices" ADD CONSTRAINT "FK_64923f3a8d3f3247dd5fe9f43c5" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL',
      'ALTER TABLE "workspace_logs" ADD CONSTRAINT "FK_3d5ccd8a7b758f0b54415d2f192" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT',
      'ALTER TABLE "workspace_logs" ADD CONSTRAINT "FK_4d2691b22fed2696106da1660ae" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT',
      'ALTER TABLE "workspace_logs" ADD CONSTRAINT "FK_41831fddedcf6d6d87e28ba609c" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL',
    ];

    for (const statement of statements) await queryRunner.query(statement);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ['workspace_logs', 'invoices', 'user_memberships', 'visitors', 'parking_spots', 'notifications', 'refresh_tokens', 'payments', 'bookings', 'newsletter_subscriber', 'contact_messages', 'hub_settings', 'membership_plans', 'resources', 'workspaces', 'users'];
    for (const table of tables) await queryRunner.query(`DROP TABLE "${table}"`);
    const enums = ['invoices_status_enum', 'user_memberships_status_enum', 'membership_plans_billingCycle_enum', 'visitors_status_enum', 'parking_spots_type_enum', 'notifications_type_enum', 'payments_status_enum', 'payments_provider_enum', 'bookings_status_enum', 'bookings_planType_enum', 'workspaces_type_enum', 'users_membershipStatus_enum', 'users_role_enum'];
    for (const type of enums) await queryRunner.query(`DROP TYPE "${type}"`);
  }
}
