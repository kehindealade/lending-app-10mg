import { IsEmail, IsHexColor, IsOptional, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BrandingColorsDto {
  @ApiPropertyOptional({ example: '#123456' })
  @IsOptional()
  @IsHexColor()
  primary?: string;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @IsHexColor()
  secondary?: string;
}

export class UpdateBrandingDto {
  @ApiPropertyOptional({ type: BrandingColorsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingColorsDto)
  colors?: BrandingColorsDto;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'support@examplebank.com' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;
}
