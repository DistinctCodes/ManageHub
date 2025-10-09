import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsDto } from './dto/dashboard-metrics.dto';


@Controller('dashboard')
export class DashboardController {
constructor(private readonly service: DashboardService) {}


/**
* GET /dashboard/metrics
* Optional query: lowStockThreshold (number) — threshold to consider "low stock"
*/
@Get('metrics')
async getMetrics(@Query('lowStockThreshold') lowStockThreshold?: string): Promise<DashboardMetricsDto> {
const threshold = lowStockThreshold ? Number(lowStockThreshold) : undefined;
return this.service.getMetrics({ lowStockThreshold: threshold });
}
}