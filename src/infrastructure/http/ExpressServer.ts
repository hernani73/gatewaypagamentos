import express, { Express, Request, Response } from 'express';
import { ProcessPaymentUseCase } from '../../application/use-cases/ProcessPayment';
import { metricsRegistry, httpRequestCounter } from '../monitoring/Metrics';

export class ExpressServer {
  private app: Express;

  constructor(private readonly processPaymentUseCase: ProcessPaymentUseCase) {
    this.app = express();
    this.app.use(express.json());
    
    this.setupMiddlewares();
    
    this.setupRoutes();
  }

  private setupMiddlewares(): void {
    this.app.use((req, res, next) => {
      res.on('finish', () => {
        httpRequestCounter.inc({
          method: req.method,
          route: req.route?.path || req.url, // Captura a rota mapeada ou a URL crua
          status: res.statusCode
        });
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Rota exigida pelo Prometheus para puxar os dados que alimentam o Grafana
    this.app.get('/metrics', async (_req: Request, res: Response) => {
      try {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    });

    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'UP', timestamp: new Date() });
    });

    this.app.post('/api/v1/payments', async (req: Request, res: Response) => {
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
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Gateway operational failure.' });
      }
    });
  }

  public start(port: number): void {
    this.app.listen(port, () => {
      console.log(`⚡ [Express] Gateway HTTP ativo e ouvindo requisições na porta ${port}`);
    });
  }
}
