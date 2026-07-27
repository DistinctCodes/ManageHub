#!/usr/bin/env node
'use strict';

/**
 * ManageHub Demo / Seed Data Script
 *
 * Usage:
 *   node scripts/demo-data.js seed [--force] [--dry-run]
 *   node scripts/demo-data.js clear [--dry-run]
 *   node scripts/demo-data.js info
 *   node scripts/demo-data.js validate
 *
 * Flags:
 *   --force    Skip confirmation prompts
 *   --dry-run  Print SQL without executing
 *   --clear    Remove all seeded demo data before seeding
 */

const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const command = args[0] || 'seed';
const flags = {
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run'),
  clear: args.includes('--clear'),
};

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------
function log(level, msg) {
  const ts = new Date().toISOString();
  const prefix = { INFO: '\x1b[36m', WARN: '\x1b[33m', ERROR: '\x1b[31m', OK: '\x1b[32m' }[level] || '';
  console.log(`${prefix}[${ts}] [${level}] ${msg}\x1b[0m`);
}

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
function createClient() {
  return new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'managehub',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

function uuid() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Realistic seed data
// ---------------------------------------------------------------------------
const DEMO_USERS = [
  { firstname: 'Amina', lastname: 'Okafor', email: 'amina.okafor@demo.com', role: 'admin' },
  { firstname: 'Tunde', lastname: 'Adesanya', email: 'tunde.adesanya@demo.com', role: 'staff' },
  { firstname: 'Chidinma', lastname: 'Eze', email: 'chidinma.eze@demo.com', role: 'user' },
  { firstname: 'Emeka', lastname: 'Nwosu', email: 'emeka.nwosu@demo.com', role: 'user' },
  { firstname: 'Folake', lastname: 'Bakare', email: 'folake.bakare@demo.com', role: 'user' },
  { firstname: 'Ibrahim', lastname: 'Musa', email: 'ibrahim.musa@demo.com', role: 'user' },
  { firstname: 'Ngozi', lastname: 'Adeyemi', email: 'ngozi.adeyemi@demo.com', role: 'staff' },
  { firstname: 'Kola', lastname: 'Abiodun', email: 'kola.abiodun@demo.com', role: 'user' },
  { firstname: 'Sade', lastname: 'Olawale', email: 'sade.olawale@demo.com', role: 'user' },
  { firstname: 'Obinna', lastname: 'Uche', email: 'obinna.uche@demo.com', role: 'user' },
];

const WORKSPACE_NAMES = [
  'Sunset Boardroom',
  'The Loft',
  'Conference Room A',
  'Oceanview Meeting Room',
  'The Garden Studio',
  'Riverside Lounge',
  'Skyline Tower Suite',
  'Cedar Conference Hall',
  'The Penthouse',
  'Downtown Hub Room 101',
];

const WORKSPACE_TYPES = ['private_office', 'meeting_room', 'hot_desk', 'event_space', 'day_pass'];

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

function randomPrice() {
  return (Math.floor(Math.random() * 51) + 25) * 100; // 2500–7500 kobo per hour
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().split('T')[0];
}

function randomFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// SQL builders
// ---------------------------------------------------------------------------
function hashPassword() {
  // bcrypt hash for "demo123" — pre-computed for seeding
  return '$2b$10$KIXLz3f3Z3e1Yp1V1Yp1V1Yp1V1Yp1V1Yp1V1Yp1V1Yp1V1Yp1V';
}

async function tableExists(client, tableName) {
  const res = await client.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
    [tableName],
  );
  return res.rows[0].exists;
}

