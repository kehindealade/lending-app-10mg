import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

export enum RepaymentFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface RepaymentConfig {
  frequency: RepaymentFrequency;
  tenure: number;
}

@Entity('loan_products')
@Index(['tenantId', 'name'], { unique: true })
export class LoanProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  tenantId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column('numeric', { precision: 5, scale: 2 })
  interestRate!: string;

  @Column('numeric', { precision: 14, scale: 2 })
  minAmount!: string;

  @Column('numeric', { precision: 14, scale: 2 })
  maxAmount!: string;

  @Column('numeric', { precision: 14, scale: 2, default: 0 })
  fees!: string;

  @Column('jsonb')
  repaymentConfig!: RepaymentConfig;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
