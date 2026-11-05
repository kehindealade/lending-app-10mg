import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export interface BrandingConfig {
  colors?: { primary?: string; secondary?: string };
  logoUrl?: string;
  supportEmail?: string;
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  branding!: BrandingConfig;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
