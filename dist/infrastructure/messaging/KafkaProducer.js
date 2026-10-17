"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducer = void 0;
const kafkajs_1 = require("kafkajs");
class KafkaProducer {
    kafka;
    producer;
    constructor() {
        this.kafka = new kafkajs_1.Kafka({
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
    async connect() {
        await this.producer.connect();
        console.log('🔌 [Kafka] Produtor de altíssima performance conectado com sucesso.');
    }
    async disconnect() {
        await this.producer.disconnect();
    }
    async publishLedger(topic, payload) {
        await this.producer.send({
            topic,
            acks: -1,
            compression: kafkajs_1.CompressionTypes.GZIP,
            messages: [
                {
                    key: payload.accountId,
                    value: JSON.stringify(payload)
                }
            ]
        });
    }
}
exports.KafkaProducer = KafkaProducer;
