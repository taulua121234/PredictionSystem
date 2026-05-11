/**
 * Betting formula and economy calculations
 */

export const TIER_STARTING_POINTS: Record<string, number> = {
  NORMAL: 3000,
  VIP: 4000,
  DELUXE: 5000,
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

  if (normalized.includes('DELUXE') || normalized.includes('PREMIUM')) {
    return { tier: 'DELUXE', startingPoints: TIER_STARTING_POINTS.DELUXE };
  }
  if (normalized.includes('VIP')) {
    return { tier: 'VIP', startingPoints: TIER_STARTING_POINTS.VIP };
  }
  return { tier: 'NORMAL', startingPoints: TIER_STARTING_POINTS.NORMAL };
}
