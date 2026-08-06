import mongoose from 'mongoose';
import dns from 'dns';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');

// Fix Node.js DNS SRV lookup issues on Windows for MongoDB Atlas (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore fallback errors
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const BETTING_DB = process.env.MONGODB_BETTING_DB || 'betting_db';
const ORDER_DB = process.env.MONGODB_ORDER_DB || 'evient_orders';

function cleanUri(uri: string): string {
  return uri.endsWith('/') ? uri.slice(0, -1) : uri;
}

/**
 * Connect the default mongoose connection to betting_db with retry logic
 */
export async function connectBettingDb(retries = 5, delayMs = 3000): Promise<void> {
  const uri = `${cleanUri(MONGO_URI)}/${BETTING_DB}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
      logger.info(`Connected to MongoDB: ${BETTING_DB}`);
      return;
    } catch (err) {
      logger.warn(`MongoDB connection attempt ${attempt}/${retries} failed: ${(err as Error).message}`);
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}

/**
 * Create a separate connection to evient_orders for cross-db ticket validation
 */
let _orderConnection: mongoose.Connection | null = null;

export function getOrderDbConnection(): mongoose.Connection {
  if (!_orderConnection) {
    const uri = `${cleanUri(MONGO_URI)}/${ORDER_DB}`;
    _orderConnection = mongoose.createConnection(uri, { maxPoolSize: 5 });
    logger.info(`Cross-db connection established: ${ORDER_DB}`);
  }
  return _orderConnection;
}

/**
 * Get the Ticket model from the evient_orders database
 * Used for validating ticket codes during login
 */
const ticketSchema = new mongoose.Schema({}, { strict: false, collection: 'tickets' });

export function getExternalTicketModel() {
  const conn = getOrderDbConnection();
  if (conn.models['Ticket']) {
    return conn.models['Ticket'];
  }
  return conn.model('Ticket', ticketSchema);
}
