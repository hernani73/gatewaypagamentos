"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisClient {
    client;
    constructor() {
        this.client = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            connectTimeout: 5000,
            reconnectOnError: (err) => {
                if (err.message.includes('READONLY'))
                    return true;
                return false;
            }
        });
        this.client.on('connect', () => {
            console.log('🚀 [Redis] Conectado à memória de cache de alta performance.');
        });
    }
    async get(key) {
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
        if (result === null) {
            throw new Error(`Conflict: Key "${key}" already exists. Idempotency violation.`);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
    async disconnect() {
        await this.client.quit();
    }
}
exports.RedisClient = RedisClient;
