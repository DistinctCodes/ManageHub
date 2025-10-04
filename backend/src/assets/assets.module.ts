import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Asset } from './assets.entity';
import { AssetsService } from './assets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  providers: [AssetsService],
  exports: [AssetsService], // Export AssetsService
})
export class AssetsModule {}
