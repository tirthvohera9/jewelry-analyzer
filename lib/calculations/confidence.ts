import type { OptionalInputs } from '@/types/analysis'
export interface ConfidenceFactors {
  baseAiConfidence: number; hasRingSize: boolean; hasKnownLength: boolean
  hasKnownWeight: boolean; hasPurity: boolean; hasMultiplePhotos: boolean
}
export function calcOverallConfidence(f: ConfidenceFactors): number {
  let s = f.baseAiConfidence
  if (f.hasRingSize) s = Math.min(1, s+0.10)
  if (f.hasKnownLength) s = Math.min(1, s+0.12)
  if (f.hasKnownWeight) s = Math.min(1, s+0.15)
  if (f.hasPurity) s = Math.min(1, s+0.08)
  if (f.hasMultiplePhotos) s = Math.min(1, s+0.05)
  return Math.round(s*100)/100
}
export function improvementSuggestions(inputs: OptionalInputs, jewelryType: string): string[] {
  const s: string[] = []
  if (jewelryType==='ring'&&!inputs.ringSizeUS) s.push('Provide ring size (US) to improve band diameter accuracy by ~15%')
  if (!inputs.knownLengthMm) s.push('Measure and enter a known dimension (length/diameter) for ±5% accuracy')
  if (!inputs.knownWeightG) s.push('Weigh the piece on a jeweler\'s scale and enter the weight to validate estimates')
  if (!inputs.metalPurity) s.push('Check for a hallmark stamp (e.g. 750 = 18k) and enter the purity')
  return s
}
