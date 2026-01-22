import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx'
  })
  @IsNotEmpty()
  token: string;
}
