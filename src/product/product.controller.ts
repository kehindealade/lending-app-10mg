import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

  @Roles(Role.TENANT_ADMIN)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }

  @Roles(Role.TENANT_ADMIN, Role.LOAN_OFFICER, Role.CUSTOMER)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.products.findAll(user);
  }

  @Roles(Role.TENANT_ADMIN, Role.LOAN_OFFICER, Role.CUSTOMER)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(user, id);
  }

  @Roles(Role.TENANT_ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user, id, dto);
  }

  @Roles(Role.TENANT_ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(user, id);
  }
}
