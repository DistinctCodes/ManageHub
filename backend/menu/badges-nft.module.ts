import { Module } from '@nestjs/common';
import { BadgesNftController } from './badges-nft.controller';
import { BadgesNftService } from './badges-nft.service';

@Module({
  controllers: [BadgesNftController],
  providers: [BadgesNftService],
})
export class BadgesNftModule {}
