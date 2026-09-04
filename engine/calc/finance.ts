export interface CostRatesPerM3 {
  cirsana: number;
  pievesana: number;
  transports: number;
}

export interface FinanceCosts {
  cirsanaEur: number;
  pievesanaEur: number;
  transportsEur: number;
  totalEur: number;
}

export interface FinanceResult {
  revenueEur: number;
  costs: FinanceCosts;
  marginBeforeProfitEur: number;
  profitRate: number;
  profitEur: number;
  maxPurchaseEur: number;
  pricePerM3Eur: number;
}

export const DEFAULT_COST_RATES: CostRatesPerM3 = {
  cirsana: 11,
  pievesana: 7,
  transports: 6,
};
export const DEFAULT_PROFIT_RATE = 0.1;

/** Finance formula from docs/spec.md; values stay at full precision. */
export function calculateFinance(
  totalVolumeM3: number,
  revenueEur: number,
  costsPerM3: CostRatesPerM3 = DEFAULT_COST_RATES,
  profitRate = DEFAULT_PROFIT_RATE,
): FinanceResult {
  const costs: FinanceCosts = {
    cirsanaEur: totalVolumeM3 * costsPerM3.cirsana,
    pievesanaEur: totalVolumeM3 * costsPerM3.pievesana,
    transportsEur: totalVolumeM3 * costsPerM3.transports,
    totalEur: 0,
  };
  costs.totalEur = costs.cirsanaEur + costs.pievesanaEur + costs.transportsEur;
  const marginBeforeProfitEur = revenueEur - costs.totalEur;
  const profitEur = profitRate * marginBeforeProfitEur;
  const maxPurchaseEur = marginBeforeProfitEur - profitEur;
  return {
    revenueEur,
    costs,
    marginBeforeProfitEur,
    profitRate,
    profitEur,
    maxPurchaseEur,
    pricePerM3Eur: totalVolumeM3 === 0 ? 0 : maxPurchaseEur / totalVolumeM3,
  };
}
