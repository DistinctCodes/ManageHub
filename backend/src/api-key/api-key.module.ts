import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiKey } from './api-key.entity';
import { ApiKeyUsage } from './api-key-usage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, ApiKeyUsage])],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
