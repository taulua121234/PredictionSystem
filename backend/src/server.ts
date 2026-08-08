import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { connectBettingDb } from './config/database';
import { seedAdmin } from './seed/seedAdmin';
import { setupSocketHandlers } from './modules/websocket/socketHandler';
import { createLogger } from './utils/logger';

const logger = createLogger('server');
const PORT = process.env.PORT || process.env.BETTING_PORT || 3005;

import { startCronJobs, stopCronJobs } from './tasks/cron';

async function start() {
  try {
    // Connect to MongoDB
    await connectBettingDb();
    await seedAdmin();

    // Create HTTP server
    const server = http.createServer(app);

    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8000').split(',').map(o => o.trim());
    const isDev = process.env.NODE_ENV === 'development';

    // Setup Socket.IO
    const io = new SocketServer(server, {
      cors: {
        origin: isDev ? true : (origin, callback) => {
          if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
      },
      // Memory optimization for low-spec hosting
      pingTimeout: 30000,          // Giảm từ 60s default
      pingInterval: 25000,         // Phát hiện disconnect sớm
      maxHttpBufferSize: 1e6,      // 1MB max message (giảm từ default 100MB)
      connectTimeout: 10000,       // Timeout kết nối 10s
      perMessageDeflate: false,    // Tắt compression (tiết kiệm CPU trên 0.1 vCPU)
    });

    setupSocketHandlers(io);

    // Make io accessible to controllers
    app.set('io', io);

    // Start cron jobs
    startCronJobs();

    // Graceful shutdown — cleanup khi Render restart
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      stopCronJobs();
      io.close();
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Force exit after 10s
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Start server
    server.listen(PORT, () => {
      logger.info(`🏇 Betting Platform running on port ${PORT}`);
      logger.info(`   API: http://localhost:${PORT}/api`);
      logger.info(`   WebSocket: ws://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
