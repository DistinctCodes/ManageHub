import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          database: configService.get('DATABASE_NAME'),
          password: configService.get('DATABASE_PASSWORD'),
          username: configService.get('DATABASE_USERNAME'),
          port: +configService.get('DATABASE_PORT'),
          host: configService.get('DATABASE_HOST'),
          autoLoadEntities: true,
          synchronize: true,
          // synchronize: process.env.NODE_ENV === 'development', // Disable in production
          logging: process.env.NODE_ENV === 'development',
          ssl: { rejectUnauthorized: false },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per minute
      },
    ]),
    AuthModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
