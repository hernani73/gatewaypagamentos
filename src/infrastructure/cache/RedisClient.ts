import Redis from 'ioredis';
import { CacheProvider } from '../../application/use-cases/ProcessPayment';

export class RedisClient implements CacheProvider {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
      reconnectOnError: (err) => {
        if (err.message.includes('READONLY')) return true;
        return false;
      }
    });

    this.client.on('connect', () => {
      console.log('🚀 [Redis] Conectado à memória de cache de alta performance.');
    });
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

   public async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    
    if (result === null) {
      throw new Error(`Conflict: Key "${key}" already exists. Idempotency violation.`);
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
