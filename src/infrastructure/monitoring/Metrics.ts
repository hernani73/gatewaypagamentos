import client from 'prom-client';

client.collectDefaultMetrics();

export const httpRequestCounter = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total de requisições HTTP recebidas no Gateway',
  labelNames: ['method', 'route', 'status'],
});

export const metricsRegistry = client.register;
