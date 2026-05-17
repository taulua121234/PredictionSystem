type IdLike = { _id?: unknown; toString(): string } | string | null | undefined;

export type UmaMarket = {
  umaId: string;
  baseOdd: number;
  currentOdd: number;
  totalBetAmount: number;
};

export type AdjustOddOptions = {
  sensitivity?: number;
  smoothing?: number;
  minMultiplier?: number;
  maxMultiplier?: number;
};

export type RaceEntryLike = {
  umaId: IdLike;
  trainerId?: IdLike;
  odd?: number;
  baseOdd?: number;
  currentOdd?: number;
};

export type BetLike = {
  category: string;
  amount: number;
  prediction?: {
    umaId?: IdLike;
    trainerId?: IdLike;
  };
};

export type RaceBetStat = {
  umaId: string;
  totalAmount: number;
  betCount: number;
  percentage: number;
};

const MIN_ODD = 1.05;
const TRIFECTA_HOUSE_EDGE_MULTIPLIER = 0.9;

const DEFAULT_OPTIONS: Required<AdjustOddOptions> = {
  sensitivity: 0.5,
  smoothing: 0.15,
  minMultiplier: 0.5,
  maxMultiplier: 1.5,
};

export function toIdString(value: IdLike): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const nestedId = value._id;
  if (nestedId && typeof (nestedId as { toString?: () => string }).toString === 'function') {
    return (nestedId as { toString: () => string }).toString();
  }
  return value.toString();
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function roundOdd(value: number) {
  return Number(value.toFixed(2));
}

function validOdd(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_ODD;
}

export function getBaseOdd(entry: RaceEntryLike) {
  if (validOdd(entry.baseOdd)) return entry.baseOdd;
  if (validOdd(entry.odd)) return entry.odd;
  if (validOdd(entry.currentOdd)) return entry.currentOdd;
  return MIN_ODD;
}

export function getCurrentOdd(entry: RaceEntryLike) {
  if (validOdd(entry.currentOdd)) return entry.currentOdd;
  if (validOdd(entry.odd)) return entry.odd;
  if (validOdd(entry.baseOdd)) return entry.baseOdd;
  return MIN_ODD;
}

export function normalizeEntryOdds<T extends RaceEntryLike>(entry: T, resetCurrent = false): T {
  const baseOdd = roundOdd(getBaseOdd(entry));
  const currentOdd = roundOdd(resetCurrent ? baseOdd : getCurrentOdd({ ...entry, baseOdd }));

  entry.baseOdd = baseOdd;
  entry.currentOdd = currentOdd;
  entry.odd = currentOdd;

  return entry;
}

export function normalizeEntriesForAdmin<T extends RaceEntryLike>(entries: T[]): T[] {
  return entries.map(entry => normalizeEntryOdds(entry, true));
}

export function withDisplayOdds<T extends { entries?: RaceEntryLike[] }>(race: T): T {
  if (!race.entries) return race;

  return {
    ...race,
    entries: race.entries.map(entry => {
      const baseOdd = roundOdd(getBaseOdd(entry));
      const currentOdd = roundOdd(getCurrentOdd({ ...entry, baseOdd }));
      return {
        ...entry,
        baseOdd,
        currentOdd,
        odd: currentOdd,
      };
    }),
  };
}

export function adjustLiveOdds(
  umas: UmaMarket[],
  options: AdjustOddOptions = {}
) {
  const { sensitivity, smoothing, minMultiplier, maxMultiplier } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const totalBet = umas.reduce((sum, uma) => sum + uma.totalBetAmount, 0);

  if (totalBet <= 0) {
    return umas.map(uma => ({
      ...uma,
      expectedShare: 0,
      actualShare: 0,
      targetOdd: uma.baseOdd,
      clampedOdd: uma.baseOdd,
      displayOdd: roundOdd(uma.baseOdd),
    }));
  }

  const rawProbs = umas.map(uma => 1 / uma.baseOdd);
  const totalRawProb = rawProbs.reduce((sum, p) => sum + p, 0);

  return umas.map((uma, index) => {
    const expectedShare = rawProbs[index] / totalRawProb;
    const actualShare = uma.totalBetAmount / totalBet;
    const targetOdd = uma.baseOdd * (1 - sensitivity * (actualShare - expectedShare));
    const minOdd = Math.max(MIN_ODD, uma.baseOdd * minMultiplier);
    const maxOdd = Math.max(minOdd, uma.baseOdd * maxMultiplier);
    const clampedOdd = clamp(targetOdd, minOdd, maxOdd);
    const displayOdd = uma.currentOdd * (1 - smoothing) + clampedOdd * smoothing;

    return {
      ...uma,
      expectedShare,
      actualShare,
      targetOdd,
      clampedOdd,
      displayOdd: roundOdd(displayOdd),
    };
  });
}

