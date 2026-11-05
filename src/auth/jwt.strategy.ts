import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from '../tenant/tenant.entity';
import { AuthUser, JwtPayload } from './role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub || !payload.tenantId || !payload.role) {
      throw new UnauthorizedException();
    }

    const user = await this.users.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId, isActive: true },
    });
    if (!user || user.role !== payload.role) {
      throw new UnauthorizedException();
    }

    const tenant = await this.tenants.findOne({
      where: { id: user.tenantId, isActive: true },
    });
    if (!tenant) throw new UnauthorizedException('Institution is inactive');

    return { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
  }
}
