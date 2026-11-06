import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, Role } from '../auth/role.enum';

@ApiTags('Loan Products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly products: ProductService) {}

  @ApiOperation({
    summary: '[TENANT_ADMIN] Create a product',
    description: "creates a loan product for the tenant",
  })
  @Roles(Role.TENANT_ADMIN)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }

  @ApiOperation({
    summary: '[TENANT_ADMIN, LOAN_OFFICER, CUSTOMER] List products',
    description: "Lists the active products for the tenant",
  })
  @Roles(Role.TENANT_ADMIN, Role.LOAN_OFFICER, Role.CUSTOMER)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.products.findAll(user);
  }

  @ApiOperation({
    summary: '[TENANT_ADMIN, LOAN_OFFICER, CUSTOMER] Get a product',
    description: 'fetch one active product.',
  })
  @Roles(Role.TENANT_ADMIN, Role.LOAN_OFFICER, Role.CUSTOMER)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(user, id);
  }

  @ApiOperation({
    summary: '[TENANT_ADMIN] Update a product',
    description: 'Updates an active product.',
  })
  @Roles(Role.TENANT_ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user, id, dto);
  }

  @ApiOperation({
    summary: '[TENANT_ADMIN] Deactivate a product',
    description: 'soft delete the product as inactive and keeps the record.',
  })
  @Roles(Role.TENANT_ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(user, id);
  }
}
