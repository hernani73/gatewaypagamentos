"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Tracing_1 = require("./infrastructure/monitoring/Tracing");
(0, Tracing_1.initTracing)();
const ExpressServer_1 = require("./infrastructure/http/ExpressServer");
const Logger_1 = require("./infrastructure/monitoring/Logger");
const KafkaProducer_1 = require("./infrastructure/messaging/KafkaProducer");
const RedisClient_1 = require("./infrastructure/cache/RedisClient");
const ProcessPayment_1 = require("./application/use-cases/ProcessPayment");
async function bootstrap() {
    Logger_1.logger.info('🏗️ Inicializando Injeção de Dependências do Ledger Gateway...');
    try {
        const redisClient = new RedisClient_1.RedisClient();
        const kafkaProducer = new KafkaProducer_1.KafkaProducer();
        // 1. Conecta ao sistema de mensageria assíncrona distributed
        await kafkaProducer.connect();
        Logger_1.logger.info('🔌 Conectado ao Apache Kafka com sucesso.');
        // 2. Instancia o caso de uso injetando os provedores de infraestrutura
        const processPaymentUseCase = new ProcessPayment_1.ProcessPaymentUseCase(kafkaProducer, redisClient);
        // 3. Inicializa o servidor Express injetando o caso de uso
        const server = new ExpressServer_1.ExpressServer(processPaymentUseCase);
        const PORT = Number(process.env.PORT) || 3000;
        // CORREÇÃO: Substituído o process.exit(1) pela inicialização real do servidor.
        // Dependendo de como sua classe ExpressServer foi escrita, mude para o método correspondente (ex: server.listen(PORT))
        await server.start(PORT);
        Logger_1.logger.info(`⚡ Gateway Ingestion API escutando na porta ${PORT}`);
    }
    catch (error) {
        // Invertemos a ordem: primeiro o objeto de erro, depois a string explicativa
        Logger_1.logger.error(error, '❌ Falha crítica ao inicializar o Ledger Gateway');
        process.exit(1);
    }
}
bootstrap();
