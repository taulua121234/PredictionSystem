import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { BettingUser } from '../../models/User';
import { getExternalTicketModel } from '../../config/database';
import { mapTicketTier } from '../../utils/pointsCalculator';
import * as respond from '../../utils/responseHelper';
import { createLogger } from '../../utils/logger';

const logger = createLogger('auth');

function generateToken(user: any): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { id: user._id.toString(), username: user.username, role: user.role },
    secret,
    { expiresIn: expiresIn as any }
  );
}

/**
 * POST /auth/login-ticket
 * Login with a ticket code from the EViENT ticket system
 */
export async function loginWithTicket(req: Request, res: Response) {
  try {
    const { ticketCode } = req.body;

    if (!ticketCode || typeof ticketCode !== 'string') {
      return respond.badRequest(res, 'ticketCode is required');
    }

    const trimmedCode = ticketCode.trim();

    // 1. Validate ticket against evient_orders database
    const ExternalTicket = getExternalTicketModel();
    const ticket = await (ExternalTicket as any).findOne({ ticketCode: trimmedCode }).lean();

    if (!ticket) {
      return respond.notFound(res, 'Ticket code not found. Please check your ticket.');
    }

    const ticketData = ticket as any;

    if (ticketData.status !== 'valid' && ticketData.status !== 'used') {
      return respond.badRequest(res, `Ticket is ${ticketData.status}. Cannot login.`);
    }

    // 2. Find or create betting user
    let user = await BettingUser.findOne({ ticketCode: trimmedCode });

    if (!user) {
      // Map ticket type to tier & starting points
      const { tier, startingPoints } = mapTicketTier(ticketData.ticketTypeName || 'NORMAL');

      // Generate username from buyer info or ticket code
      const buyerName = ticketData.buyerSnapshot?.fullName || `Player_${trimmedCode.slice(-6)}`;

      user = await BettingUser.create({
        ticketCode: trimmedCode,
        username: buyerName,
        tier,
        startingPoints,
        currentPoints: startingPoints,
        totalBet: 0,
        totalPayout: 0,
        role: 'user',
        isActive: true,
      });

      logger.info(`New betting user created: ${user.username} (${tier}, ${startingPoints} pts)`);
    }

    if (!user.isActive) {
      return respond.forbidden(res, 'Account has been deactivated');
    }

    // 3. Generate JWT
    const token = generateToken(user);

    respond.success(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        tier: user.tier,
        currentPoints: user.currentPoints,
        startingPoints: user.startingPoints,
        totalBet: user.totalBet,
        totalPayout: user.totalPayout,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    respond.serverError(res, 'Login failed');
  }
}

/**
 * POST /auth/login-admin
 * Admin login with username + password
 */
export async function loginAdmin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return respond.badRequest(res, 'Username and password are required');
    }

    const admin = await BettingUser.findOne({ username, role: 'admin' });
    if (!admin || !admin.passwordHash) {
      return respond.unauthorized(res, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return respond.unauthorized(res, 'Invalid credentials');
    }

    const token = generateToken(admin);

    respond.success(res, {
      token,
      user: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (err) {
    logger.error('Admin login error:', err);
    respond.serverError(res, 'Login failed');
  }
}

/**
 * GET /auth/me
 * Get current user profile
 */
export async function getMe(req: Request, res: Response) {
  try {
    const user = await BettingUser.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      return respond.notFound(res, 'User not found');
    }

    respond.success(res, {
      id: user._id,
      username: user.username,
      tier: user.tier,
      currentPoints: user.currentPoints,
      startingPoints: user.startingPoints,
      totalBet: user.totalBet,
      totalPayout: user.totalPayout,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    logger.error('Get me error:', err);
    respond.serverError(res, 'Failed to fetch profile');
  }
}
