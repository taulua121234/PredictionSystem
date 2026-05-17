import { AxiosError } from 'axios';

// ==================== Shared Types ====================

export interface RaceEntry {
  umaId: string | { _id: string; name: string; imageUrl?: string; infoImageUrl?: string };
  trainerId?: string | { _id: string; name: string; imageUrl?: string };
  baseOdd?: number;
  currentOdd?: number;
  odd: number;
}

export interface RaceResult {
  first?: string | { _id: string; name: string };
  second?: string | { _id: string; name: string };
  third?: string | { _id: string; name: string };
  winnerTrainerId?: string;
}

export interface Race {
  _id: string;
  raceName: string;
  description?: string;
  state: string;
  startTime: string;
  closeBetTime: string;
  entries: RaceEntry[];
  result?: RaceResult;
}

export interface Uma {
  _id: string;
  name: string;
  imageUrl?: string;
  infoImageUrl?: string;
  stats?: {
    speed?: number;
    stamina?: number;
    power?: number;
    guts?: number;
    wisdom?: number;
  };
  isActive: boolean;
  trainerId?: string;
}

export interface BettingUser {
  _id: string;
  username: string;
  tier: string;
  currentPoints: number;
  startingPoints: number;
  totalBet: number;
  totalPayout: number;
  role: 'user' | 'admin';
  hasChangedName: boolean;
  isLocked?: boolean;
}

export interface Bet {
  _id: string;
  raceId: { raceName: string; state: string } | string;
  category: string;
  prediction: Record<string, string>;
  amount: number;
  oddAtBetTime: number;
  payout: number;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  tier: string;
  currentPoints?: number;
  income?: number;
  roi?: number;
  totalBet?: number;
  totalPayout?: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalRaces: number;
  totalBets: number;
  activeRaces: number;
  totalPointsBet: number;
}

export interface BetPrediction {
  umaId?: string;
  trainerId?: string;
  first?: string;
  second?: string;
  third?: string;
}

export interface RaceBetStat {
  umaId: string;
  totalAmount: number;
  betCount: number;
  percentage: number;
}

export interface BetStats {
  predictions: RaceBetStat[];
  totalBetAmount: number;
}

// ==================== API Param Types ====================

export interface CreateRacePayload {
  raceName: string;
  description?: string;
  startTime: string;
  closeBetTime: string;
  entries?: RaceEntry[];
}

export interface CreateUmaPayload {
  name: string;
  stats?: Uma['stats'];
  trainerId?: string | null;
}

export interface CreateTrainerPayload {
  name: string;
  imageUrl?: string;
}

export interface RaceResultPayload {
  first?: string;
  second?: string;
  third?: string;
  winnerTrainerId?: string;
}

// ==================== Error Helper ====================

export function getErrorMessage(e: unknown): string {
  if (e instanceof AxiosError) return e.response?.data?.message || e.message;
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}
