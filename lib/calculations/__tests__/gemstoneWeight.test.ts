import { describe, it, expect } from 'vitest'
import { sizeToCarats, calcSettingMetal } from '../gemstoneWeight'

describe('sizeToCarats', () => {
  it('round brilliant 1mm ≈ 0.005ct', () => { expect(sizeToCarats('round_brilliant', 1)).toBeCloseTo(0.005, 3) })
  it('round brilliant 6.5mm ≈ 1ct', () => { expect(sizeToCarats('round_brilliant', 6.5)).toBeCloseTo(1.0, 1) })
  it('princess 5.5mm ≈ 0.75ct', () => { expect(sizeToCarats('princess', 5.5)).toBeCloseTo(0.75, 1) })
})
describe('calcSettingMetal', () => {
  it('4-prong setting adds 0.12–0.30g', () => {
    const g = calcSettingMetal('prong', 4, 6.5, 15.58)
    expect(g).toBeGreaterThanOrEqual(0.12)
    expect(g).toBeLessThanOrEqual(0.30)
  })
})
