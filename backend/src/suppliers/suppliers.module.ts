import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { FileUploadsService } from '../file-uploads/file-uploads.service';
import { Supplier } from './suppliers.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier])],
  controllers: [SuppliersController],
  providers: [SuppliersService, FileUploadsService],
})
export class SuppliersModule {}
