import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessProvider } from '../enums/access-provider.enum';

export class ConfigureAccessDto {
  @ApiProperty({ enum: AccessProvider })
  @IsEnum(AccessProvider)
  provider: AccessProvider;

  @ApiProperty({ description: 'Provider API key or token' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Enable or disable the integration', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Provider-specific door group / credential-template ID',
  })
  @IsOptional()
  @IsString()
  doorGroupId?: string;
}
