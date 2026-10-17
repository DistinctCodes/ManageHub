import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Optional body for the wallet-link challenge endpoint (issue #1946).
 *
 * Supplying `address` binds the challenge to that external wallet: the
 * signed message names it, and verification rejects consuming the challenge
 * with any other address. It is optional only for backward compatibility
 * with clients that still request an unbound challenge.
 */
export class CreateLinkChallengeDto {
  @ApiPropertyOptional({
    description:
      'External wallet public address to bind the challenge to (recommended)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  address?: string;
}
