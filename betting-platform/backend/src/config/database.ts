import mongoose from 'mongoose';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const BETTING_DB = process.env.MONGODB_BETTING_DB || 'betting_db';
const ORDER_DB = process.env.MONGODB_ORDER_DB || 'evient_orders';

function cleanUri(uri: string): string {
  return uri.endsWith('/') ? uri.slice(0, -1) : uri;
}

/**
 * Connect the default mongoose connection to betting_db
 */
export async function connectBettingDb(): Promise<void> {
  const uri = `${cleanUri(MONGO_URI)}/${BETTING_DB}`;
  await mongoose.connect(uri, { maxPoolSize: 10 });
  logger.info(`Connected to MongoDB: ${BETTING_DB}`);
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
