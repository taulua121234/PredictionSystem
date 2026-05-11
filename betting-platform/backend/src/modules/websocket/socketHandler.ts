import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createLogger } from '../../utils/logger';

const logger = createLogger('websocket');

export function setupSocketHandlers(io: SocketServer) {
  // JWT authentication for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow unauthenticated connections for public race viewing
      (socket as any).user = null;
      return next();
    }

    try {
      const secret = process.env.JWT_SECRET!;
      const decoded = jwt.verify(token, secret);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      // Still allow connection but without user data
      (socket as any).user = null;
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const userId = user?.id;

    if (userId) {
      // Join personal room for user-specific updates
      socket.join(`user:${userId}`);
      logger.debug(`User connected: ${user.username} (${socket.id})`);
    } else {
      logger.debug(`Anonymous connection: ${socket.id}`);
    }

    // Join race room for live updates
    socket.on('race:join', (raceId: string) => {
      socket.join(`race:${raceId}`);
      logger.debug(`${socket.id} joined race:${raceId}`);
    });

    socket.on('race:leave', (raceId: string) => {
      socket.leave(`race:${raceId}`);
      logger.debug(`${socket.id} left race:${raceId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket handlers initialized');
}

/**
 * Broadcast helpers — call these from controllers after state changes
 */
export function broadcastRaceUpdate(io: SocketServer, raceId: string, data: any) {
  io.to(`race:${raceId}`).emit('race:update', data);
}

export function broadcastBetUpdate(io: SocketServer, raceId: string, data: any) {
  io.to(`race:${raceId}`).emit('bet:update', data);
}

export function broadcastTopPick(io: SocketServer, raceId: string, data: any) {
  io.to(`race:${raceId}`).emit('top-pick:update', data);
}

export function broadcastLeaderboard(io: SocketServer, data: any) {
  io.emit('leaderboard:update', data);
}

export function sendUserPointUpdate(io: SocketServer, userId: string, points: number) {
  io.to(`user:${userId}`).emit('user:point', { currentPoints: points });
}
