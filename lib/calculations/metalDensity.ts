export const METAL_DENSITY: Record<string, number> = {
  gold_24k: 19.32, gold_22k: 17.86, gold_18k: 15.58, gold_14k: 13.07, gold_10k: 11.57,
  rose_gold_18k: 15.20, rose_gold_14k: 13.00, white_gold_18k: 15.80, white_gold_14k: 13.30,
  silver_925: 10.36, silver_900: 10.20, platinum_950: 21.45, platinum_900: 20.70, palladium: 12.02,
}
export function getDensity(metal: string, purity: string): number {
  const key = `${metal}_${purity}`.toLowerCase().replace(/\s/g, '_')
  return METAL_DENSITY[key] ?? METAL_DENSITY['gold_18k']
}
