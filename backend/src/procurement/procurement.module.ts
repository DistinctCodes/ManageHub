import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementRequest } from './entities/procurement-request.entity';
import { ProcurementService } from './providers/procurement.service';
import { ProcurementController } from './procurement.controller';
import { UsersModule } from '../users/users.module';
import { ASSET_REGISTRATION_TOKEN } from './interfaces/asset-registration.interface';

// Default no-op provider for asset registration; can be overridden in root module if needed
const DefaultAssetRegistrationProvider: Provider = {
  provide: ASSET_REGISTRATION_TOKEN,
  useValue: {
    registerAsset: async () => undefined,
  },
};

@Module({
  imports: [TypeOrmModule.forFeature([ProcurementRequest]), UsersModule],
  controllers: [ProcurementController],
  providers: [ProcurementService, DefaultAssetRegistrationProvider],
  exports: [ProcurementService],
})
export class ProcurementModule {}