import { Injectable } from '@nestjs/common';
.select('COUNT(asset.id)', 'disposedCount')
.where('asset.status = :disposed', { disposed: 'disposed' });


// 3) Grouped by status (counts)
const statusGroupQuery = this.assetRepo
.createQueryBuilder('asset')
.select('asset.status', 'status')
.addSelect('COUNT(asset.id)', 'count')
.groupBy('asset.status');


// 4) Low stock items (count and list limited)
const lowStockCountQuery = this.assetRepo
.createQueryBuilder('asset')
.select('COUNT(asset.id)', 'lowStockCount')
.where('asset.quantity IS NOT NULL')
.andWhere('asset.quantity <= :threshold', { threshold: lowStockThreshold });


// 5) Example: get top 5 locations with lowest total quantity
const lowStockLocationsQuery = this.assetRepo
.createQueryBuilder('asset')
.select('asset.location', 'location')
.addSelect('COALESCE(SUM(asset.quantity),0)', 'totalQuantity')
.groupBy('asset.location')
.orderBy('totalQuantity', 'ASC')
.limit(5);


// Execute queries in parallel
const [totalRaw, disposedRaw, statusGroupsRaw, lowStockCountRaw, lowStockLocationsRaw] =
await Promise.all([
totalQuery.getRawOne(),
disposedQuery.getRawOne(),
statusGroupQuery.getRawMany(),
lowStockCountQuery.getRawOne(),
lowStockLocationsQuery.getRawMany(),
]);


const totalCount = Number(totalRaw?.totalCount ?? 0);
const totalQuantity = Number(totalRaw?.totalQuantity ?? 0);
const disposedCount = Number(disposedRaw?.disposedCount ?? 0);


const statusGroups: StatusGroup[] = (statusGroupsRaw ?? []).map((r: any) => ({
status: r.status,
count: Number(r.count),
}));


const lowStockCount = Number(lowStockCountRaw?.lowStockCount ?? 0);


const lowStockLocations = (lowStockLocationsRaw ?? []).map((r: any) => ({
location: r.location,
totalQuantity: Number(r.totalQuantity),
}));


const dto: DashboardMetricsDto = {
totalCount,
totalQuantity,
disposedCount,
statusGroups,
lowStockCount,
lowStockLocations,
lowStockThreshold,
};


return dto;
}
}