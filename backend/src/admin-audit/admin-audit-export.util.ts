// Builds a CSV export of admin-audit entries for a date range, for
// compliance audits. Formatting helper meant to back an export endpoint
// on admin-audit.controller.ts.
export interface AdminAuditEntry {
  id: string;
  adminId: string;
  action: string;
  createdAt: Date;
}

const CSV_HEADER = 'id,adminId,action,createdAt';

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportAdminAuditToCsv(entries: AdminAuditEntry[]): string {
  const rows = entries.map((entry) =>
    [entry.id, entry.adminId, entry.action, entry.createdAt.toISOString()]
      .map(escapeCsv)
      .join(','),
  );
  return [CSV_HEADER, ...rows].join('\n');
}

export function filterAdminAuditByDateRange(
  entries: AdminAuditEntry[],
  start: Date,
  end: Date,
): AdminAuditEntry[] {
  return entries.filter((e) => e.createdAt >= start && e.createdAt <= end);
}
