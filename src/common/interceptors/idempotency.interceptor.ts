import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { IdempotencyKey } from '../../loan/idempotency-key.entity';
import { AuthUser } from '../../auth/role.enum';
import { RedisService } from '../redis/redis.service';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

interface CachedIdempotencyResponse {
  requestHash: string;
  response: unknown;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly keys: Repository<IdempotencyKey>,
    private readonly redis: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    const header = request.headers['idempotency-key'];
    const key = Array.isArray(header) ? header[0] : header;

    if (request.method !== 'POST' || !user || !key) return next.handle();
    if (typeof key !== 'string' || key.length > 128) {
      throw new BadRequestException('Invalid Idempotency-Key');
    }

    const payload = {
      method: request.method,
      path: request.originalUrl.split('?')[0],
      body: canonicalize(request.body),
      userId: user.id,
    };
    const requestHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const keyDigest = createHash('sha256').update(key).digest('hex');
    const cacheKey = `idempotency:${user.tenantId}:${keyDigest}`;

    const cached = await this.redis.getJson<CachedIdempotencyResponse>(cacheKey);
    if (cached) {
      if (cached.requestHash !== requestHash) {
        throw new ConflictException('Idempotency-Key already used for another request');
      }
      return of(cached.response);
    }

    const reservation = await this.keys
      .createQueryBuilder()
      .insert()
      .into(IdempotencyKey)
      .values({ key, tenantId: user.tenantId, requestHash, response: null as any })
      .orIgnore()
      .returning('id')
      .execute();

    const reservationId = reservation.raw[0]?.id as string | undefined;

    if (!reservationId) {
      const existing = await this.keys.findOne({
        where: { key, tenantId: user.tenantId },
      });
      if (!existing) throw new ConflictException('Retry the request');
      if (existing.requestHash !== requestHash) {
        throw new ConflictException('Idempotency-Key already used for another request');
      }
      if (existing.response === null) {
        throw new ConflictException('Request is still processing');
      }
      await this.redis.setJson(cacheKey, {
        requestHash,
        response: existing.response,
      }, 86400);
      return of(existing.response);
    }

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        const cachedResponse = JSON.parse(JSON.stringify(response));
        await this.keys.update({ id: reservationId }, { response: cachedResponse });
        await this.redis.setJson(cacheKey, {
          requestHash,
          response: cachedResponse,
        }, 86400);
        return response;
      }),
      catchError((error: unknown) =>
        from(this.keys.delete({ id: reservationId })).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
    );
  }
}
