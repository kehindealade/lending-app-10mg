import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class ApplyLoanDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000)
  amount!: number;
}
