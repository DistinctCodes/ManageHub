import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     type: 'postgres',
    //     database: configService.get('DATABASE_NAME'),
    //     password: configService.get('DATABASE_PASSWORD'),
    //     username: configService.get('DATABASE_USERNAME'),
    //     port: +configService.get('DATABASE_PORT'),
    //     host: configService.get('DATABASE_HOST'),
    //     autoLoadEntities: true,
    //     synchronize: true,
    //     ssl:
    //       configService.get('NODE_ENV') === 'production'
    //         ? { rejectUnauthorized: false }
    //         : false,
    //   }),
    // }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
