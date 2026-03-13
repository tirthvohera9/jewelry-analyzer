export interface MaterialResult {
  label: string
  valueG?: number
  valueCt?: number
  minValue: number
  maxValue: number
  unit: 'g' | 'ct'
  confidence: number
  confidenceFactors: string[]
}

export interface CalculationOutput {
  materials: MaterialResult[]
  totalMetalWeightG: number
  totalStoneWeightCt: number
  overallConfidence: number
  improvementSuggestions: string[]
}
