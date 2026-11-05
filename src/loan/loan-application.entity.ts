import {
  Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { LoanProduct } from '../product/loan-product.entity';

export enum LoanStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
  REPAID = 'REPAID',
}

@Entity('loan_applications')
export class LoanApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  tenantId!: string;

  @Index()
  @Column('uuid')
  customerId!: string;

  @Index()
  @Column('uuid')
  productId!: string;

  @Column('numeric', { precision: 14, scale: 2 })
  amount!: string;

  @Column('numeric', { precision: 14, scale: 2 })
  totalDue!: string;

  @Column({ type: 'enum', enum: LoanStatus, enumName: 'loan_status', default: LoanStatus.PENDING })
  status!: LoanStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionReference!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  disbursedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  repaidAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer!: User;

  @ManyToOne(() => LoanProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: LoanProduct;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
