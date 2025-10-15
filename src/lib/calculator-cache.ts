import { SalaryCalculator } from "./salary-calculator";

// Global cache for salary calculator instances
const calculatorCache = new Map<string, SalaryCalculator>();

export function getCachedCalculator(
  cacheKey: string
): SalaryCalculator | undefined {
  return calculatorCache.get(cacheKey);
}

export function setCachedCalculator(
  cacheKey: string,
  calculator: SalaryCalculator
): void {
  calculatorCache.set(cacheKey, calculator);
}

export function clearCalculatorCache(): void {
  calculatorCache.clear();
}

export function clearSpecificCache(cacheKey: string): void {
  calculatorCache.delete(cacheKey);
}
