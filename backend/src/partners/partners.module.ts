import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { Partner } from './entities/partner.entity';
import { PartnerContact } from './entities/partner-contact.entity';
import { PartnerService } from './entities/partner-service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Partner,
      PartnerContact,
      PartnerService,
    ])
  ],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
