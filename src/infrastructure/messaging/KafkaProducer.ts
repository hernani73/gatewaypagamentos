import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { QueueProvider } from '../../application/use-cases/ProcessPayment';

export class KafkaProducer implements QueueProvider {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'gateway-ledger-service',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
      connectionTimeout: 5000, 
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.producer = this.kafka.producer({
      idempotent: true, 
      maxInFlightRequests: 1, 
    });
  }

  public async connect(): Promise<void> {
    await this.producer.connect();
    console.log('🔌 [Kafka] Produtor de altíssima performance conectado com sucesso.');
  }

  public async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  public async publishLedger(topic: string, payload: any): Promise<void> {
    await this.producer.send({
      topic,
      acks: -1, 
      compression: CompressionTypes.GZIP, 
      messages: [
        { 
          key: payload.accountId, 
          value: JSON.stringify(payload) 
        }
      ]
    });
  }
}
