import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'Post body text', maxLength: 1000, minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body: string;
}
