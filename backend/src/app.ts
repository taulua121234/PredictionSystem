import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { errorHandler } from './middleware/auth';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import raceRoutes from './modules/races/race.routes';
import betRoutes from './modules/bets/bet.routes';
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes';
import adminRoutes from './modules/admin/admin.routes';
import umaRoutes from './modules/uma/uma.routes';

const app: Express = express();

// ==================== Middleware ====================

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests' },
});
app.use(limiter);

// ==================== Health Check ====================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'betting-platform', timestamp: new Date().toISOString() });
});

// ==================== API Routes ====================

app.use('/api/auth', authRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/umas', umaRoutes);

// ==================== Error Handler ====================

app.use(errorHandler);

export default app;
