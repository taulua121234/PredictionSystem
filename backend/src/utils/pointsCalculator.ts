/**
 * Betting formula and economy calculations
 */

export const TIER_STARTING_POINTS: Record<string, number> = {
  G3: 10000,
  G2: 11000,
  G1: 12000,
  NORMAL: 10000,
  VIP: 11000,
  DELUXE: 12000,
};

/**
 * Calculate payout: betAmount × odd
 */
export function calculatePayout(betAmount: number, odd: number): number {
  return Math.round(betAmount * odd);
}

/**
 * Calculate income: currentPoints - startingPoints
 */
export function calculateIncome(currentPoints: number, startingPoints: number): number {
  return currentPoints - startingPoints;
}

/**
 * Calculate ROI: (totalPayout - totalBet) / totalBet
 * Returns 0 if totalBet is 0
 */
export function calculateROI(totalPayout: number, totalBet: number): number {
  if (totalBet === 0) return 0;
  return Number(((totalPayout - totalBet) / totalBet).toFixed(4));
}

/**
 * Map ticket type name to starting points tier
 */
export function mapTicketTier(ticketTypeName: string): { tier: string; startingPoints: number } {
  const normalized = ticketTypeName.toUpperCase().trim();

  if (normalized.includes('G1') || normalized.includes('DELUXE') || normalized.includes('PREMIUM')) {
    return { tier: 'G1', startingPoints: TIER_STARTING_POINTS.G1 };
  }
  if (normalized.includes('G2') || normalized.includes('VIP')) {
    return { tier: 'G2', startingPoints: TIER_STARTING_POINTS.G2 };
  }
  return { tier: 'G3', startingPoints: TIER_STARTING_POINTS.G3 };
}
