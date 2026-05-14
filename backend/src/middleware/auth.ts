import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as respond from '../utils/responseHelper';
import { BettingUser } from '../models/User';

export interface JwtPayload {
  id: string;
  username: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verify JWT token and attach user payload to request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      respond.unauthorized(res, 'Access token required');
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      respond.serverError(res, 'JWT_SECRET not configured');
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // Check if user is locked
    if (decoded.role === 'user') {
      const userRecord = await BettingUser.findById(decoded.id).select('isLocked').lean();
      if (!userRecord) {
         respond.unauthorized(res, 'User not found');
         return;
      }
      if (userRecord.isLocked) {
         respond.forbidden(res, 'Tài khoản của bạn đã bị khóa');
         return;
      }
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      respond.unauthorized(res, 'Token expired');
      return;
    }
    respond.unauthorized(res, 'Invalid token');
  }
}

/**
 * Check if user has admin role
 */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    respond.unauthorized(res, 'Authentication required');
    return;
  }
  if (req.user.role !== 'admin') {
    respond.forbidden(res, 'Admin access required');
    return;
  }
  next();
}

/**
 * Async handler wrapper
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
