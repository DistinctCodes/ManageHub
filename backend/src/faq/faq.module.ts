import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FAQController } from './faq.controller';
import { FAQService } from './faq.service';
import { FAQ } from './faq.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FAQ])],
  controllers: [FAQController],
  providers: [FAQService],
  exports: [FAQService], // Export service for use in other modules if needed
})
export class FAQModule {}
