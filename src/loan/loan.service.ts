import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { LoanApplication, LoanStatus } from './loan-application.entity';
import { LoanProduct } from '../product/loan-product.entity';
import { AuditLog } from './audit-log.entity';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { RepayLoanDto } from './dto/repay-loan.dto';
import { AuthUser, Role } from '../auth/role.enum';
import { TenantScopeService } from '../common/tenant-scope.service';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(LoanApplication) private readonly loans: Repository<LoanApplication>,
    @InjectRepository(LoanProduct) private readonly products: Repository<LoanProduct>,
    private readonly dataSource: DataSource,
    private readonly scope: TenantScopeService,
  ) {}

  async apply(user: AuthUser, dto: ApplyLoanDto) {
    const product = await this.scope.findOne(this.products, user, {
      id: dto.productId,
      isActive: true,
    });
    if (!product) throw new NotFoundException('Loan product not found');
    if (dto.amount < Number(product.minAmount) || dto.amount > Number(product.maxAmount)) {
      throw new BadRequestException('Amount is outside the product limits');
    }

    const principalCents = BigInt(Math.round(dto.amount * 100));
    const rateBasisPoints = BigInt(Math.round(Number(product.interestRate) * 100));
    const feeCents = BigInt(Math.round(Number(product.fees) * 100));
    const interestCents = (principalCents * rateBasisPoints + 5000n) / 10000n;
    const totalCents = principalCents + interestCents + feeCents;

    const loan = this.loans.create({
      tenantId: user.tenantId,
      customerId: user.id,
      productId: product.id,
      amount: (Number(principalCents) / 100).toFixed(2),
      totalDue: (Number(totalCents) / 100).toFixed(2),
      status: LoanStatus.PENDING,
      transactionReference: null,
      disbursedAt: null,
      repaidAt: null,
    });

    return this.loans.save(loan);
  }

  async findOne(user: AuthUser, id: string) {
    const loan = await this.scope.findOne(this.loans, user, { id });
    if (!loan) throw new NotFoundException('Loan not found');
    if (user.role === Role.CUSTOMER && loan.customerId !== user.id) {
      throw new NotFoundException('Loan not found');
    }
    return loan;
  }

  findAll(user: AuthUser) {
    if (user.role === Role.CUSTOMER) {
      return this.scope.find(this.loans, user, { customerId: user.id });
    }
    return this.scope.find(this.loans, user, {});
  }

  async assess(user: AuthUser, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const loan = await manager.findOne(LoanApplication, {
        where: this.scope.where(user, { id }),
        lock: { mode: 'pessimistic_write' },
      });
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.status !== LoanStatus.PENDING) {
        throw new BadRequestException('Only pending loans can be assessed');
      }

      const approved = Number(loan.amount) < 10000;
      loan.status = approved ? LoanStatus.APPROVED : LoanStatus.REJECTED;
      await manager.save(LoanApplication, loan);

      await manager.save(AuditLog, manager.create(AuditLog, {
        tenantId: loan.tenantId,
        action: approved ? 'APPROVED' : 'REJECTED',
        entityType: 'LoanApplication',
        entityId: loan.id,
        performedBy: user.id,
        metaData: { method: 'MOCK_CREDIT_ASSESSMENT', approved, amount: loan.amount },
      }));
      return loan;
    });
  }

  async disburse(user: AuthUser, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const loan = await manager.findOne(LoanApplication, {
        where: this.scope.where(user, { id }),
        lock: { mode: 'pessimistic_write' },
      });
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.status !== LoanStatus.APPROVED) {
        throw new BadRequestException('Only approved loans can be disbursed');
      }

      const transactionReference = `MOCK-${randomUUID()}`;
      loan.status = LoanStatus.DISBURSED;
      loan.transactionReference = transactionReference;
      loan.disbursedAt = new Date();
      await manager.save(LoanApplication, loan);

      await manager.save(AuditLog, manager.create(AuditLog, {
        tenantId: loan.tenantId,
        action: 'DISBURSED',
        entityType: 'LoanApplication',
        entityId: loan.id,
        performedBy: user.id,
        metaData: { amount: loan.amount, transactionReference, provider: 'MOCK' },
      }));
      return loan;
    });
  }

  async repay(user: AuthUser, id: string, dto: RepayLoanDto) {
    return this.dataSource.transaction(async (manager) => {
      const loan = await manager.findOne(LoanApplication, {
        where: this.scope.where(user, { id }),
        lock: { mode: 'pessimistic_write' },
      });
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.customerId !== user.id) {
        throw new ForbiddenException('You cannot repay another customer loan');
      }
      if (loan.status !== LoanStatus.DISBURSED) {
        throw new BadRequestException('Only disbursed loans can be repaid');
      }

      const paymentCents = BigInt(Math.round(dto.amount * 100));
      const expectedCents = BigInt(Math.round(Number(loan.totalDue) * 100));
      if (paymentCents !== expectedCents) {
        throw new BadRequestException(`Full repayment amount must be ${loan.totalDue}`);
      }

      loan.status = LoanStatus.REPAID;
      loan.repaidAt = new Date();
      await manager.save(LoanApplication, loan);
      await manager.save(AuditLog, manager.create(AuditLog, {
        tenantId: loan.tenantId,
        action: 'REPAID',
        entityType: 'LoanApplication',
        entityId: loan.id,
        performedBy: user.id,
        metaData: { amount: dto.amount.toFixed(2), paymentMethod: 'MOCK' },
      }));
      return loan;
    });
  }
}
