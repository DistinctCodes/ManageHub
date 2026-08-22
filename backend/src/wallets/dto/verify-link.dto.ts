import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyLinkDto {
  @ApiProperty({ description: 'The nonce issued by the challenge endpoint' })
  @IsString()
  nonce: string;

  @ApiProperty({ description: 'The external wallet public address' })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Base64-encoded signature of the nonce, signed by address',
  })
  @IsString()
  signature: string;
}
