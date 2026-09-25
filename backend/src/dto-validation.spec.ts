import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InitiatePaymentDto } from './payments/dto/initiate-payment.dto';
import { CreateRefundDto } from './payments/dto/create-refund.dto';
import { ResolvePaymentManuallyDto } from './payments/dto/resolve-payment-manually.dto';
import { VoidPaymentDto } from './payments/dto/void-payment.dto';
import { PaymentRail } from './payments/enums/payment-rail.enum';
import { PaymentStatus } from './payments/enums/payment-status.enum';
import { RecordMeteredUsageDto } from './credits/dto/record-metered-usage.dto';
import { ChargeCreditsDto } from './credits/dto/charge-credits.dto';
import {
  AbandonSettlementBatchDto,
  AdjustCreditsDto,
  AttachSplitConfigDto,
  CreateLedgerAccountDto,
  CreateSettlementBatchDto,
  UpdateLedgerAccountDto,
} from './credits/dto/ledger-admin.dto';
import {
  CreateRevenueSplitConfigDto,
  PreviewSplitDto,
  ReplaceSplitRecipientsDto,
  RevenueSplitRecipientDto,
  SetSplitConfigActiveDto,
} from './credits/dto/revenue-split-config.dto';
import { LedgerAccountKind } from './credits/enums/ledger-account-kind.enum';
import { MeteredResource } from './credits/enums/metered-resource.enum';
import { FundWalletDto } from './wallets/dto/fund-wallet.dto';
import { VerifyLinkDto } from './wallets/dto/verify-link.dto';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

async function validationErrors(
  type: new () => object,
  payload: Record<string, unknown>,
) {
  return validate(plainToInstance(type, payload));
}

interface DtoValidationCase {
  name: string;
  type: new () => object;
  valid: Record<string, unknown>;
  invalid: Record<string, unknown>;
}

