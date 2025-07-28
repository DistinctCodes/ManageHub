import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EnergyModule } from '../src/energy/energy.module';
import { EnergyConsumptionService } from '../src/energy/services/energy-consumption.service';
import { EnergyConsumptionController } from '../src/energy/controllers/energy-consumption.controller';

describe('EnergyModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        EnergyModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have EnergyConsumptionService', () => {
    const service = module.get<EnergyConsumptionService>(EnergyConsumptionService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(EnergyConsumptionService);
  });

  it('should have EnergyConsumptionController', () => {
    const controller = module.get<EnergyConsumptionController>(EnergyConsumptionController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(EnergyConsumptionController);
  });

  it('should export EnergyConsumptionService', () => {
    const service = module.get<EnergyConsumptionService>(EnergyConsumptionService);
    expect(service).toBeDefined();
  });
});
