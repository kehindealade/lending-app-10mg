import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser, Role } from '../auth/role.enum';

@ApiTags('Institutions')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenants: TenantService) {}

  @ApiOperation({
    summary: '[SUPER_ADMIN] Register an institution',
    description: 'creates an instition and its first tenant admin.',
  })
  @Roles(Role.SUPER_ADMIN)
  @Post()
  register(@Body() dto: RegisterTenantDto) {
    return this.tenants.register(dto);
  }

  @ApiOperation({
    summary: '[SUPER_ADMIN] List tenants',
    description: 'Lists every tenants, newest first.',
  })
  @Roles(Role.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.tenants.findAll();
  }

  @ApiOperation({
    summary: '[TENANT_ADMIN] Get my tenants',
    description: "Returns the caller's own tenant.",
  })
  @Roles(Role.TENANT_ADMIN)
  @Get('me')
  getOwn(@CurrentUser() user: AuthUser) {
    return this.tenants.findOwn(user);
  }

  @ApiOperation({
    summary: '[TENANT_ADMIN] Update information about tenants',
    description: "Updates the branding of the caller's institution.",
  })
  @Roles(Role.TENANT_ADMIN)
  @Patch('me/branding')
  updateBranding(@CurrentUser() user: AuthUser, @Body() dto: UpdateBrandingDto) {
    return this.tenants.updateBranding(user, dto);
  }
}
