import { QueueProvider } from '../../application/use-cases/ProcessPayment';

// Interface Abstrata de Domínio (Porta de Saída de Infraestrutura)
export interface TransactionRepository extends QueueProvider {
  publishLedger(topic: string, payload: any): Promise<void>;
}
