"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressServer = void 0;
const express_1 = __importDefault(require("express"));
const Metrics_1 = require("../monitoring/Metrics");
class ExpressServer {
    processPaymentUseCase;
    app;
    constructor(processPaymentUseCase) {
        this.processPaymentUseCase = processPaymentUseCase;
        this.app = (0, express_1.default)();
        this.app.use(express_1.default.json());
        this.setupMiddlewares();
        this.setupRoutes();
    }
    setupMiddlewares() {
        this.app.use((req, res, next) => {
            res.on('finish', () => {
                Metrics_1.httpRequestCounter.inc({
                    method: req.method,
                    route: req.route?.path || req.url, // Captura a rota mapeada ou a URL crua
                    status: res.statusCode
                });
            });
            next();
        });
    }
    setupRoutes() {
        // Rota exigida pelo Prometheus para puxar os dados que alimentam o Grafana
        this.app.get('/metrics', async (_req, res) => {
            try {
                res.set('Content-Type', Metrics_1.metricsRegistry.contentType);
                res.end(await Metrics_1.metricsRegistry.metrics());
            }
            catch (error) {
                res.status(500).end(error);
            }
        });
        this.app.get('/health', (_req, res) => {
            res.status(200).json({ status: 'UP', timestamp: new Date() });
        });
        this.app.post('/api/v1/payments', async (req, res) => {
            try {
                const { accountId, amount, type } = req.body;
                if (!accountId || !amount || !type) {
                    return res.status(400).json({ error: "Missing required integration parameters." });
                }
                const output = await this.processPaymentUseCase.execute({ accountId, amount, type });
                if (!output.success) {
                    return res.status(409).json(output); // Conflict / Erro de negócio (ex: falta de saldo)
                }
                return res.status(202).json(output); // Accepted (Processamento assíncrono iniciado)
            }
            catch (error) {
                return res.status(500).json({ error: error.message || 'Gateway operational failure.' });
            }
        });
    }
    start(port) {
        this.app.listen(port, () => {
            console.log(`⚡ [Express] Gateway HTTP ativo e ouvindo requisições na porta ${port}`);
        });
    }
}
exports.ExpressServer = ExpressServer;
