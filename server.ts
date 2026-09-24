import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';

// Import Vercel-compatible serverless API handlers so server.ts and Vercel run the EXACT same logic
import healthHandler from './api/health.js';
import agentHandler from './api/agent.js';
import parseTransactionHandler from './api/parse-transaction.js';
import parseSmsHandler from './api/parse-sms.js';
import stateHandler from './api/state.js';
import androidStatusHandler from './api/android/status.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Wire the serverless route handlers to Express endpoints
app.all('/api/health', (req: Request, res: Response) => {
  return healthHandler(req as any, res as any);
});

app.all('/api/agent', (req: Request, res: Response) => {
  return agentHandler(req as any, res as any);
});

app.all('/api/parse-transaction', (req: Request, res: Response) => {
  return parseTransactionHandler(req as any, res as any);
});

app.all('/api/parse-sms', (req: Request, res: Response) => {
  return parseSmsHandler(req as any, res as any);
});

app.all('/api/state', (req: Request, res: Response) => {
  return stateHandler(req as any, res as any);
});

app.all('/api/android/status', (req: Request, res: Response) => {
  return androidStatusHandler(req as any, res as any);
});

// Vite & Static Asset Handling for AI Studio & Local Server Mode
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: isHmrDisabled
          ? false
          : {
              server, // Attach HMR websocket to the existing HTTP server instance
              port: PORT,
              clientPort: process.env.CLIENT_PORT ? Number(process.env.CLIENT_PORT) : 443,
              protocol: process.env.CLIENT_PROTOCOL || 'wss',
            },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Budget Bridge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
