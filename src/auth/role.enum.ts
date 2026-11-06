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

// every jwt token has these values when decoded so uou can't switch tenant 
export interface JwtPayload {
  sub: string;
  role: Role;
  tenantId: string;
}
