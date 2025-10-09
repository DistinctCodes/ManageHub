/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuditLogsInterceptor } from './audit-logs/audit-logs.interceptor';
import { AuditLogsService } from './audit-logs/audit-logs.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // GLOBAL VALIDATION
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // GLOBAL SERIALIZATION
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // GLOBAL AUDIT LOGGING INTERCEPTOR
  const auditLogsService = app.get(AuditLogsService);
  app.useGlobalInterceptors(new AuditLogsInterceptor(auditLogsService));

  // ENABLE CORS
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [
            'https://managehub.vercel.app',
            'https://www.managehub.vercel.app',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
          ]
        : true,
    credentials: true,
  });

  // SWAGGER SETUP
  const config = new DocumentBuilder()
    .setTitle('ManageHub API')
    .setDescription('API documentation for ManageHub backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('swagger', app as any, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Server is listening at: ${await app.getUrl()}`);
}
bootstrap();
