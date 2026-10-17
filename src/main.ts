import { initTracing } from './infrastructure/monitoring/Tracing';
initTracing(); 

import { ExpressServer } from './infrastructure/http/ExpressServer';
import { logger } from './infrastructure/monitoring/Logger';
import { KafkaProducer } from './infrastructure/messaging/KafkaProducer';
import { RedisClient } from './infrastructure/cache/RedisClient';
import { ProcessPaymentUseCase } from './application/use-cases/ProcessPayment';

async function bootstrap() {
  logger.info('🏗️ Inicializando Injeção de Dependências do Ledger Gateway...');

  try {
    const redisClient = new RedisClient();
    const kafkaProducer = new KafkaProducer();

    // 1. Conecta ao sistema de mensageria assíncrona distributed
    await kafkaProducer.connect();
    logger.info('🔌 Conectado ao Apache Kafka com sucesso.');

    // 2. Instancia o caso de uso injetando os provedores de infraestrutura
    const processPaymentUseCase = new ProcessPaymentUseCase(kafkaProducer, redisClient);

    // 3. Inicializa o servidor Express injetando o caso de uso
    const server = new ExpressServer(processPaymentUseCase);
    
    const PORT = Number(process.env.PORT) || 3000;
    
    // CORREÇÃO: Substituído o process.exit(1) pela inicialização real do servidor.
    // Dependendo de como sua classe ExpressServer foi escrita, mude para o método correspondente (ex: server.listen(PORT))
    await server.start(PORT); 
    logger.info(`⚡ Gateway Ingestion API escutando na porta ${PORT}`);

 } catch (error: any) {
    // Invertemos a ordem: primeiro o objeto de erro, depois a string explicativa
    logger.error(error, '❌ Falha crítica ao inicializar o Ledger Gateway');
    process.exit(1);
  }
}

bootstrap();
