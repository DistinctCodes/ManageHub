import { IsEmail, IsHexColor, IsOptional, IsPhoneNumber, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandingDto {
  @ApiPropertyOptional({ description: 'Display name of the hub', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  hubName?: string;

  @ApiPropertyOptional({ description: 'Cloudinary URL for the hub logo' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary URL for the favicon' })
  @IsOptional()
  @IsUrl()
  faviconUrl?: string;

  @ApiPropertyOptional({ description: 'Brand primary color in hex format, e.g. #2563EB' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Public support email address' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional({ description: 'Public support phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  supportPhone?: string;

  @ApiPropertyOptional({ description: 'Physical address of the hub' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'Social media links',
    example: { twitter: 'https://twitter.com/hub', instagram: '', linkedin: '' },
  })
  @IsOptional()
  socialLinks?: { twitter?: string; instagram?: string; linkedin?: string };
}
