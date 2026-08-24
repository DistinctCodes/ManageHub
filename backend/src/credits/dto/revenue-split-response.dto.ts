import { ApiProperty } from '@nestjs/swagger';
import { RevenueSplitConfig } from '../entities/revenue-split-config.entity';
import { RevenueSplitRecipient } from '../entities/revenue-split-recipient.entity';
import { ComputedSplitShare } from '../revenue-split.service';

export class RevenueSplitRecipientResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() label: string;
  @ApiProperty() basisPoints: number;
  @ApiProperty({ nullable: true }) accountId: string | null;
  @ApiProperty({ nullable: true }) externalAddress: string | null;
  @ApiProperty() sortOrder: number;

  static fromEntity(
    recipient: RevenueSplitRecipient,
  ): RevenueSplitRecipientResponseDto {
    const dto = new RevenueSplitRecipientResponseDto();
    dto.id = recipient.id;
    dto.label = recipient.label;
    dto.basisPoints = recipient.basisPoints;
    dto.accountId = recipient.accountId;
    dto.externalAddress = recipient.externalAddress;
    dto.sortOrder = recipient.sortOrder;
    return dto;
  }
}

export class RevenueSplitConfigResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() active: boolean;
  @ApiProperty({ type: [RevenueSplitRecipientResponseDto] })
  recipients: RevenueSplitRecipientResponseDto[];
  @ApiProperty({
    description:
      'Sum of the recipients’ basis points. Always 10000 for a config ' +
      'this API accepted — surfaced so an operator can see it at a glance.',
  })
  totalBasisPoints: number;
  @ApiProperty() createdAt: Date;

  static fromEntity(config: RevenueSplitConfig): RevenueSplitConfigResponseDto {
    const recipients = config.recipients ?? [];
    const dto = new RevenueSplitConfigResponseDto();
    dto.id = config.id;
    dto.name = config.name;
    dto.description = config.description;
    dto.active = config.active;
    dto.recipients = recipients.map((recipient) =>
      RevenueSplitRecipientResponseDto.fromEntity(recipient),
    );
    dto.totalBasisPoints = recipients.reduce(
      (sum, recipient) => sum + recipient.basisPoints,
      0,
    );
    dto.createdAt = config.createdAt;
    return dto;
  }
}

/**
 * What a config would allocate for a given amount, without posting
 * anything — including how many minor units of the rounding remainder each
 * recipient received, so the largest-remainder rule is inspectable rather
 * than merely documented.
 */
export class SplitPreviewResponseDto {
  @ApiProperty() amount: number;
  @ApiProperty({
    description: 'Always equal to `amount` — no remainder is ever dropped.',
  })
  allocatedTotal: number;
  @ApiProperty({
    example: [
      {
        recipientId: 'uuid',
        label: 'platform fee',
        basisPoints: 1500,
        amount: 1500,
        remainderUnits: 0,
      },
    ],
  })
  shares: Array<{
    recipientId: string;
    label: string;
    basisPoints: number;
    amount: number;
    remainderUnits: number;
  }>;

  static fromShares(
    amount: number,
    shares: ComputedSplitShare[],
  ): SplitPreviewResponseDto {
    const dto = new SplitPreviewResponseDto();
    dto.amount = amount;
    dto.allocatedTotal = shares.reduce((sum, share) => sum + share.amount, 0);
    dto.shares = shares.map((share) => ({
      recipientId: share.recipient.id,
      label: share.recipient.label,
      basisPoints: share.recipient.basisPoints,
      amount: share.amount,
      remainderUnits: share.remainderUnits,
    }));
    return dto;
  }
}
