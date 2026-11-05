import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from './tenant.entity';
import { User } from '../auth/user.entity';
import { Role, AuthUser } from '../auth/role.enum';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterTenantDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const tenant = await manager.save(
          Tenant,
          manager.create(Tenant, { name: dto.name, isActive: true, branding: {} }),
        );
        const admin = await manager.save(
          User,
          manager.create(User, {
            tenantId: tenant.id,
            email: dto.adminEmail,
            passwordHash: await bcrypt.hash(dto.adminPassword, 10),
            role: Role.TENANT_ADMIN,
            isActive: true,
          }),
        );
        return {
          tenant,
          admin: { id: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId },
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Tenant admin email already registered');
      }
      throw error;
    }
  }

  findAll() {
    return this.tenants.find({ order: { createdAt: 'DESC' } });
  }

  async findOwn(user: AuthUser) {
    const tenant = await this.tenants.findOneBy({ id: user.tenantId });
    if (!tenant) throw new NotFoundException('Institution not found');

    return tenant;
  }

  async updateBranding(user: AuthUser, dto: UpdateBrandingDto) {
    const tenant = await this.findOwn(user);
    tenant.branding = {
      ...tenant.branding,
      ...dto,
      colors: { ...tenant.branding.colors, ...dto.colors },
    };
    return this.tenants.save(tenant);
  }
}
