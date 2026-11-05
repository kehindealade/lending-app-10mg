import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanProduct } from './loan-product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthUser } from '../auth/role.enum';
import { TenantScopeService } from '../common/tenant-scope.service';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(LoanProduct) private readonly products: Repository<LoanProduct>,
    private readonly scope: TenantScopeService,
    private readonly redis: RedisService,
  ) {}

  async create(user: AuthUser, dto: CreateProductDto) {
    if (dto.minAmount > dto.maxAmount) {
      throw new BadRequestException('Minimum amount cannot exceed maximum amount');
    }
    const product = this.products.create({
      tenantId: user.tenantId,
      name: dto.name,
      interestRate: dto.interestRate.toFixed(2),
      minAmount: dto.minAmount.toFixed(2),
      maxAmount: dto.maxAmount.toFixed(2),
      fees: dto.fees.toFixed(2),
      repaymentConfig: dto.repaymentConfig,
      isActive: true,
    });
    try {
      const saved = await this.products.save(product);
      await this.redis.delete(`products:${user.tenantId}:active`);
      return saved;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Product name already exists in this institution');
      }
      throw error;
    }
  }

  async findAll(user: AuthUser) {
    const cacheKey = `products:${user.tenantId}:active`;
    const cached = await this.redis.getJson<LoanProduct[]>(cacheKey);
    if (cached) return cached;

    const products = await this.scope.find(this.products, user, { isActive: true });
    await this.redis.setJson(cacheKey, products, 60);
    return products;
  }

  async findOne(user: AuthUser, id: string) {
    const product = await this.scope.findOne(this.products, user, { id, isActive: true });
    if (!product) throw new NotFoundException('Loan product not found');
    return product;
  }

  async update(user: AuthUser, id: string, dto: UpdateProductDto) {
    const product = await this.findOne(user, id);
    const minAmount = dto.minAmount ?? Number(product.minAmount);
    const maxAmount = dto.maxAmount ?? Number(product.maxAmount);
    if (minAmount > maxAmount) throw new BadRequestException('Invalid amount range');
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.interestRate !== undefined) product.interestRate = dto.interestRate.toFixed(2);
    if (dto.minAmount !== undefined) product.minAmount = dto.minAmount.toFixed(2);
    if (dto.maxAmount !== undefined) product.maxAmount = dto.maxAmount.toFixed(2);
    if (dto.fees !== undefined) product.fees = dto.fees.toFixed(2);
    if (dto.repaymentConfig !== undefined) product.repaymentConfig = dto.repaymentConfig;
    try {
      const saved = await this.products.save(product);
      await this.redis.delete(`products:${user.tenantId}:active`);
      return saved;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Product name already exists in this institution');
      }
      throw error;
    }
  }

  async remove(user: AuthUser, id: string) {
    const product = await this.findOne(user, id);
    product.isActive = false;
    await this.products.save(product);
    await this.redis.delete(`products:${user.tenantId}:active`);
    return { id: product.id, isActive: false };
  }
}
