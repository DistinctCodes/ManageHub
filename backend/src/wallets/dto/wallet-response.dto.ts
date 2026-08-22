import { ApiProperty } from '@nestjs/swagger';
import { WalletCustodyType } from '../enums/wallet-custody-type.enum';
import { WalletStatus } from '../enums/wallet-status.enum';
import { WalletStatusView } from '../wallets.service';

/**
 * Deliberately excludes any key-material field — there is no field here
 * that could ever be populated with a decrypted secret, by construction.
 */
export class WalletResponseDto {
  @ApiProperty({
    description: 'Whether the user has provisioned or linked a wallet yet',
  })
  provisioned: boolean;

  @ApiProperty({ nullable: true }) walletAddress: string | null;
  @ApiProperty({ enum: WalletCustodyType, nullable: true })
  custodyType: WalletCustodyType | null;
  @ApiProperty({ enum: WalletStatus, nullable: true })
  status: WalletStatus | null;
  @ApiProperty({ description: 'Balance in minor units (e.g. stroops)' })
  balance: number;
  @ApiProperty() currency: string;

  static fromView(view: WalletStatusView): WalletResponseDto {
    const dto = new WalletResponseDto();
    dto.provisioned = view.account !== null;
    dto.walletAddress = view.account?.address ?? null;
    dto.custodyType = view.account?.custodyType ?? null;
    dto.status = view.account?.status ?? null;
    dto.balance = view.balance;
    dto.currency = view.currency;
    return dto;
  }
}