function getMarketTotals(entries: RaceEntryLike[], bets: BetLike[]) {
  const totals = new Map<string, { totalAmount: number; betCount: number }>();

  entries.forEach(entry => {
    totals.set(toIdString(entry.umaId), { totalAmount: 0, betCount: 0 });
  });

  bets.forEach(bet => {
    const amount = Number(bet.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    if (bet.category === 'UMA_WIN' && bet.prediction?.umaId) {
      const umaId = toIdString(bet.prediction.umaId);
      const current = totals.get(umaId);
      if (current) {
        current.totalAmount += amount;
        current.betCount += 1;
      }
      return;
    }

    if (bet.category === 'TRAINER_WIN' && bet.prediction?.trainerId) {
      const trainerId = toIdString(bet.prediction.trainerId);
      const trainerEntries = entries.filter(entry => toIdString(entry.trainerId) === trainerId);
      const trainerRawProb = trainerEntries.reduce((sum, entry) => sum + (1 / getBaseOdd(entry)), 0);

      if (trainerRawProb <= 0) return;

      trainerEntries.forEach(entry => {
        const umaId = toIdString(entry.umaId);
        const current = totals.get(umaId);
        if (!current) return;

        const weight = (1 / getBaseOdd(entry)) / trainerRawProb;
        current.totalAmount += amount * weight;
        current.betCount += 1;
      });
    }
  });

  return totals;
}

export function buildUmaMarkets(entries: RaceEntryLike[], bets: BetLike[]): UmaMarket[] {
  const totals = getMarketTotals(entries, bets);

  return entries.map(entry => {
    const umaId = toIdString(entry.umaId);
    return {
      umaId,
      baseOdd: roundOdd(getBaseOdd(entry)),
      currentOdd: roundOdd(getCurrentOdd(entry)),
      totalBetAmount: totals.get(umaId)?.totalAmount || 0,
    };
  });
}

export function applyDynamicOddsToEntries(entries: RaceEntryLike[], bets: BetLike[]) {
  const markets = buildUmaMarkets(entries, bets);
  const adjusted = adjustLiveOdds(markets);
  const adjustedByUma = new Map(adjusted.map(uma => [uma.umaId, uma]));

  entries.forEach(entry => {
    const uma = adjustedByUma.get(toIdString(entry.umaId));
    if (!uma) return;

    entry.baseOdd = uma.baseOdd;
    entry.currentOdd = uma.displayOdd;
    entry.odd = uma.displayOdd;
  });

  return entries.map(entry => ({
    umaId: toIdString(entry.umaId),
    baseOdd: roundOdd(getBaseOdd(entry)),
    currentOdd: roundOdd(getCurrentOdd(entry)),
    odd: roundOdd(getCurrentOdd(entry)),
  }));
}

export function calculateRaceBetStats(entries: RaceEntryLike[], bets: BetLike[]) {
  const totals = getMarketTotals(entries, bets);
  const totalBetAmount = Array.from(totals.values()).reduce((sum, stat) => sum + stat.totalAmount, 0);

  const predictions: RaceBetStat[] = Array.from(totals.entries())
    .filter(([, stat]) => stat.totalAmount > 0)
    .map(([umaId, stat]) => ({
      umaId,
      totalAmount: Math.round(stat.totalAmount),
      betCount: stat.betCount,
      percentage: totalBetAmount > 0 ? Math.round((stat.totalAmount / totalBetAmount) * 100) : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    predictions,
    totalBetAmount: Math.round(totalBetAmount),
  };
}

export function calculateTrainerOdd(entries: RaceEntryLike[], trainerId: string) {
  const trainerEntries = entries.filter(entry => toIdString(entry.trainerId) === trainerId);
  if (trainerEntries.length === 0) return 0;

  const totalUmaProb = entries.reduce((sum, entry) => sum + (1 / getCurrentOdd(entry)), 0);
  const trainerTrueProb = trainerEntries.reduce(
    (sum, entry) => sum + ((1 / getCurrentOdd(entry)) / totalUmaProb),
    0
  );

  return trainerTrueProb > 0 ? roundOdd(1 / trainerTrueProb) : 0;
}

export function calculateTrifectaOdd(
  entries: RaceEntryLike[],
  firstUmaId: string,
  secondUmaId: string,
  thirdUmaId: string
) {
  const selectedEntries = [firstUmaId, secondUmaId, thirdUmaId].map(umaId =>
    entries.find(entry => toIdString(entry.umaId) === umaId)
  );

  if (selectedEntries.some(entry => !entry)) return 0;

  const totalUmaProb = entries.reduce((sum, entry) => sum + (1 / getCurrentOdd(entry)), 0);
  if (totalUmaProb <= 0) return 0;

  const [prob1, prob2, prob3] = selectedEntries.map(entry => (1 / getCurrentOdd(entry!)) / totalUmaProb);
  const secondDenominator = 1 - prob1;
  const thirdDenominator = 1 - prob1 - prob2;

  if (secondDenominator <= 0 || thirdDenominator <= 0) return 0;

  const trifectaProb = prob1 * (prob2 / secondDenominator) * (prob3 / thirdDenominator);
  return trifectaProb > 0 ? roundOdd((1 / trifectaProb) * TRIFECTA_HOUSE_EDGE_MULTIPLIER) : 0;
}
