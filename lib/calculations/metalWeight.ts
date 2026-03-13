interface RingParams { fingerDiameterMm: number; bandWidthMm: number; wallThicknessMm: number; density: number }
interface BraceletParams { innerDiameterMm: number; widthMm: number; wallThicknessMm: number; density: number }
interface NecklaceParams { lengthMm: number; wireDiameterMm: number; chainStyle: 'cable'|'rope'|'box'|'figaro'|'solid'; density: number }
interface WeightResult { weightG: number; minG: number; maxG: number; volumeCm3: number }

export function calcRingWeight({ fingerDiameterMm, bandWidthMm, wallThicknessMm, density }: RingParams): WeightResult {
  const R_outer = (fingerDiameterMm / 2 + wallThicknessMm) / 10
  const R_inner = (fingerDiameterMm / 2) / 10
  const vol = Math.PI * (bandWidthMm / 10) * (R_outer ** 2 - R_inner ** 2)
  const weightG = vol * density
  return { weightG, minG: weightG * 0.75, maxG: weightG * 1.30, volumeCm3: vol }
}

// Packing/fill factor for bracelets: accounts for links, clasps, and hollow construction
const BRACELET_FILL = 0.55

export function calcBraceletWeight({ innerDiameterMm, widthMm, wallThicknessMm, density }: BraceletParams): WeightResult {
  const R_outer = (innerDiameterMm / 2 + wallThicknessMm) / 10
  const R_inner = (innerDiameterMm / 2) / 10
  const vol = Math.PI * (widthMm / 10) * (R_outer ** 2 - R_inner ** 2) * BRACELET_FILL
  const weightG = vol * density
  return { weightG, minG: weightG * 0.70, maxG: weightG * 1.35, volumeCm3: vol }
}

const CHAIN_FILL: Record<string, number> = { cable: 0.65, rope: 0.75, box: 0.60, figaro: 0.58, solid: 0.85 }

export function calcNecklaceWeight({ lengthMm, wireDiameterMm, chainStyle, density }: NecklaceParams): WeightResult {
  const fill = CHAIN_FILL[chainStyle] ?? 0.60
  const r = wireDiameterMm / 2 / 10
  const vol = Math.PI * r ** 2 * (lengthMm / 10) * fill
  const weightG = vol * density
  return { weightG, minG: weightG * 0.65, maxG: weightG * 1.40, volumeCm3: vol }
}
