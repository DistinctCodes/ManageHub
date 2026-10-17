// Builds a CSV export of admin-audit entries for the compliance export
// endpoint on admin-audit.controller.ts. The column order is fixed here so
// the export is stable and machine-parsable.
export interface AdminAuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

/** Stable column order shared by the header row and every data row. */
export const ADMIN_AUDIT_CSV_COLUMNS = [
  'id',
  'actorId',
  'action',
  'targetType',
  'targetId',
  'detail',
  'ip',
  'userAgent',
  'createdAt',
] as const;

/** Hard cap on exported rows so a compliance pull can never be unbounded. */
export const ADMIN_AUDIT_EXPORT_MAX_ROWS = 10_000;

const CSV_HEADER = ADMIN_AUDIT_CSV_COLUMNS.join(',');

// A leading one of these turns a cell into a formula in spreadsheet apps
// (CSV injection). Neutralise it with a leading single quote before the
// normal quoting rules are applied.
const FORMULA_PREFIXES = ['=', '+', '-', '@'] as const;

function neutraliseFormula(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value;
}

/** Escapes a single CSV cell, neutralising formula-prefixed values. */
export function escapeCsvValue(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const escaped = neutraliseFormula(raw);
  return /[",\n\r]/.test(escaped)
    ? `"${escaped.replace(/"/g, '""')}"`
    : escaped;
}

export function exportAdminAuditToCsv(entries: AdminAuditEntry[]): string {
  const rows = entries.map((entry) =>
    ADMIN_AUDIT_CSV_COLUMNS.map((column) => {
      const value =
        column === 'createdAt' ? entry.createdAt.toISOString() : entry[column];
      return escapeCsvValue(value);
    }).join(','),
  );
  return [CSV_HEADER, ...rows].join('\n');
}

/**
 * Parses an optional ISO date-range query parameter, rejecting anything the
 * Date constructor cannot interpret so a malformed range fails loudly at the
 * edge instead of silently exporting the wrong window.
 */
export function parseAuditDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid "${field}" date: "${value}"`);
  }
  return parsed;
}

export function filterAdminAuditByDateRange(
  entries: AdminAuditEntry[],
  start: Date,
  end: Date,
): AdminAuditEntry[] {
  return entries.filter((e) => e.createdAt >= start && e.createdAt <= end);
}
