import { Injectable } from '@nestjs/common';
import { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { AuthUser, Role } from '../auth/role.enum';

@Injectable()
export class TenantScopeService {
  where<T extends ObjectLiteral & { tenantId: string }>(
    user: AuthUser,
    criteria: FindOptionsWhere<T>,
  ): FindOptionsWhere<T> {
    if (user.role === Role.SUPER_ADMIN) return criteria;

    return {
      ...criteria,
      tenantId: user.tenantId,
    } as FindOptionsWhere<T>;
  }

  findOne<T extends ObjectLiteral & { tenantId: string }>(
    repository: Repository<T>,
    user: AuthUser,
    criteria: FindOptionsWhere<T>,
  ): Promise<T | null> {
    return repository.findOne({ where: this.where(user, criteria) });
  }

  find<T extends ObjectLiteral & { tenantId: string }>(
    repository: Repository<T>,
    user: AuthUser,
    criteria: FindOptionsWhere<T>,
  ): Promise<T[]> {
    return repository.find({ where: this.where(user, criteria) });
  }
}
