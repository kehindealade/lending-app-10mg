export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  LOAN_OFFICER = 'LOAN_OFFICER',
  CUSTOMER = 'CUSTOMER',
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  tenantId: string;
}
