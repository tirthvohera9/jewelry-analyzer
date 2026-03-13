export type JewelryType = 'ring' | 'necklace' | 'bracelet' | 'earring' | 'pendant' | 'brooch' | 'unknown'

export type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium' | 'rose_gold' | 'white_gold' | 'unknown'
export type MetalPurity = '24k' | '22k' | '18k' | '14k' | '10k' | '950' | '925' | '900' | 'unknown'
export type StoneType = 'diamond' | 'ruby' | 'emerald' | 'sapphire' | 'amethyst' | 'topaz' | 'pearl' | 'opal' | 'garnet' | 'other' | 'none'
export type StoneCut = 'round_brilliant' | 'princess' | 'oval' | 'pear' | 'marquise' | 'cushion' | 'emerald_cut' | 'asscher' | 'radiant' | 'heart' | 'cabochon' | 'unknown'
export type SettingType = 'prong' | 'bezel' | 'pave' | 'channel' | 'flush' | 'tension' | 'unknown'
export type FinishType = 'polished' | 'matte' | 'brushed' | 'hammered' | 'oxidized' | 'unknown'

export interface Stone {
  type: StoneType
  cut: StoneCut
  setting: SettingType
  estimatedDiameterMm: number
  estimatedCarats: number
  count: number
  colorGrade?: string
  confidence: number
}

export interface MetalComponent {
  type: MetalType
  purity: MetalPurity
  finish: FinishType
  confidence: number
}

export interface Dimensions {
  lengthMm: number
  widthMm: number
  heightMm: number
  wireDiameterMm?: number
  wallThicknessMm?: number
  confidence: number
}

export interface AnalysisPass {
  passNumber: number
  passName: string
  status: 'pending' | 'running' | 'complete' | 'error'
  result?: Record<string, unknown>
  error?: string
}

export interface JewelryAnalysis {
  id: string
  imageUrl: string
  jewelryType: JewelryType
  metal: MetalComponent
  stones: Stone[]
  dimensions: Dimensions
  overallConfidence: number
  passes: AnalysisPass[]
  optionalInputs?: OptionalInputs
  createdAt: string
}

export interface OptionalInputs {
  ringSizeUS?: number
  knownLengthMm?: number
  knownWeightG?: number
  metalPurity?: MetalPurity
  stoneType?: StoneType
  additionalNotes?: string
}

export interface StreamEvent {
  type: 'pass_start' | 'pass_complete' | 'pass_error' | 'analysis_complete' | 'error'
  passNumber?: number
  passName?: string
  data?: unknown
  analysisId?: string
}
