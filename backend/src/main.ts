import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is needed by the payment webhook controller to verify HMAC
  // signatures against the exact bytes the provider signed, not a
  // re-serialized copy of the parsed JSON body.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('ManageHub API')
    .setDescription(
      'ManageHub backend API.\n\n' +
        '## Payment state machine\n' +
        'INITIATED -> AWAITING_CONFIRMATION -> CONFIRMED | FAILED | EXPIRED\n' +
        'CONFIRMED -> REFUNDED | PARTIALLY_REFUNDED\n' +
        'All transitions are enforced by a single guarded service method.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 6000;
  await app.listen(port);
}
bootstrap();
