import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Email substring to search for (min 2 characters, wildcards escaped)',
    minLength: 2,
    maxLength: 254,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2, { message: 'email search query must be at least 2 characters' })
  @MaxLength(254)
  email?: string;
}
