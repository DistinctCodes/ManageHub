import { Controller, Get, Query } from '@nestjs/common';
import { InventoryAlertsService } from '../inventory-alerts.service';
import { GetAlertsQueryDto } from '../dto/get-alerts.query.dto';

@Controller('inventory/alerts')
export class InventoryAlertsController {
  constructor(private readonly svc: InventoryAlertsService) {}

  /**
   * GET /inventory/alerts
   * query: resolved (true|false), skip, limit, itemId
   */
  @Get()
  async fetchAlerts(@Query() q: GetAlertsQueryDto) {
    const resolved = q.resolved === undefined ? undefined : q.resolved === 'true';
    const skip = q.skip ? Number(q.skip) : 0;
    const limit = q.limit ? Number(q.limit) : 50;
    const itemId = q.itemId;

    return this.svc.getAlerts({ resolved, skip, limit, itemId });
  }
}
