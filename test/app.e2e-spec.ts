import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';

describe('Lending API (e2e)', () => {
  let app: INestApplication;
  const suffix = randomUUID().slice(0, 8);
  const tenantEmail = `admin-${suffix}@example.com`;
  const customerEmail = `customer-${suffix}@example.com`;
  const officerEmail = `officer-${suffix}@example.com`;
  const password = 'TestPassword123!';

  let superAdminToken: string;
  let tenantAdminToken: string;
  let customerToken: string;
  let officerToken: string;
  let productId: string;
  let loanId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a tenant and completes the loan workflow', async () => {
    const platformLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      })
      .expect(201);
    superAdminToken = platformLogin.body.accessToken;

    const tenant = await request(app.getHttpServer())
      .post('/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `Test Bank ${suffix}`,
        adminEmail: tenantEmail,
        adminPassword: password,
      })
      .expect(201);
    expect(tenant.body.tenant.id).toBeDefined();
    expect(tenant.body.admin.role).toBe('TENANT_ADMIN');

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: tenantEmail, password })
      .expect(201);
    tenantAdminToken = adminLogin.body.accessToken;

    const product = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({
        name: 'Salary Advance',
        interestRate: 10,
        minAmount: 1000,
        maxAmount: 20000,
        fees: 100,
        repaymentConfig: { frequency: 'MONTHLY', tenure: 1 },
      })
      .expect(201);
    productId = product.body.id;
    expect(productId).toBeDefined();

    const beforeUpdate = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(200);

    expect(beforeUpdate.body.some((item: { id: string }) => item.id === productId)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({ name: 'Salary Advance Updated' })
      .expect(200);

    const afterUpdate = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(200);

    expect(afterUpdate.body.find((item: { id: string }) => item.id === productId).name)
      .toBe('Salary Advance Updated');

    await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({ email: customerEmail, password, role: 'CUSTOMER' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({ email: officerEmail, password, role: 'LOAN_OFFICER' })
      .expect(201);

    const customerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: customerEmail, password })
      .expect(201);
    customerToken = customerLogin.body.accessToken;

    const officerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: officerEmail, password })
      .expect(201);
    officerToken = officerLogin.body.accessToken;

    const application = await request(app.getHttpServer())
      .post('/loans/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ productId, amount: 5000 })
      .expect(201);
    loanId = application.body.id;
    expect(application.body.status).toBe('PENDING');
    expect(Number(application.body.totalDue)).toBe(5600);

    const assessment = await request(app.getHttpServer())
      .post(`/loans/${loanId}/assess`)
      .set('Authorization', `Bearer ${officerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({})
      .expect(201);
    expect(assessment.body.status).toBe('APPROVED');

    const disbursementKey = randomUUID();
    const disbursement = await request(app.getHttpServer())
      .post(`/loans/${loanId}/disburse`)
      .set('Authorization', `Bearer ${officerToken}`)
      .set('Idempotency-Key', disbursementKey)
      .send({})
      .expect(201);
    expect(disbursement.body.status).toBe('DISBURSED');
    expect(disbursement.body.transactionReference).toMatch(/^MOCK-/);

    const replay = await request(app.getHttpServer())
      .post(`/loans/${loanId}/disburse`)
      .set('Authorization', `Bearer ${officerToken}`)
      .set('Idempotency-Key', disbursementKey)
      .send({})
      .expect(201);
    expect(replay.body.transactionReference).toBe(disbursement.body.transactionReference);

    await request(app.getHttpServer())
      .post(`/loans/${loanId}/disburse`)
      .set('Authorization', `Bearer ${officerToken}`)
      .set('Idempotency-Key', disbursementKey)
      .send({ changed: true })
      .expect(409);

    const repayment = await request(app.getHttpServer())
      .post(`/loans/${loanId}/repay`)
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ amount: 5600 })
      .expect(201);
    expect(repayment.body.status).toBe('REPAID');
    expect(repayment.body.repaidAt).toBeDefined();
  });

  it('keeps a second institution isolated from the first', async () => {
    const secondEmail = `second-admin-${suffix}@example.com`;
    await request(app.getHttpServer())
      .post('/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `Another Bank ${suffix}`,
        adminEmail: secondEmail,
        adminPassword: password,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: secondEmail, password })
      .expect(201);
    const secondToken = login.body.accessToken;

    const products = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(200);
    expect(products.body).toEqual([]);

    await request(app.getHttpServer())
      .get(`/loans/${loanId}`)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(404);
  });

  it('prevents customers from viewing other customers loans', async () => {
    const anotherEmail = `another-${suffix}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({ email: anotherEmail, password, role: 'CUSTOMER' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: anotherEmail, password })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/loans/${loanId}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(404);
  });
});
