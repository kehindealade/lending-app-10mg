import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, Unique } from 'typeorm';

@Entity('idempotency_keys')
@Unique(['tenantId', 'key'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 128 })
  key!: string;

  @Index()
  @Column('uuid')
  tenantId!: string;

  @Column({ length: 64 })
  requestHash!: string;

  @Column({ type: 'jsonb', nullable: true })
  response!: unknown | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
