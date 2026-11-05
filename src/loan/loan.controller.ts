import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoanService } from './loan.service';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { RepayLoanDto } from './dto/repay-loan.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser, Role } from '../auth/role.enum';

@ApiTags('Loans')
@ApiBearerAuth()
@Controller('loans')
export class LoanController {
  constructor(private readonly loans: LoanService) {}

  @Roles(Role.CUSTOMER)
  @Post('apply')
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyLoanDto) {
    return this.loans.apply(user, dto);
  }

  @Roles(Role.CUSTOMER, Role.LOAN_OFFICER, Role.TENANT_ADMIN)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.loans.findAll(user);
  }

  @Roles(Role.CUSTOMER, Role.LOAN_OFFICER, Role.TENANT_ADMIN)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.loans.findOne(user, id);
  }

  @Roles(Role.LOAN_OFFICER)
  @Post(':id/assess')
  assess(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.loans.assess(user, id);
  }

  @Roles(Role.LOAN_OFFICER)
  @Post(':id/disburse')
  disburse(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.loans.disburse(user, id);
  }

  @Roles(Role.CUSTOMER)
  @Post(':id/repay')
  repay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepayLoanDto,
  ) {
    return this.loans.repay(user, id, dto);
  }
}
