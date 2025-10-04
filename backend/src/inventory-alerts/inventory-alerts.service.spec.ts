import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryAlertsService } from './inventory-alerts.service';
import { InventoryItem } from './entities/inventory-item.entity';
import { Alert } from './entities/alert.entity';
import { Repository } from 'typeorm';

describe('InventoryAlertsService', () => {
  let service: InventoryAlertsService;
  let moduleRef: TestingModule;
  let itemsRepo: Repository<InventoryItem>;
  let alertsRepo: Repository<Alert>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [InventoryItem, Alert],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([InventoryItem, Alert]),
      ],
      providers: [InventoryAlertsService],
    }).compile();

    service = moduleRef.get<InventoryAlertsService>(InventoryAlertsService);
    itemsRepo = moduleRef.get('InventoryItemRepository');
    alertsRepo = moduleRef.get('AlertRepository');
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await alertsRepo.query(`DELETE FROM alerts`);
    await itemsRepo.query(`DELETE FROM inventory_items`);
  });

  it('creates alert when item quantity <= threshold', async () => {
    const item = itemsRepo.create({ name: 'Test', sku: 'T-1', quantity: 2, threshold: 5 });
    await itemsRepo.save(item);

    const alert = await service.checkItemThreshold(item.id);
    expect(alert).toBeDefined();
    const unresolved = await alertsRepo.find({ where: { resolved: false } });
    expect(unresolved.length).toBe(1);
  });

  it('resolves alert when item goes above threshold', async () => {
    const item = itemsRepo.create({ name: 'Resolve', sku: 'R-1', quantity: 0, threshold: 3 });
    await itemsRepo.save(item);

    await service.checkItemThreshold(item.id);
    // bump quantity
    await itemsRepo.update({ id: item.id }, { quantity: 10 });
    await service.checkItemThreshold(item.id);

    const unresolved = await alertsRepo.find({ where: { resolved: false } });
    expect(unresolved.length).toBe(0);
    const resolved = await alertsRepo.find({ where: { resolved: true } });
    expect(resolved.length).toBeGreaterThanOrEqual(1);
  });

  it('getAlerts returns total and alerts', async () => {
    const item = itemsRepo.create({ name: 'P', sku: 'P1', quantity: 0, threshold: 5 });
    await itemsRepo.save(item);

    await alertsRepo.save(alertsRepo.create({ item, sku: item.sku, itemName: item.name, currentQuantity: 0, threshold: 5 }));

    const res = await service.getAlerts({ skip: 0, limit: 10 });
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.alerts)).toBeTruthy();
  });
});
