import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyLinkDto {
  @ApiProperty({ description: 'The nonce issued by the challenge endpoint' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 256)
  nonce: string;

  @ApiProperty({ description: 'The external wallet public address' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 256)
  address: string;

  @ApiProperty({
    description: 'Base64-encoded signature of the nonce, signed by address',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 4096)
  signature: string;
}
