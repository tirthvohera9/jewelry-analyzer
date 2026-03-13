import { describe, it, expect } from 'vitest'
import { calcRingWeight, calcBraceletWeight, calcNecklaceWeight } from '../metalWeight'

describe('calcRingWeight', () => {
  it('returns weight in grams for 18k gold ring', () => {
    const result = calcRingWeight({ fingerDiameterMm: 17, bandWidthMm: 2, wallThicknessMm: 1.2, density: 15.58 })
    expect(result.weightG).toBeCloseTo(2.3, 0)
    expect(result.minG).toBeLessThan(result.weightG)
    expect(result.maxG).toBeGreaterThan(result.weightG)
  })
  it('returns higher weight for wider band', () => {
    const narrow = calcRingWeight({ fingerDiameterMm: 17, bandWidthMm: 2, wallThicknessMm: 1.2, density: 15.58 })
    const wide   = calcRingWeight({ fingerDiameterMm: 17, bandWidthMm: 6, wallThicknessMm: 1.2, density: 15.58 })
    expect(wide.weightG).toBeGreaterThan(narrow.weightG)
  })
})
describe('calcBraceletWeight', () => {
  it('returns plausible weight for 18k gold bangle', () => {
    const result = calcBraceletWeight({ innerDiameterMm: 60, widthMm: 6, wallThicknessMm: 1.5, density: 15.58 })
    expect(result.weightG).toBeGreaterThan(5)
    expect(result.weightG).toBeLessThan(20)
  })
})
describe('calcNecklaceWeight', () => {
  it('estimates chain weight from length and wire diameter', () => {
    const result = calcNecklaceWeight({ lengthMm: 450, wireDiameterMm: 0.8, chainStyle: 'cable', density: 15.58 })
    expect(result.weightG).toBeGreaterThan(2)
    expect(result.weightG).toBeLessThan(15)
  })
})
