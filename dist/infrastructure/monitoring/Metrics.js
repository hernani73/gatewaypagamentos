"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRegistry = exports.httpRequestCounter = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
prom_client_1.default.collectDefaultMetrics();
exports.httpRequestCounter = new prom_client_1.default.Counter({
    name: 'gateway_http_requests_total',
    help: 'Total de requisições HTTP recebidas no Gateway',
    labelNames: ['method', 'route', 'status'],
});
exports.metricsRegistry = prom_client_1.default.register;
