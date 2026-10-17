import cluster from 'node:cluster';
import os, { availableParallelism } from 'node:os'; 
import Fastify from 'fastify';
import { Kafka, logLevel } from 'kafkajs'; // IMPORTANTE: Adicionado logLevel

const KAFKA_BROKERS = process.env.KAFKA_BROKERS 
  ? process.env.KAFKA_BROKERS.split(',') 
  : ['kafka:29092'];

// Configuração otimizada para silenciar avisos de conexão pendente durante o boot
const kafka = new Kafka({ 
  clientId: 'gateway-api', 
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.NOTHING, // CORREÇÃO: Silencia logs ruidosos do driver até a conexão firmar
  retry: {
    initialRetryTime: 1000,
    retries: 3,
    restartOnFailure: async (error) => true // Força o desvio interno de falha de DNS
  }
});

const producer = kafka.producer({
  idempotent: true, 
});

if (cluster.isPrimary) {
  const numCPUs = typeof availableParallelism === 'function' ? availableParallelism() : os.cpus().length;
  
  console.log(`[Master] 🏗️ Inicializando cluster corporativo em ${numCPUs} cores...`);
  console.log(`[Master] 📍 Barramento de mensageria configurado para: ${KAFKA_BROKERS}`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork(process.env);
  }
} else {
  const server = Fastify({ logger: false });

  server.post('/v1/payments', async (request, reply) => {
    try {
      const { idempotency_key, account_id, amount, type } = request.body as any;

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
    } catch (error) {
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
    } catch (err) {
      // CORREÇÃO: Captura real da falha de DNS ou timeout
      console.error(`[Worker ${process.pid}] ⏳ Kafka ainda inicializando no Docker. Nova tentativa em 5 segundos...`);
      setTimeout(start, RETRY_INTERVAL);
    }
  };
  
  start();
}
