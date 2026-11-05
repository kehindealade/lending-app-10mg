import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthUser } from './role.enum';
import { Tenant } from '../tenant/tenant.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const tenant = await this.tenants.findOneBy({ id: user.tenantId, isActive: true });
    if (!tenant) throw new UnauthorizedException('Institution is inactive');

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    };
  }

  async createUser(actor: AuthUser, dto: CreateUserDto) {
    const existing = await this.users.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email already registered');

    const user = this.users.create({
      tenantId: actor.tenantId,
      email: dto.email,
      role: dto.role,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });

    try {
      const saved = await this.users.save(user);
      return { id: saved.id, tenantId: saved.tenantId, email: saved.email, role: saved.role };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }
}
