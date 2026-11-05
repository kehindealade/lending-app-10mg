import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanApplication } from './loan-application.entity';
import { LoanProduct } from '../product/loan-product.entity';
import { AuditLog } from './audit-log.entity';
import { IdempotencyKey } from './idempotency-key.entity';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplication, LoanProduct, AuditLog, IdempotencyKey])],
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}
