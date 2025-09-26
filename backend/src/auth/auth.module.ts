import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: HashingProvider, useClass: BcryptProvider }],
  exports: [HashingProvider],
})
export class AuthModule {}