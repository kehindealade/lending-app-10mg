import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum, IsInt, IsNumber, IsString, Max, MaxLength,
  Min, MinLength, ValidateNested,
} from 'class-validator';
import { RepaymentFrequency } from '../loan-product.entity';

export class RepaymentConfigDto {
  @ApiProperty({ enum: RepaymentFrequency })
  @IsEnum(RepaymentFrequency)
  frequency!: RepaymentFrequency;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  tenure!: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Salary Advance' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 12.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  interestRate!: number;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000)
  minAmount!: number;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000)
  maxAmount!: number;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000000)
  fees!: number;

  @ApiProperty({ type: RepaymentConfigDto })
  @ValidateNested()
  @Type(() => RepaymentConfigDto)
  repaymentConfig!: RepaymentConfigDto;
}
