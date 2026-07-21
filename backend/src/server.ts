import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { connectBettingDb } from './config/database';
import { seedAdmin } from './seed/seedAdmin';
import { setupSocketHandlers } from './modules/websocket/socketHandler';
import { createLogger } from './utils/logger';

const logger = createLogger('server');
const PORT = process.env.BETTING_PORT || 3005;

import { startCronJobs } from './tasks/cron';

async function start() {
  try {
    // Connect to MongoDB
    await connectBettingDb();
    await seedAdmin();

    // Create HTTP server
    const server = http.createServer(app);

    // Setup Socket.IO
    const io = new SocketServer(server, {
      cors: {
        origin: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(',').map(o => o.trim()),
        credentials: true,
      },
    });

    setupSocketHandlers(io);

    // Make io accessible to controllers
    app.set('io', io);

    // Start cron jobs
    startCronJobs();

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
