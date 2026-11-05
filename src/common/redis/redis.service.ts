import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: ReturnType<typeof createClient>;

  constructor(config: ConfigService) {
    this.client = createClient({
      url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      socket: {
        reconnectStrategy: (retries) =>
          retries >= 5 ? new Error('Redis unavailable') : Math.min(retries * 100, 1000),
      },
    });
    this.client.on('error', () => undefined);
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client.isReady) return null;

    try {
      const value = await this.client.get(key);
      return value === null ? null : (JSON.parse(value) as T);
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, seconds: number): Promise<void> {
    if (!this.client.isReady) return;

    try {
      await this.client.set(key, JSON.stringify(value), { EX: seconds });
    } catch {
      return;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client.isReady) return;

    try {
      await this.client.del(key);
    } catch {
      return;
    }
  }

}
