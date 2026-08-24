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
        'All transitions are enforced by a single guarded service method.\n\n' +
        '## Credit ledger\n' +
        'Charges too small to settle on-chain per event move value inside a ' +
        'double-entry ledger instead: a charge debits the member and credits ' +
        'platform revenue, and value only crosses the platform boundary ' +
        'later, in one netted settlement batch per recipient.\n' +
        '- Every ledger transaction balances (debits == credits) and its ' +
        '`reference` is unique, so any retry is a no-op rather than a ' +
        'duplicate.\n' +
        '- A charge is refused if it would breach the account overdraft ' +
        'ceiling (0 by default), checked under the account row lock so ' +
        'concurrent charges cannot overdraw together.\n' +
        '- Revenue splits are basis points summing to exactly 10000, ' +
        'allocated by the largest-remainder method so rounding never loses ' +
        'or duplicates a minor unit.\n' +
        '- Settlement never marks a ledger entry settled until the payout ' +
        'rail confirms the transfer from fresh state.',
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
