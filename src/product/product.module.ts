import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanProduct } from './loan-product.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanProduct])],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
