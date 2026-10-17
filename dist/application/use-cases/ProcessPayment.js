"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessPaymentUseCase = void 0;
const Transaction_1 = require("../../domain/entities/Transaction");
class ProcessPaymentUseCase {
    queueProvider;
    cacheProvider;
    constructor(queueProvider, cacheProvider) {
        this.queueProvider = queueProvider;
        this.cacheProvider = cacheProvider;
    }
    async execute(input) {
        const transaction = Transaction_1.Transaction.create({
            accountId: input.accountId,
            amount: input.amount,
            type: input.type
        });
        const idempotencyKey = `ledger:idempotency:${input.accountId}:${input.amount}`;
        try {
            await this.cacheProvider.set(idempotencyKey, 'PROCESSING', 5);
        }
        catch (error) {
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
        }
        catch (kafkaError) {
            // Se houver uma falha catastrófica ao enviar para o Kafka, precisamos limpar o cache
            // para permitir que o cliente reenvie a transação.
            if ('del' in this.cacheProvider && typeof this.cacheProvider.del === 'function') {
                await this.cacheProvider.del(idempotencyKey);
            }
            throw kafkaError;
        }
    }
}
exports.ProcessPaymentUseCase = ProcessPaymentUseCase;
