import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteTeamMemberDto {
  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  email: string;
}
