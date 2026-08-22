import { ApiProperty } from '@nestjs/swagger';

export class LinkChallengeResponseDto {
  @ApiProperty({
    description: 'Single-use nonce to sign with the external wallet',
  })
  nonce: string;

  @ApiProperty() expiresAt: Date;
}
