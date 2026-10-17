"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cluster_1 = __importDefault(require("node:cluster"));
const node_os_1 = __importStar(require("node:os"));
const fastify_1 = __importDefault(require("fastify"));
const kafkajs_1 = require("kafkajs"); // IMPORTANTE: Adicionado logLevel
const KAFKA_BROKERS = process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['kafka:29092'];
// Configuração otimizada para silenciar avisos de conexão pendente durante o boot
const kafka = new kafkajs_1.Kafka({
    clientId: 'gateway-api',
    brokers: KAFKA_BROKERS,
    logLevel: kafkajs_1.logLevel.NOTHING, // CORREÇÃO: Silencia logs ruidosos do driver até a conexão firmar
    retry: {
        initialRetryTime: 1000,
        retries: 3,
        restartOnFailure: async (error) => true // Força o desvio interno de falha de DNS
    }
});
const producer = kafka.producer({
    idempotent: true,
});
if (node_cluster_1.default.isPrimary) {
    const numCPUs = typeof node_os_1.availableParallelism === 'function' ? (0, node_os_1.availableParallelism)() : node_os_1.default.cpus().length;
    console.log(`[Master] 🏗️ Inicializando cluster corporativo em ${numCPUs} cores...`);
    console.log(`[Master] 📍 Barramento de mensageria configurado para: ${KAFKA_BROKERS}`);
    for (let i = 0; i < numCPUs; i++) {
        node_cluster_1.default.fork(process.env);
    }
}
else {
    const server = (0, fastify_1.default)({ logger: false });
    server.post('/v1/payments', async (request, reply) => {
        try {
            const { idempotency_key, account_id, amount, type } = request.body;
            if (!idempotency_key || !account_id || !amount || !type) {
                return reply.status(400).send({ error: 'Missing required fields' });
            }
            await producer.send({
                topic: 'payment-transactions',
                messages: [{
                        key: account_id,
                        value: JSON.stringify({ idempotency_key, account_id, amount, type })
                    }]
            });
            return reply.status(202).send({ status: 'ACCEPTED' });
        }
        catch (error) {
            console.error(`[Worker ${process.pid}] ❌ Falha ao publicar evento de pagamento:`, error);
            return reply.status(500).send({ error: 'Internal Server Error to stream event', details: String(error) });
        }
    });
    const start = async () => {
        const RETRY_INTERVAL = 5000;
        try {
            console.log(`[Worker ${process.pid}] 🔄 Verificando barramento de rede...`);
            // Abre a conexão com o Kafka
            await producer.connect();
            // Só liga o Fastify na porta 3000 se o barramento Kafka estiver 100% pronto
            await server.listen({ port: 3000, host: '0.0.0.0' });
            console.log(`[Worker ${process.pid}] ⚡ API Ingestion online na porta 3000 e conectada com sucesso.`);
        }
        catch (err) {
            // CORREÇÃO: Captura real da falha de DNS ou timeout
            console.error(`[Worker ${process.pid}] ⏳ Kafka ainda inicializando no Docker. Nova tentativa em 5 segundos...`);
            setTimeout(start, RETRY_INTERVAL);
        }
    };
    start();
}