const cases: DtoValidationCase[] = [
  {
    name: 'InitiatePaymentDto',
    type: InitiatePaymentDto,
    valid: {
      bookingId: VALID_UUID,
      amount: 5000,
      currency: 'USD',
      rail: PaymentRail.FIAT,
      provider: 'demo-fiat',
      metadata: { source: 'demo' },
    },
    invalid: {
      bookingId: 'not-a-uuid',
      amount: 0,
      currency: 'US',
      rail: 'CASH',
      provider: '',
      metadata: [],
    },
  },
  {
    name: 'CreateRefundDto',
    type: CreateRefundDto,
    valid: { amount: 100, reason: 'Customer requested a refund' },
    invalid: { amount: 0, reason: '' },
  },
  {
    name: 'ResolvePaymentManuallyDto',
    type: ResolvePaymentManuallyDto,
    valid: {
      resolution: PaymentStatus.CONFIRMED,
      reason: 'Provider supplied an authoritative receipt',
    },
    invalid: { resolution: PaymentStatus.EXPIRED, reason: '' },
  },
  {
    name: 'VoidPaymentDto',
    type: VoidPaymentDto,
    valid: { reason: 'Booking was abandoned' },
    invalid: { reason: '' },
  },
  {
    name: 'RecordMeteredUsageDto',
    type: RecordMeteredUsageDto,
    valid: {
      userId: VALID_UUID,
      resource: MeteredResource.PRINTING,
      units: 10,
      unitPrice: 5,
      currency: 'USD',
      usageReference: 'demo-print-1',
    },
    invalid: {
      userId: 'not-a-uuid',
      resource: 'PAPER',
      units: 0,
      unitPrice: 0,
      currency: 'US',
      usageReference: '',
    },
  },
  {
    name: 'ChargeCreditsDto',
    type: ChargeCreditsDto,
    valid: {
      userId: VALID_UUID,
      amount: 250,
      currency: 'USD',
      reference: 'demo-charge-1',
      reason: 'Demo usage',
      metadata: { source: 'validation-spec' },
    },
    invalid: {
      userId: 'not-a-uuid',
      amount: 0,
      currency: 'US',
      reference: '',
      reason: '',
      metadata: [],
    },
  },
  {
    name: 'CreateLedgerAccountDto',
    type: CreateLedgerAccountDto,
    valid: {
      kind: LedgerAccountKind.USER,
      ownerId: VALID_UUID,
      currency: 'USD',
      overdraftLimit: 0,
      externalPayoutAddress: 'GDEMOOPERATOR',
      label: 'demo user',
    },
    invalid: {
      kind: 'WALLET',
      ownerId: 'not-a-uuid',
      currency: 'US',
      overdraftLimit: -1,
      externalPayoutAddress: '',
    },
  },
  {
    name: 'UpdateLedgerAccountDto',
    type: UpdateLedgerAccountDto,
    valid: { externalPayoutAddress: '', label: '' },
    invalid: { overdraftLimit: -1, frozen: 'yes' },
  },
  {
    name: 'AdjustCreditsDto',
    type: AdjustCreditsDto,
    valid: {
      userId: VALID_UUID,
      delta: -250,
      currency: 'USD',
      reference: 'demo-adjustment-1',
      reason: 'Manual correction',
    },
    invalid: { userId: VALID_UUID, delta: 0, reference: '', reason: '' },
  },
  {
    name: 'AttachSplitConfigDto',
    type: AttachSplitConfigDto,
    valid: { splitConfigId: VALID_UUID },
    invalid: { splitConfigId: 'not-a-uuid' },
  },
  {
    name: 'AbandonSettlementBatchDto',
    type: AbandonSettlementBatchDto,
    valid: { reason: 'Destination address is no longer valid' },
    invalid: { reason: '' },
  },
  {
    name: 'CreateSettlementBatchDto',
    type: CreateSettlementBatchDto,
    valid: { currency: 'USD', splitConfigName: 'demo-split' },
    invalid: { currency: 'US', splitConfigName: '' },
  },
  {
    name: 'RevenueSplitRecipientDto',
    type: RevenueSplitRecipientDto,
    valid: {
      label: 'operator',
      basisPoints: 10000,
      accountId: VALID_UUID,
      sortOrder: 0,
    },
    invalid: { label: '', basisPoints: 0, accountId: 'not-a-uuid' },
  },
  {
    name: 'CreateRevenueSplitConfigDto',
    type: CreateRevenueSplitConfigDto,
    valid: {
      name: 'demo-split',
      description: 'A local demo split',
      recipients: [
        { label: 'operator', basisPoints: 10000, accountId: VALID_UUID },
      ],
    },
    invalid: {
      name: '',
      description: 42,
      recipients: [{ label: '', basisPoints: 0 }],
    },
  },
  {
    name: 'ReplaceSplitRecipientsDto',
    type: ReplaceSplitRecipientsDto,
    valid: {
      recipients: [
        { label: 'operator', basisPoints: 10000, accountId: VALID_UUID },
      ],
    },
    invalid: { recipients: [] },
  },
  {
    name: 'SetSplitConfigActiveDto',
    type: SetSplitConfigActiveDto,
    valid: { active: false },
    invalid: { active: 'false' },
  },
  {
    name: 'PreviewSplitDto',
    type: PreviewSplitDto,
    valid: { configId: VALID_UUID, amount: 0 },
    invalid: { configId: 'not-a-uuid', amount: -1 },
  },
  {
    name: 'FundWalletDto',
    type: FundWalletDto,
    valid: { amount: 1000, reason: 'Demo funding' },
    invalid: { amount: 0, reason: '' },
  },
  {
    name: 'VerifyLinkDto',
    type: VerifyLinkDto,
    valid: {
      nonce: 'a'.repeat(64),
      address: 'GDEMOEXTERNALADDRESS',
      signature: 'ZGVtby1zaWduYXR1cmU=',
    },
    invalid: { nonce: '', address: '', signature: '' },
  },
];

describe('request DTO validation audit', () => {
  it.each(cases)('$name accepts a known-good payload', async ({ type, valid }) => {
    await expect(validationErrors(type, valid)).resolves.toHaveLength(0);
  });

  it.each(cases)('$name rejects malformed values', async ({ type, invalid }) => {
    await expect(validationErrors(type, invalid)).resolves.not.toHaveLength(0);
  });

  it('allows a negative adjustment but rejects a zero adjustment', async () => {
    const negative = await validationErrors(AdjustCreditsDto, {
      userId: VALID_UUID,
      delta: -1,
      reference: 'negative-adjustment',
      reason: 'Valid negative correction',
    });
    expect(negative).toHaveLength(0);

    const zero = await validationErrors(AdjustCreditsDto, {
      userId: VALID_UUID,
      delta: 0,
      reference: 'zero-adjustment',
      reason: 'Invalid zero correction',
    });
    expect(zero).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'delta' }),
      ]),
    );
  });

  it('keeps an explicit empty payout-address update valid', async () => {
    await expect(
      validationErrors(UpdateLedgerAccountDto, { externalPayoutAddress: '' }),
    ).resolves.toHaveLength(0);
  });

  it('enforces the wallet reason and link length bounds', async () => {
    const reasonErrors = await validationErrors(FundWalletDto, {
      amount: 1,
      reason: 'x'.repeat(501),
    });
    expect(reasonErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'reason' }),
      ]),
    );

    const linkErrors = await validationErrors(VerifyLinkDto, {
      nonce: 'x'.repeat(257),
      address: 'GDEMOEXTERNALADDRESS',
      signature: 'ZGVtby1zaWduYXR1cmU=',
    });
    expect(linkErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'nonce' }),
      ]),
    );
  });
});
