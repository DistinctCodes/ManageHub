import { ApiProperty } from '@nestjs/swagger';

export class LinkChallengeResponseDto {
  @ApiProperty({
    description: 'Single-use nonce to sign with the external wallet',
  })
  nonce: string;

  @ApiProperty() expiresAt: Date;

  @ApiProperty({
    description:
      'Exact message the wallet must sign (issue #1946). Includes the app, ' +
      'user, address (when bound) and expiry so the user can review what ' +
      'they are authorising.',
  })
  message: string;
}
