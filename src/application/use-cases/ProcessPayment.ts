import { Transaction } from '../../domain/entities/Transaction';

export interface ProcessPaymentInput {
  accountId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
}

export interface ProcessPaymentOutput {
  id: string;
  status: string;
  success: boolean;
  message?: string;
}

export interface QueueProvider {
  publishLedger(topic: string, payload: any): Promise<void>;
}

export interface CacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export class ProcessPaymentUseCase {
  constructor(
    private readonly queueProvider: QueueProvider,
    private readonly cacheProvider: CacheProvider
  ) {}

  public async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    const transaction = Transaction.create({
      accountId: input.accountId,
      amount: input.amount,
      type: input.type
    });

    const idempotencyKey = `ledger:idempotency:${input.accountId}:${input.amount}`;

    try {
   
      await this.cacheProvider.set(idempotencyKey, 'PROCESSING', 5);
      
    } catch (error: any) {
      transaction.reject();
      return {
        id: transaction.getId(),
        status: transaction.getStatus(),
        success: false,
        message: "Duplicate transaction rejected by ledger idempotency barrier."
      };
    }

    transaction.approve();

    try {
      await this.queueProvider.publishLedger('payments-ledger-topic', transaction.toJSON());

      return {
        id: transaction.getId(),
        status: transaction.getStatus(),
        success: true
      };
    } catch (kafkaError) {
      // Se houver uma falha catastrófica ao enviar para o Kafka, precisamos limpar o cache
      // para permitir que o cliente reenvie a transação.
      if ('del' in this.cacheProvider && typeof (this.cacheProvider as any).del === 'function') {
        await (this.cacheProvider as any).del(idempotencyKey);
      }
      throw kafkaError;
    }
  }
}
