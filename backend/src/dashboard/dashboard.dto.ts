export interface StatusGroup {
status: string;
count: number;
}


export interface LowStockLocation {
location: string | null;
totalQuantity: number;
}


export class DashboardMetricsDto {
// total number of asset rows
totalCount: number;


// sum of `quantity` across all assets (useful for stock units)
totalQuantity: number;


// assets marked as disposed
disposedCount: number;


// counts per status
statusGroups: StatusGroup[];


// number of assets under the low-stock threshold
lowStockCount: number;


// top few locations (or groups) with smallest aggregated quantity
lowStockLocations: LowStockLocation[];


// the threshold used for low-stock calculation
lowStockThreshold?: number;
}