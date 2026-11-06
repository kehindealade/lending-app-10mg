import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @ApiOperation({
    summary: '[CUSTOMER] Apply for a loan',
    description: 'create a PENDING loan for an active product. The amount must be within the product limits.',
  })
  @Roles(Role.CUSTOMER)
  @Post('apply')
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyLoanDto) {
    return this.loans.apply(user, dto);
  }

  @ApiOperation({
    summary: '[CUSTOMER, LOAN_OFFICER, TENANT_ADMIN] List loans',
    description: 'customers see their own loans, staffs see every loan in their institution.',
  })
  @Roles(Role.CUSTOMER, Role.LOAN_OFFICER, Role.TENANT_ADMIN)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.loans.findAll(user);
  }

  @ApiOperation({
    summary: '[CUSTOMER, LOAN_OFFICER, TENANT_ADMIN] Get a loan',
    description: 'fetch one loan. Customers can only fetch their own.',
  })
  @Roles(Role.CUSTOMER, Role.LOAN_OFFICER, Role.TENANT_ADMIN)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.loans.findOne(user, id);
  }

  @ApiOperation({
    summary: '[LOAN_OFFICER] Assess a loan',
    description: 'Runs the mock credit score check on a PENDING loan and score it APPROVED or REJECTED.',
  })
  @Roles(Role.LOAN_OFFICER)
  @Post(':id/assess')
  assess(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.loans.assess(user, id);
  }

  @ApiOperation({
    summary: '[LOAN_OFFICER] Disburse a loan',
    description: 'pays out an APPROVED loan and marks it DISBURSED.',
  })
  @Roles(Role.LOAN_OFFICER)
  @Post(':id/disburse')
  disburse(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.loans.disburse(user, id);
  }

  @ApiOperation({
    summary: '[CUSTOMER] Repay a loan',
    description: "repays the customer's DISBURSED loan in full and marks it REPAID. must be full amount, no installments",
  })
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