async function countRows(client, tableName) {
  if (!(await tableExists(client, tableName))) return 0;
  const res = await client.query(`SELECT COUNT(*)::int AS cnt FROM ${tableName}`);
  return res.rows[0].cnt;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function cmdSeed(client) {
  log('INFO', 'Checking existing data...');
  const existingUsers = await countRows(client, 'users');

  if (existingUsers > 0 && !flags.force) {
    log('WARN', `Found ${existingUsers} existing users. Use --force to seed anyway.`);
    await client.end();
    return;
  }

  if (existingUsers > 0 && flags.force) {
    log('WARN', 'Force flag set — proceeding with additional seed data.');
  }

  const userIds = [];
  let workspaceIds = [];

  // --- Users ---
  log('INFO', `Seeding ${DEMO_USERS.length} users...`);
  for (const u of DEMO_USERS) {
    const id = uuid();
    userIds.push(id);
    const sql = `INSERT INTO users (id, firstname, lastname, email, password, role, "isVerified", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING`;
    const params = [id, u.firstname, u.lastname, u.email, hashPassword(), u.role];
    if (flags.dryRun) {
      log('INFO', `DRY-RUN: ${sql.replace(/\$\d+/g, '?')}`);
    } else {
      await client.query(sql, params);
    }
  }
  log('OK', `Users seeded (${userIds.length} IDs generated).`);

  // --- Workspaces ---
  log('INFO', `Seeding ${WORKSPACE_NAMES.length} workspaces...`);
  for (let i = 0; i < WORKSPACE_NAMES.length; i++) {
    const id = uuid();
    workspaceIds.push(id);
    const hourlyRate = randomPrice();
    const type = WORKSPACE_TYPES[i % WORKSPACE_TYPES.length];
    const totalSeats = Math.floor(Math.random() * 10) + 2;
    const sql = `INSERT INTO workspaces (id, name, type, "hourlyRate", "totalSeats", "availableSeats", "isActive", description, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $5, true, $6, NOW(), NOW())`;
    const params = [
      id,
      WORKSPACE_NAMES[i],
      type,
      hourlyRate,
      totalSeats,
      `A premium ${type.replace(/_/g, ' ')} in ${WORKSPACE_NAMES[i]}.`,
    ];
    if (flags.dryRun) {
      log('INFO', `DRY-RUN: ${sql.replace(/\$\d+/g, '?')}`);
    } else {
      await client.query(sql, params);
    }
  }
  log('OK', `Workspaces seeded (${workspaceIds.length} IDs generated).`);

  // --- Bookings ---
  const bookingCount = 15;
  log('INFO', `Seeding ${bookingCount} bookings...`);
  const bookingIds = [];
  for (let i = 0; i < bookingCount; i++) {
    const id = uuid();
    bookingIds.push(id);
    const userId = userIds[i % userIds.length];
    const wsId = workspaceIds[i % workspaceIds.length];
    const status = BOOKING_STATUSES[i % BOOKING_STATUSES.length];
    const startDate = randomDate(30);
    const endDate = randomFutureDate(14);
    const totalAmount = randomPrice() * (Math.floor(Math.random() * 8) + 1);
    const seatCount = Math.floor(Math.random() * 4) + 1;
    const sql = `INSERT INTO bookings (id, "userId", "workspaceId", "planType", "startDate", "endDate", "totalAmount", status, "seatCount", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'HOURLY', $4, $5, $6, $7, $8, NOW(), NOW())`;
    const params = [id, userId, wsId, startDate, endDate, totalAmount, status, seatCount];
    if (flags.dryRun) {
      log('INFO', `DRY-RUN: ${sql.replace(/\$\d+/g, '?')}`);
    } else {
      await client.query(sql, params);
    }
  }
  log('OK', `Bookings seeded (${bookingCount} records).`);

  // --- Invoices ---
  const invoiceCount = 10;
  log('INFO', `Seeding ${invoiceCount} invoices...`);
  const invoiceStatuses = ['pending', 'paid', 'void'];
  for (let i = 0; i < invoiceCount; i++) {
    const id = uuid();
    const bookingId = bookingIds[i % bookingIds.length];
    const userId = userIds[i % userIds.length];
    const invNumber = `INV-${String(i + 1).padStart(5, '0')}`;
    const amount = randomPrice() * (Math.floor(Math.random() * 5) + 1);
    const status = invoiceStatuses[i % invoiceStatuses.length];
    const sql = `INSERT INTO invoices (id, "invoiceNumber", "userId", "bookingId", "amountKobo", currency, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'NGN', $6, NOW(), NOW())`;
    const params = [id, invNumber, userId, bookingId, amount, status];
    if (flags.dryRun) {
      log('INFO', `DRY-RUN: ${sql.replace(/\$\d+/g, '?')}`);
    } else {
      await client.query(sql, params);
    }
  }
  log('OK', `Invoices seeded (${invoiceCount} records).`);

  log('OK', 'Seed completed successfully.');
}

async function cmdClear(client) {
  log('INFO', 'Clearing demo data...');
  const tables = ['invoices', 'bookings', 'workspaces', 'users'];
  for (const table of tables) {
    const sql = `DELETE FROM ${table}`;
    if (flags.dryRun) {
      log('INFO', `DRY-RUN: ${sql}`);
    } else {
      const res = await client.query(sql);
      log('OK', `Cleared ${res.rowCount} rows from ${table}.`);
    }
  }
  log('OK', 'Clear completed.');
}

async function cmdInfo(client) {
  log('INFO', 'Database info:');
  const tables = ['users', 'workspaces', 'bookings', 'invoices'];
  for (const table of tables) {
    const cnt = await countRows(client, table);
    log('INFO', `  ${table}: ${cnt} rows`);
  }
}

async function cmdValidate(client) {
  log('INFO', 'Validating data integrity...');
  let errors = 0;

  // Check for orphaned bookings (userId not in users)
  if (await tableExists(client, 'bookings') && await tableExists(client, 'users')) {
    const orphanBookings = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM bookings b LEFT JOIN users u ON b."userId" = u.id WHERE u.id IS NULL`,
    );
    if (orphanBookings.rows[0].cnt > 0) {
      log('WARN', `Orphaned bookings (no user): ${orphanBookings.rows[0].cnt}`);
      errors++;
    }
  }

  // Check for orphaned invoices (bookingId not in bookings)
  if (await tableExists(client, 'invoices') && await tableExists(client, 'bookings')) {
    const orphanInvoices = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM invoices i LEFT JOIN bookings b ON i."bookingId" = b.id WHERE b.id IS NULL`,
    );
    if (orphanInvoices.rows[0].cnt > 0) {
      log('WARN', `Orphaned invoices (no booking): ${orphanInvoices.rows[0].cnt}`);
      errors++;
    }
  }

  // Check for duplicate emails
  if (await tableExists(client, 'users')) {
    const dupes = await client.query(
      `SELECT email, COUNT(*)::int AS cnt FROM users GROUP BY email HAVING COUNT(*) > 1`,
    );
    if (dupes.rows.length > 0) {
      log('WARN', `Duplicate emails found: ${dupes.rows.map((r) => r.email).join(', ')}`);
      errors++;
    }
  }

  // Check workspace seat consistency
  if (await tableExists(client, 'workspaces')) {
    const badSeats = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM workspaces WHERE "availableSeats" < 0 OR "availableSeats" > "totalSeats"`,
    );
    if (badSeats.rows[0].cnt > 0) {
      log('WARN', `Workspaces with invalid seat counts: ${badSeats.rows[0].cnt}`);
      errors++;
    }
  }

  if (errors === 0) {
    log('OK', 'All validations passed.');
  } else {
    log('WARN', `Validation completed with ${errors} issue(s).`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const client = createClient();

  try {
    await client.connect();
    log('INFO', `Connected to database at ${client.host || 'localhost'}:${client.port || 5432}`);

    switch (command) {
      case 'seed':
        if (flags.clear) {
          await cmdClear(client);
        }
        await cmdSeed(client);
        break;
      case 'clear':
        await cmdClear(client);
        break;
      case 'info':
        await cmdInfo(client);
        break;
      case 'validate':
        await cmdValidate(client);
        break;
      default:
        log('ERROR', `Unknown command: ${command}`);
        log('INFO', 'Usage: node scripts/demo-data.js [seed|clear|info|validate] [--force] [--dry-run] [--clear]');
        process.exit(1);
    }
  } catch (error) {
    log('ERROR', `Fatal: ${error.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
