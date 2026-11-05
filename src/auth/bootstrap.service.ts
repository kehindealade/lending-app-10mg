import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Role } from './role.enum';
import { Tenant } from '../tenant/tenant.entity';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.getOrThrow<string>('BOOTSTRAP_ADMIN_EMAIL').trim().toLowerCase();
    const password = this.config.getOrThrow<string>('BOOTSTRAP_ADMIN_PASSWORD');
    const existing = await this.users.findOneBy({ email });

    if (existing) {
      if (existing.role !== Role.SUPER_ADMIN) {
        throw new Error('Bootstrap email belongs to another account');
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.dataSource.transaction(async (manager) => {
      const platform = await manager.save(
        Tenant,
        manager.create(Tenant, { name: '10MG Platform', isActive: true, branding: {} }),
      );
      await manager.save(
        User,
        manager.create(User, {
          tenantId: platform.id, email, role: Role.SUPER_ADMIN,
          passwordHash, isActive: true,
        }),
      );
    });
  }
}
