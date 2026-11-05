import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, MinLength, MaxLength } from 'class-validator';
import { Role } from '../role.enum';

export class CreateUserDto {
  @ApiProperty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ enum: [Role.TENANT_ADMIN, Role.LOAN_OFFICER, Role.CUSTOMER] })
  @IsIn([Role.TENANT_ADMIN, Role.LOAN_OFFICER, Role.CUSTOMER])
  role!: Role;
}
