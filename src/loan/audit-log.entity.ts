import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  tenantId!: string;

  @Column({ length: 50 })
  action!: string;

  @Column({ length: 80 })
  entityType!: string;

  @Index()
  @Column('uuid')
  entityId!: string;

  @Column('uuid')
  performedBy!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metaData!: Record<string, unknown>;
}
