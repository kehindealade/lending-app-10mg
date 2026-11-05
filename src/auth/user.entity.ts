import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
import { Role } from './role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  tenantId!: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email!: string;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: Role, enumName: 'user_role' })
  role!: Role;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
