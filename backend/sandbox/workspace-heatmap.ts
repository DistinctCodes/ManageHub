// GET /sandbox/analytics/heatmap?workspaceId=&from=&to=
// Restricted to admin role. Returns check-in counts grouped by dayOfWeek and hour.

export interface HeatmapPoint {
  dayOfWeek: number; // 0 (Sun) – 6 (Sat)
  hour: number;      // 0–23
  count: number;
}

export async function getWorkspaceHeatmap(
  workspaceRepo: any,
  logRepo: any,
  workspaceId: string,
  from?: string,
  to?: string,
): Promise<HeatmapPoint[]> {
  const workspace = await workspaceRepo.findOne({ where: { id: workspaceId } });
  if (!workspace) throw { status: 404, message: 'Workspace not found' };

  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const rows: { dow: string; hour: string; count: string }[] = await logRepo
    .createQueryBuilder('log')
    .select('EXTRACT(DOW FROM log.checkedInAt)::int', 'dow')
    .addSelect('EXTRACT(HOUR FROM log.checkedInAt)::int', 'hour')
    .addSelect('COUNT(*)', 'count')
    .where('log.workspaceId = :workspaceId', { workspaceId })
    .andWhere('log.checkedInAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
    .groupBy('dow, hour')
    .orderBy('dow')
    .addOrderBy('hour')
    .getRawMany();

  return rows.map(r => ({
    dayOfWeek: Number(r.dow),
    hour: Number(r.hour),
    count: Number(r.count),
  }));
}

// Middleware guard (example usage in a NestJS controller)
export function requireAdmin(user: { role: string }) {
  if (user.role !== 'admin') throw { status: 403, message: 'Admin access required' };
}
