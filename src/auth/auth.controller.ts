import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, Role } from './role.enum';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({
    summary: '[PUBLIC] Log in',
    description: 'checks email and password and returns a JWT access token.',
  })
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: '[TENANT_ADMIN] Create a user',
    description: "creates a tenant admin, loan officer or customer",
  })
  @Roles(Role.TENANT_ADMIN)
  @Post('users')
  createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.auth.createUser(user, dto);
  }
}
