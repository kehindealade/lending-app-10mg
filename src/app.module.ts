import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { ProductModule } from './product/product.module';
import { LoanModule } from './loan/loan.module';
import { CommonModule } from './common/common.module';
import { RedisModule } from './common/redis/redis.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { Tenant } from './tenant/tenant.entity';
import { User } from './auth/user.entity';
import { LoanProduct } from './product/loan-product.entity';
import { LoanApplication } from './loan/loan-application.entity';
import { AuditLog } from './loan/audit-log.entity';
import { IdempotencyKey } from './loan/idempotency-key.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME', 'lending'),
        password: config.get<string>('DB_PASSWORD', 'lending'),
        database: config.get<string>('DB_DATABASE', 'lending'),
        entities: [Tenant, User, LoanProduct, LoanApplication, AuditLog, IdempotencyKey],
        synchronize: config.get<string>('NODE_ENV') !== 'production' &&
          config.get<string>('DB_SYNC') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([IdempotencyKey]),
    CommonModule,
    RedisModule,
    AuthModule,
    TenantModule,
    ProductModule,
    LoanModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
