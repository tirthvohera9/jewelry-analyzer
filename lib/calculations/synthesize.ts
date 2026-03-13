import type { JewelryAnalysis } from '@/types/analysis'
import type { CalculationOutput } from '@/types/calculation'
import { calcRingWeight, calcBraceletWeight, calcNecklaceWeight } from './metalWeight'
import { sizeToCarats, calcSettingMetal } from './gemstoneWeight'
import { getDensity } from './metalDensity'
import { calcOverallConfidence, improvementSuggestions } from './confidence'

export function synthesize(analysis: JewelryAnalysis): CalculationOutput {
  const { metal, stones, dimensions, jewelryType, optionalInputs = {} } = analysis
  const density = getDensity(metal.type, metal.purity)

  let metalResult = { weightG: 0, minG: 0, maxG: 0, volumeCm3: 0 }
  if (jewelryType==='ring') {
    const fingerD = optionalInputs.ringSizeUS ? ringSizeToMm(optionalInputs.ringSizeUS) : dimensions.widthMm||17
    metalResult = calcRingWeight({ fingerDiameterMm: fingerD, bandWidthMm: dimensions.widthMm||3, wallThicknessMm: dimensions.wallThicknessMm||dimensions.heightMm||1.5, density })
  } else if (jewelryType==='bracelet') {
    metalResult = calcBraceletWeight({ innerDiameterMm: dimensions.widthMm||60, widthMm: dimensions.heightMm||8, wallThicknessMm: dimensions.wallThicknessMm||1.5, density })
  } else {
    metalResult = calcNecklaceWeight({ lengthMm: optionalInputs.knownLengthMm||dimensions.lengthMm||450, wireDiameterMm: dimensions.wireDiameterMm||1.0, chainStyle: 'cable', density })
  }

  if (optionalInputs.knownWeightG) {
    const scale = optionalInputs.knownWeightG / metalResult.weightG
    metalResult.weightG = optionalInputs.knownWeightG
    metalResult.minG *= scale; metalResult.maxG *= scale
  }

  const materials = [{
    label: formatMetal(metal.type, metal.purity),
    valueG: metalResult.weightG, minValue: metalResult.minG, maxValue: metalResult.maxG,
    unit: 'g' as const, confidence: metal.confidence,
    confidenceFactors: metal.confidence>0.8 ? ['Clear metal color','Visible finish'] : ['Estimated from photo'],
  }]

  let totalStoneCt = 0
  for (const stone of stones) {
    const cts = sizeToCarats(stone.cut, stone.estimatedDiameterMm) * stone.count
    const settingG = calcSettingMetal(stone.setting, 4, stone.estimatedDiameterMm, density)
    totalStoneCt += cts
    materials.push({ label: `${formatStone(stone.type, stone.cut)} × ${stone.count}`, valueCt: cts, minValue: cts*0.80, maxValue: cts*1.25, unit: 'ct' as const, confidence: stone.confidence, confidenceFactors: [`~${stone.estimatedDiameterMm}mm diameter`] })
    if (settingG>0) materials.push({ label: `${stone.setting} setting metal`, valueG: settingG, minValue: settingG*0.7, maxValue: settingG*1.3, unit: 'g' as const, confidence: 0.70, confidenceFactors: ['Standard setting allowance'] })
  }

  const overallConfidence = calcOverallConfidence({
    baseAiConfidence: analysis.overallConfidence,
    hasRingSize: !!optionalInputs.ringSizeUS, hasKnownLength: !!optionalInputs.knownLengthMm,
    hasKnownWeight: !!optionalInputs.knownWeightG, hasPurity: !!optionalInputs.metalPurity, hasMultiplePhotos: false,
  })

  return { materials, totalMetalWeightG: metalResult.weightG, totalStoneWeightCt: totalStoneCt, overallConfidence, improvementSuggestions: improvementSuggestions(optionalInputs, jewelryType) }
}

function ringSizeToMm(usSize: number): number { return 11.63 + usSize * 0.832 }
function formatMetal(type: string, purity: string): string {
  const n: Record<string,string> = { gold:'Gold', silver:'Silver', platinum:'Platinum', rose_gold:'Rose Gold', white_gold:'White Gold', palladium:'Palladium' }
  return `${n[type]||type} (${purity})`
}
function formatStone(type: string, cut: string): string {
  return `${type.charAt(0).toUpperCase()+type.slice(1)} (${cut.replace(/_/g,' ')})`
}
