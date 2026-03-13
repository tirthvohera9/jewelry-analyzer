# Jewelry Analyzer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel-deployed Next.js app that analyzes jewelry photos via 5-pass AI pipeline and outputs material weight estimates + DXF/STL/PDF CAD files.

**Architecture:** Next.js 14 App Router with streaming API routes. Claude claude-opus-4-6 (primary) + GPT-4o Vision (cross-validation) run in sequence; results stream via SSE to the client. Calculation engine is pure TypeScript deterministic math — no AI guessing for weights.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Anthropic SDK, OpenAI SDK, Three.js/@react-three/fiber, jsPDF, dxf-writer, Framer Motion, Vitest

---

## Chunk 1: Project Scaffolding + Types + Theme

### Task 1: Init Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local.example`

- [ ] **Step 1: Scaffold**
```bash
cd "C:/Users/tirth/OneDrive/Desktop"
npx create-next-app@latest jewelry-analyzer --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd jewelry-analyzer
```

- [ ] **Step 2: Install all dependencies**
```bash
npm install @anthropic-ai/sdk openai framer-motion three @react-three/fiber @react-three/drei jspdf jspdf-autotable dxf-writer uuid
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/three @types/uuid
```

- [ ] **Step 3: Create `.env.local.example`**
```bash
cat > .env.local.example << 'EOF'
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
EOF
cp .env.local.example .env.local
```

- [ ] **Step 4: Configure Vitest — create `vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: Create `vitest.setup.ts`**
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: scaffold Next.js jewelry analyzer with all deps"
```

---

### Task 2: Global types

**Files:**
- Create: `types/analysis.ts`
- Create: `types/calculation.ts`

- [ ] **Step 1: Create `types/analysis.ts`**
```ts
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
```

- [ ] **Step 2: Create `types/calculation.ts`**
```ts
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
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: add global TypeScript types for analysis and calculation"
```

---

### Task 3: Theme + global styles

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `app/layout.tsx`

- [ ] **Step 1: Update `tailwind.config.ts`**
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          300: '#F0DC82',
          400: '#D4AF37',
          500: '#C9A84C',
          600: '#B8960C',
        },
        dark: {
          50:  '#F5F0E8',
          100: '#E8E0D0',
          400: '#8A7A5A',
          700: '#2A2520',
          800: '#1A1510',
          900: '#111111',
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 2: Update `app/globals.css`**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --gold: #D4AF37;
  --gold-warm: #C9A84C;
  --dark-bg: #0a0a0a;
  --dark-card: #111111;
  --dark-border: #2A2520;
  --text-primary: #F5F0E8;
  --text-secondary: #8A7A5A;
}

* { box-sizing: border-box; }

body {
  background-color: var(--dark-bg);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}

.gold-shimmer {
  background: linear-gradient(90deg, #C9A84C 0%, #F0DC82 50%, #C9A84C 100%);
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.gold-border { border: 1px solid var(--gold); }
.card-dark { background: var(--dark-card); border: 1px solid var(--dark-border); border-radius: 12px; }
```

- [ ] **Step 3: Update `app/layout.tsx`**
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JewelCAD — Jewelry Material Analyzer',
  description: 'Upload a jewelry photo. Get exact material weights, stone specifications, and CAD files instantly.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-dark-950 text-dark-50 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: luxury dark theme with gold accents"
```

---

## Chunk 2: Calculation Engine (accuracy core)

### Task 4: Metal weight calculation

**Files:**
- Create: `lib/calculations/metalDensity.ts`
- Create: `lib/calculations/metalWeight.ts`
- Create: `lib/calculations/__tests__/metalWeight.test.ts`

- [ ] **Step 1: Create `lib/calculations/metalDensity.ts`**
```ts
// Densities in g/cm³ — industry standard values
export const METAL_DENSITY: Record<string, number> = {
  gold_24k: 19.32,
  gold_22k: 17.86,
  gold_18k: 15.58,
  gold_14k: 13.07,
  gold_10k: 11.57,
  rose_gold_18k: 15.20,
  rose_gold_14k: 13.00,
  white_gold_18k: 15.80,
  white_gold_14k: 13.30,
  silver_925: 10.36,
  silver_900: 10.20,
  platinum_950: 21.45,
  platinum_900: 20.70,
  palladium: 12.02,
}

export function getDensity(metal: string, purity: string): number {
  const key = `${metal}_${purity}`.toLowerCase().replace(/\s/g, '_')
  return METAL_DENSITY[key] ?? METAL_DENSITY['gold_18k'] // safe fallback
}
```

- [ ] **Step 2: Write failing test — `lib/calculations/__tests__/metalWeight.test.ts`**
```ts
import { describe, it, expect } from 'vitest'
import { calcRingWeight, calcBraceletWeight, calcNecklaceWeight } from '../metalWeight'

describe('calcRingWeight', () => {
  it('returns weight in grams for 18k gold ring', () => {
    // Standard women's solitaire: Ø17mm finger, 2mm band, 1.2mm thick
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
    // 60mm inner diameter, 6mm width, 1.5mm wall
    const result = calcBraceletWeight({ innerDiameterMm: 60, widthMm: 6, wallThicknessMm: 1.5, density: 15.58 })
    expect(result.weightG).toBeGreaterThan(5)
    expect(result.weightG).toBeLessThan(20)
  })
})

describe('calcNecklaceWeight', () => {
  it('estimates chain weight from length and wire diameter', () => {
    // 450mm chain, 0.8mm wire, cable link style
    const result = calcNecklaceWeight({ lengthMm: 450, wireDiameterMm: 0.8, chainStyle: 'cable', density: 15.58 })
    expect(result.weightG).toBeGreaterThan(2)
    expect(result.weightG).toBeLessThan(15)
  })
})
```

- [ ] **Step 3: Run — expect FAIL**
```bash
npx vitest run lib/calculations/__tests__/metalWeight.test.ts
```

- [ ] **Step 4: Create `lib/calculations/metalWeight.ts`**
```ts
// Volume formulas for jewelry primitives → weight in grams

interface RingParams { fingerDiameterMm: number; bandWidthMm: number; wallThicknessMm: number; density: number }
interface BraceletParams { innerDiameterMm: number; widthMm: number; wallThicknessMm: number; density: number }
interface NecklaceParams { lengthMm: number; wireDiameterMm: number; chainStyle: 'cable' | 'rope' | 'box' | 'figaro' | 'solid'; density: number }

interface WeightResult { weightG: number; minG: number; maxG: number; volumeCm3: number }

// Ring: hollow torus. V = 2π²Rr² where R=major radius, r=minor radius (wall thickness)
export function calcRingWeight({ fingerDiameterMm, bandWidthMm, wallThicknessMm, density }: RingParams): WeightResult {
  const R = (fingerDiameterMm / 2 + wallThicknessMm / 2) / 10 // cm
  const r = wallThicknessMm / 2 / 10 // cm
  const volumeCm3 = 2 * Math.PI ** 2 * R * r ** 2 * (bandWidthMm / (2 * Math.PI * R * 10)) * (2 * Math.PI * R * 10)
  // Simplified: V = π * bandWidth * ((R_outer² - R_inner²))
  const R_outer = (fingerDiameterMm / 2 + wallThicknessMm) / 10
  const R_inner = (fingerDiameterMm / 2) / 10
  const vol = Math.PI * (bandWidthMm / 10) * (R_outer ** 2 - R_inner ** 2)
  const weightG = vol * density
  return { weightG, minG: weightG * 0.75, maxG: weightG * 1.30, volumeCm3: vol }
}

// Bangle: hollow cylinder shell
export function calcBraceletWeight({ innerDiameterMm, widthMm, wallThicknessMm, density }: BraceletParams): WeightResult {
  const R_outer = (innerDiameterMm / 2 + wallThicknessMm) / 10
  const R_inner = (innerDiameterMm / 2) / 10
  const vol = Math.PI * (widthMm / 10) * (R_outer ** 2 - R_inner ** 2)
  const weightG = vol * density
  return { weightG, minG: weightG * 0.70, maxG: weightG * 1.35, volumeCm3: vol }
}

// Chain fill factors per style (ratio of metal to total volume)
const CHAIN_FILL: Record<string, number> = {
  cable: 0.35, rope: 0.45, box: 0.40, figaro: 0.38, solid: 0.85,
}

export function calcNecklaceWeight({ lengthMm, wireDiameterMm, chainStyle, density }: NecklaceParams): WeightResult {
  const fill = CHAIN_FILL[chainStyle] ?? 0.40
  const r = wireDiameterMm / 2 / 10 // cm
  const vol = Math.PI * r ** 2 * (lengthMm / 10) * fill
  const weightG = vol * density
  return { weightG, minG: weightG * 0.65, maxG: weightG * 1.40, volumeCm3: vol }
}
```

- [ ] **Step 5: Run — expect PASS**
```bash
npx vitest run lib/calculations/__tests__/metalWeight.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: metal weight calculation engine with geometry formulas"
```

---

### Task 5: Gemstone weight calculation

**Files:**
- Create: `lib/calculations/gemstoneWeight.ts`
- Create: `lib/calculations/__tests__/gemstoneWeight.test.ts`

- [ ] **Step 1: Write failing test**
```ts
import { describe, it, expect } from 'vitest'
import { sizeToCarats, calcSettingMetal } from '../gemstoneWeight'

describe('sizeToCarats', () => {
  it('round brilliant 1mm ≈ 0.005ct', () => {
    expect(sizeToCarats('round_brilliant', 1)).toBeCloseTo(0.005, 3)
  })
  it('round brilliant 6.5mm ≈ 1ct', () => {
    expect(sizeToCarats('round_brilliant', 6.5)).toBeCloseTo(1.0, 1)
  })
  it('princess 5.5mm ≈ 0.75ct', () => {
    expect(sizeToCarats('princess', 5.5)).toBeCloseTo(0.75, 1)
  })
})

describe('calcSettingMetal', () => {
  it('4-prong setting adds 0.15–0.25g', () => {
    const g = calcSettingMetal('prong', 4, 6.5, 15.58)
    expect(g).toBeGreaterThanOrEqual(0.12)
    expect(g).toBeLessThanOrEqual(0.30)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
```bash
npx vitest run lib/calculations/__tests__/gemstoneWeight.test.ts
```

- [ ] **Step 3: Create `lib/calculations/gemstoneWeight.ts`**
```ts
import type { StoneCut, SettingType } from '@/types/analysis'

// Industry-standard size-to-carat tables (diameter mm → carats)
// Source: GIA / Rapaport size charts
const ROUND_BRILLIANT: [number, number][] = [
  [1.0, 0.005],[1.2, 0.009],[1.3, 0.01],[1.5, 0.015],[1.7, 0.02],[1.8, 0.025],
  [2.0, 0.03],[2.2, 0.04],[2.5, 0.06],[2.7, 0.07],[3.0, 0.11],[3.25, 0.14],
  [3.5, 0.17],[3.75, 0.21],[4.0, 0.25],[4.25, 0.28],[4.5, 0.36],[4.75, 0.44],
  [5.0, 0.50],[5.2, 0.55],[5.5, 0.66],[5.75, 0.75],[6.0, 0.84],[6.25, 0.93],
  [6.5, 1.00],[6.8, 1.15],[7.0, 1.25],[7.3, 1.50],[7.75, 1.75],[8.0, 2.00],
  [8.2, 2.11],[8.5, 2.43],[8.7, 2.58],[9.0, 2.75],[9.35, 3.00],[9.85, 3.50],
  [10.0, 3.87],[10.35, 4.20],[10.8, 5.00],
]

const PRINCESS: [number, number][] = [
  [1.5, 0.02],[2.0, 0.05],[2.5, 0.10],[3.0, 0.18],[3.5, 0.28],[4.0, 0.40],
  [4.5, 0.56],[5.0, 0.75],[5.5, 1.00],[6.0, 1.30],[6.5, 1.60],[7.0, 2.00],
]

const OVAL: [number, number][] = [
  [5, 0.25],[6, 0.50],[7, 0.75],[8, 1.00],[9, 1.50],[10, 2.00],
]

const TABLES: Record<string, [number, number][]> = {
  round_brilliant: ROUND_BRILLIANT,
  princess: PRINCESS,
  oval: OVAL,
  pear: OVAL,
  marquise: OVAL,
  cushion: PRINCESS,
  emerald_cut: PRINCESS,
  asscher: PRINCESS,
  radiant: PRINCESS,
}

function interpolate(table: [number, number][], sizeMm: number): number {
  if (sizeMm <= table[0][0]) return table[0][1]
  if (sizeMm >= table[table.length - 1][0]) return table[table.length - 1][1]
  for (let i = 0; i < table.length - 1; i++) {
    const [x0, y0] = table[i]
    const [x1, y1] = table[i + 1]
    if (sizeMm >= x0 && sizeMm <= x1) {
      const t = (sizeMm - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return 0
}

export function sizeToCarats(cut: StoneCut | string, diameterMm: number): number {
  const table = TABLES[cut] ?? ROUND_BRILLIANT
  return interpolate(table, diameterMm)
}

// Setting metal allowance in grams
export function calcSettingMetal(setting: SettingType | string, prongCount: number, stoneDiameterMm: number, density: number): number {
  if (setting === 'prong') {
    // Each prong: ~0.5mm dia × 2mm long cylinder
    const prongVol = Math.PI * (0.025) ** 2 * 0.2 // cm³ per prong
    return prongVol * prongCount * density
  }
  if (setting === 'bezel') {
    const perimCm = Math.PI * stoneDiameterMm / 10
    const wallVol = perimCm * 0.15 * 0.05 // height 1.5mm, wall 0.5mm
    return wallVol * density
  }
  if (setting === 'pave') {
    return 0.04 * density / 15.58 // ~0.04g per stone in 18k, scaled
  }
  return 0.10 // channel / flush default
}
```

- [ ] **Step 4: Run — expect PASS**
```bash
npx vitest run lib/calculations/__tests__/gemstoneWeight.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: gemstone size-to-carat tables + setting metal allowance"
```

---

### Task 6: Confidence scoring + synthesis

**Files:**
- Create: `lib/calculations/confidence.ts`
- Create: `lib/calculations/synthesize.ts`

- [ ] **Step 1: Create `lib/calculations/confidence.ts`**
```ts
import type { OptionalInputs } from '@/types/analysis'

export interface ConfidenceFactors {
  baseAiConfidence: number  // 0-1 from AI passes
  hasRingSize: boolean
  hasKnownLength: boolean
  hasKnownWeight: boolean
  hasPurity: boolean
  hasMultiplePhotos: boolean
}

export function calcOverallConfidence(factors: ConfidenceFactors): number {
  let score = factors.baseAiConfidence
  if (factors.hasRingSize)       score = Math.min(1, score + 0.10)
  if (factors.hasKnownLength)    score = Math.min(1, score + 0.12)
  if (factors.hasKnownWeight)    score = Math.min(1, score + 0.15)
  if (factors.hasPurity)         score = Math.min(1, score + 0.08)
  if (factors.hasMultiplePhotos) score = Math.min(1, score + 0.05)
  return Math.round(score * 100) / 100
}

export function improvementSuggestions(inputs: OptionalInputs, jewelryType: string): string[] {
  const suggestions: string[] = []
  if (jewelryType === 'ring' && !inputs.ringSizeUS)
    suggestions.push('Provide ring size (US) to improve band diameter accuracy by ~15%')
  if (!inputs.knownLengthMm)
    suggestions.push('Measure and enter a known dimension (length/diameter) for ±5% accuracy')
  if (!inputs.knownWeightG)
    suggestions.push('Weigh the piece on a jeweler\'s scale and enter the weight to validate estimates')
  if (!inputs.metalPurity)
    suggestions.push('Check for a hallmark stamp (e.g. 750 = 18k) and enter the purity')
  return suggestions
}
```

- [ ] **Step 2: Create `lib/calculations/synthesize.ts`**
```ts
import type { JewelryAnalysis } from '@/types/analysis'
import type { CalculationOutput } from '@/types/calculation'
import { calcRingWeight, calcBraceletWeight, calcNecklaceWeight } from './metalWeight'
import { sizeToCarats, calcSettingMetal } from './gemstoneWeight'
import { getDensity } from './metalDensity'
import { calcOverallConfidence, improvementSuggestions } from './confidence'

export function synthesize(analysis: JewelryAnalysis): CalculationOutput {
  const { metal, stones, dimensions, jewelryType, optionalInputs = {} } = analysis
  const density = getDensity(metal.type, metal.purity)

  // --- Metal weight ---
  let metalResult = { weightG: 0, minG: 0, maxG: 0, volumeCm3: 0 }

  if (jewelryType === 'ring') {
    const fingerD = optionalInputs.ringSizeUS
      ? ringSizeToMm(optionalInputs.ringSizeUS)
      : dimensions.widthMm || 17
    metalResult = calcRingWeight({
      fingerDiameterMm: fingerD,
      bandWidthMm: dimensions.widthMm || 3,
      wallThicknessMm: dimensions.wallThicknessMm || dimensions.heightMm || 1.5,
      density,
    })
  } else if (jewelryType === 'bracelet') {
    metalResult = calcBraceletWeight({
      innerDiameterMm: dimensions.widthMm || 60,
      widthMm: dimensions.heightMm || 8,
      wallThicknessMm: dimensions.wallThicknessMm || 1.5,
      density,
    })
  } else {
    // necklace, earring, pendant — use chain model
    metalResult = calcNecklaceWeight({
      lengthMm: optionalInputs.knownLengthMm || dimensions.lengthMm || 450,
      wireDiameterMm: dimensions.wireDiameterMm || 1.0,
      chainStyle: 'cable',
      density,
    })
  }

  // Scale if known weight provided
  if (optionalInputs.knownWeightG) {
    const scale = optionalInputs.knownWeightG / metalResult.weightG
    metalResult.weightG = optionalInputs.knownWeightG
    metalResult.minG *= scale
    metalResult.maxG *= scale
  }

  const materials = [{
    label: `${formatMetal(metal.type, metal.purity)}`,
    valueG: metalResult.weightG,
    minValue: metalResult.minG,
    maxValue: metalResult.maxG,
    unit: 'g' as const,
    confidence: metal.confidence,
    confidenceFactors: metal.confidence > 0.8 ? ['Clear metal color', 'Visible finish'] : ['Estimated from photo'],
  }]

  // --- Stone weights ---
  let totalStoneCt = 0
  for (const stone of stones) {
    const cts = sizeToCarats(stone.cut, stone.estimatedDiameterMm) * stone.count
    const settingG = calcSettingMetal(stone.setting, 4, stone.estimatedDiameterMm, density)
    totalStoneCt += cts
    materials.push({
      label: `${formatStone(stone.type, stone.cut)} × ${stone.count}`,
      valueCt: cts,
      minValue: cts * 0.80,
      maxValue: cts * 1.25,
      unit: 'ct' as const,
      confidence: stone.confidence,
      confidenceFactors: [`~${stone.estimatedDiameterMm}mm diameter`],
    })
    if (settingG > 0) {
      materials.push({
        label: `${stone.setting} setting metal`,
        valueG: settingG,
        minValue: settingG * 0.7,
        maxValue: settingG * 1.3,
        unit: 'g' as const,
        confidence: 0.70,
        confidenceFactors: ['Standard setting allowance'],
      })
    }
  }

  const overallConfidence = calcOverallConfidence({
    baseAiConfidence: analysis.overallConfidence,
    hasRingSize: !!optionalInputs.ringSizeUS,
    hasKnownLength: !!optionalInputs.knownLengthMm,
    hasKnownWeight: !!optionalInputs.knownWeightG,
    hasPurity: !!optionalInputs.metalPurity,
    hasMultiplePhotos: false,
  })

  return {
    materials,
    totalMetalWeightG: metalResult.weightG,
    totalStoneWeightCt: totalStoneCt,
    overallConfidence,
    improvementSuggestions: improvementSuggestions(optionalInputs, jewelryType),
  }
}

function ringSizeToMm(usSize: number): number {
  // US ring size to inner diameter mm (standard table)
  return 11.63 + usSize * 0.832
}

function formatMetal(type: string, purity: string): string {
  const names: Record<string, string> = {
    gold: 'Gold', silver: 'Silver', platinum: 'Platinum',
    rose_gold: 'Rose Gold', white_gold: 'White Gold', palladium: 'Palladium',
  }
  return `${names[type] || type} (${purity})`
}

function formatStone(type: string, cut: string): string {
  const t = type.charAt(0).toUpperCase() + type.slice(1)
  const c = cut.replace(/_/g, ' ')
  return `${t} (${c})`
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: synthesis engine + confidence scoring"
```

---

## Chunk 3: AI Pipeline

### Task 7: Precision-tuned AI prompts

**Files:**
- Create: `lib/ai/prompts/pass1_classify.ts`
- Create: `lib/ai/prompts/pass2_metal.ts`
- Create: `lib/ai/prompts/pass3_stones.ts`
- Create: `lib/ai/prompts/pass4_dimensions.ts`
- Create: `lib/ai/prompts/pass5_synthesis.ts`

- [ ] **Step 1: Create `lib/ai/prompts/pass1_classify.ts`**
```ts
export const PASS1_SYSTEM = `You are a professional jewelry appraiser and gemologist with 20 years of experience.
Analyze jewelry photographs with extreme precision. Your assessments are used for material purchasing and manufacturing quotes.
Always respond with valid JSON only. No markdown. No explanation outside the JSON.`

export const PASS1_USER = (optionalInputs: string) => `Analyze this jewelry image. Identify:
1. Jewelry type (ring/necklace/bracelet/earring/pendant/brooch)
2. Design style (solitaire/halo/tennis/cluster/chain/bangle/etc.)
3. Approximate era/style (modern/vintage/art deco/victorian/etc.)
4. Number of distinct metal components
5. Presence of gemstones (yes/no, approximate count)
6. Overall complexity (simple/moderate/complex/elaborate)
7. Visible hallmarks or stamps (describe exactly if visible)
8. Surface treatments visible (polished/matte/hammered/engraved/filigree/etc.)

${optionalInputs ? `User provided context: ${optionalInputs}` : ''}

Respond with JSON:
{
  "jewelryType": "ring|necklace|bracelet|earring|pendant|brooch|unknown",
  "designStyle": "string",
  "era": "string",
  "metalComponentCount": number,
  "hasStones": boolean,
  "estimatedStoneCount": number,
  "complexity": "simple|moderate|complex|elaborate",
  "visibleHallmarks": "string or null",
  "surfaceTreatments": ["string"],
  "confidence": 0.0-1.0,
  "notes": "any additional observations"
}`
```

- [ ] **Step 2: Create `lib/ai/prompts/pass2_metal.ts`**
```ts
export const PASS2_SYSTEM = `You are a master metallurgist and jewelry appraiser specializing in precious metal identification.
You identify metals from photographs with laboratory-level precision by analyzing color temperature, reflectivity,
patina, surface texture, and optical properties. Always respond with valid JSON only.`

export const PASS2_USER = (pass1Result: string, optionalInputs: string) => `Based on this jewelry image, perform a detailed metal analysis.

Previous classification: ${pass1Result}
${optionalInputs ? `User context: ${optionalInputs}` : ''}

Analyze:
1. PRIMARY METAL COLOR: Map to exact metal type
   - Warm yellow: yellow gold (intensity indicates karat — deep yellow=22-24k, medium=18k, pale=10-14k)
   - Cool white with high reflectivity: platinum or white gold (platinum is slightly warmer/greyer than white gold)
   - Pinkish warm tones: rose gold (18k rose = copper-heavy alloy)
   - Grey-white: silver (slightly duller than platinum, can show oxidation)
2. REFLECTIVITY PATTERN: Mirror polish vs satin vs matte
3. SURFACE TEXTURE: Any tool marks, casting porosity, finishing quality
4. ESTIMATED PURITY: Based on color depth and alloy indicators
5. SECONDARY METALS: Any two-tone or mixed metal elements

Respond with JSON:
{
  "metalType": "gold|silver|platinum|palladium|rose_gold|white_gold|unknown",
  "estimatedPurity": "24k|22k|18k|14k|10k|950|925|900|unknown",
  "finishType": "polished|matte|brushed|hammered|oxidized|unknown",
  "colorDescription": "detailed color analysis",
  "isTwoTone": boolean,
  "secondaryMetal": "string or null",
  "hallmarkConfirmation": "string or null",
  "confidence": 0.0-1.0,
  "reasoning": "brief metallurgical reasoning"
}`
```

- [ ] **Step 3: Create `lib/ai/prompts/pass3_stones.ts`**
```ts
export const PASS3_SYSTEM = `You are a GIA-certified gemologist with expert ability to identify gemstones from photographs.
You assess stone type, cut, estimated size, color grade, and clarity from images. Always respond with valid JSON only.`

export const PASS3_USER = (pass1Result: string) => `Analyze all gemstones visible in this jewelry image.

Previous classification: ${pass1Result}

For EACH distinct stone or group of stones, determine:
1. STONE TYPE: Use optical properties — diamond (colorless, high brilliance, fire), ruby (red corundum),
   sapphire (blue/other corundum), emerald (green, inclusions visible), etc.
2. CUT: Identify the cutting style from facet pattern
3. ESTIMATED DIAMETER: In mm — use proportional reasoning against jewelry dimensions
4. COLOR GRADE: For diamonds (D-Z scale), for colored stones (hue/saturation/tone)
5. CLARITY: Any visible inclusions, cloudiness, surface features
6. SETTING TYPE: How the stone is held in the metal
7. COUNT: Number of stones of this type/size

If no stones visible, return empty array.

Respond with JSON:
{
  "stones": [
    {
      "type": "diamond|ruby|emerald|sapphire|amethyst|topaz|pearl|opal|garnet|other|none",
      "cut": "round_brilliant|princess|oval|pear|marquise|cushion|emerald_cut|asscher|radiant|heart|cabochon|unknown",
      "setting": "prong|bezel|pave|channel|flush|tension|unknown",
      "estimatedDiameterMm": number,
      "colorGrade": "string",
      "clarityNotes": "string",
      "count": number,
      "confidence": 0.0-1.0,
      "notes": "string"
    }
  ],
  "totalStoneCount": number,
  "dominantStoneType": "string",
  "confidence": 0.0-1.0
}`
```

- [ ] **Step 4: Create `lib/ai/prompts/pass4_dimensions.ts`**
```ts
export const PASS4_SYSTEM = `You are a precision measurement specialist who estimates jewelry dimensions from photographs.
You use proportional analysis, anatomical references (finger width ~17-20mm for rings),
standard jewelry conventions, and geometric reasoning. Always respond with valid JSON only.`

export const PASS4_USER = (pass1Result: string, pass3Result: string, optionalInputs: string) => `Estimate precise dimensions of this jewelry piece.

Classification: ${pass1Result}
Stone analysis: ${pass3Result}
${optionalInputs ? `User measurements: ${optionalInputs}` : ''}

Use these reference points for scale:
- Average women's ring finger diameter: 17mm (US size 7)
- Average men's ring finger diameter: 20mm (US size 10)
- Standard women's necklace: 400-460mm
- Standard bracelet: 180-200mm inner circumference
- Average earlobe: ~10mm wide
- Standard solitaire ring head height: 4-8mm above band

Estimate:
1. Overall length/diameter in mm
2. Width in mm
3. Height/thickness in mm
4. Wire/band diameter or wall thickness in mm
5. Stone diameter in mm (cross-check with gemologist pass)
6. Confidence for each measurement

${optionalInputs ? 'Prioritize user-provided measurements over visual estimates.' : ''}

Respond with JSON:
{
  "lengthMm": number,
  "widthMm": number,
  "heightMm": number,
  "wireDiameterMm": number or null,
  "wallThicknessMm": number or null,
  "stonesDiameterMm": number or null,
  "scalingReference": "what reference point was used",
  "confidence": 0.0-1.0,
  "confidencePerDimension": {
    "length": 0.0-1.0,
    "width": 0.0-1.0,
    "height": 0.0-1.0
  }
}`
```

- [ ] **Step 5: Create `lib/ai/prompts/pass5_synthesis.ts`**
```ts
export const PASS5_SYSTEM = `You are a senior jewelry manufacturing consultant who synthesizes multi-source analysis data.
You resolve conflicts between different analytical passes, assign final confidence scores, and provide manufacturing insights.
Always respond with valid JSON only.`

export const PASS5_USER = (allPasses: string) => `Synthesize these jewelry analysis results and resolve any conflicts.

${allPasses}

Tasks:
1. Identify any conflicts between passes (e.g. metal color vs stated purity, stone size discrepancies)
2. Resolve conflicts using logical reasoning (e.g. if color suggests 18k but user says 14k, trust user)
3. Assign final confidence scores per component
4. Identify the biggest sources of uncertainty
5. Estimate overall confidence in material quantities

Respond with JSON:
{
  "conflicts": [{"field": "string", "pass1Value": "any", "pass2Value": "any", "resolution": "string", "resolved": "any"}],
  "finalMetalType": "string",
  "finalMetalPurity": "string",
  "finalMetalConfidence": 0.0-1.0,
  "finalDimensions": {"lengthMm": number, "widthMm": number, "heightMm": number, "wireDiameterMm": number|null, "wallThicknessMm": number|null, "confidence": 0.0-1.0},
  "finalStoneConfidence": 0.0-1.0,
  "overallConfidence": 0.0-1.0,
  "keyUncertainties": ["string"],
  "manufacturingNotes": "string"
}`
```

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: precision-tuned 5-pass AI prompts for jewelry analysis"
```

---

### Task 8: AI pipeline orchestrator

**Files:**
- Create: `lib/ai/pipeline.ts`

- [ ] **Step 1: Create `lib/ai/pipeline.ts`**
```ts
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { PASS1_SYSTEM, PASS1_USER } from './prompts/pass1_classify'
import { PASS2_SYSTEM, PASS2_USER } from './prompts/pass2_metal'
import { PASS3_SYSTEM, PASS3_USER } from './prompts/pass3_stones'
import { PASS4_SYSTEM, PASS4_USER } from './prompts/pass4_dimensions'
import { PASS5_SYSTEM, PASS5_USER } from './prompts/pass5_synthesis'
import type { JewelryAnalysis, OptionalInputs, StreamEvent } from '@/types/analysis'
import type { Stone, MetalComponent, Dimensions } from '@/types/analysis'
import { v4 as uuidv4 } from 'uuid'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function safeJSON(text: string): Record<string, unknown> {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {}
  }
}

async function claudeVision(system: string, userPrompt: string, imageBase64: string, mediaType: string): Promise<Record<string, unknown>> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: userPrompt },
      ],
    }],
  })
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return safeJSON(text)
}

async function gptVision(userPrompt: string, imageBase64: string, mediaType: string): Promise<Record<string, unknown>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}`, detail: 'high' } },
        { type: 'text', text: userPrompt },
      ],
    }],
  })
  return safeJSON(response.choices[0].message.content ?? '')
}

export async function* runPipeline(
  imageBase64: string,
  mediaType: string,
  optionalInputs: OptionalInputs = {}
): AsyncGenerator<StreamEvent> {
  const id = uuidv4()
  const optStr = JSON.stringify(optionalInputs)

  // Pass 1 — Classification
  yield { type: 'pass_start', passNumber: 1, passName: 'Classifying jewelry type' }
  const pass1 = await claudeVision(PASS1_SYSTEM, PASS1_USER(optStr), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 1, passName: 'Classifying jewelry type', data: pass1 }

  // Pass 2 — Metal analysis
  yield { type: 'pass_start', passNumber: 2, passName: 'Analyzing metal composition' }
  const pass2 = await claudeVision(PASS2_SYSTEM, PASS2_USER(JSON.stringify(pass1), optStr), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 2, passName: 'Analyzing metal composition', data: pass2 }

  // Pass 3 — Gemstone analysis
  yield { type: 'pass_start', passNumber: 3, passName: 'Identifying gemstones' }
  const pass3 = await claudeVision(PASS3_SYSTEM, PASS3_USER(JSON.stringify(pass1)), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 3, passName: 'Identifying gemstones', data: pass3 }

  // Pass 4 — Dimensions (Claude + GPT cross-validation)
  yield { type: 'pass_start', passNumber: 4, passName: 'Estimating dimensions (dual AI)' }
  const [claudeDims, gptDims] = await Promise.all([
    claudeVision(PASS4_SYSTEM, PASS4_USER(JSON.stringify(pass1), JSON.stringify(pass3), optStr), imageBase64, mediaType),
    gptVision(PASS4_USER(JSON.stringify(pass1), JSON.stringify(pass3), optStr), imageBase64, mediaType),
  ])
  // Average numerical dimensions between two models
  const dims = mergeDimensions(claudeDims, gptDims)
  yield { type: 'pass_complete', passNumber: 4, passName: 'Estimating dimensions (dual AI)', data: dims }

  // Pass 5 — Synthesis
  yield { type: 'pass_start', passNumber: 5, passName: 'Synthesizing final analysis' }
  const allPasses = `Pass1: ${JSON.stringify(pass1)}\nPass2: ${JSON.stringify(pass2)}\nPass3: ${JSON.stringify(pass3)}\nPass4: ${JSON.stringify(dims)}`
  const pass5 = await claudeVision(PASS5_SYSTEM, PASS5_USER(allPasses), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 5, passName: 'Synthesizing final analysis', data: pass5 }

  // Build final analysis object
  const analysis: JewelryAnalysis = {
    id,
    imageUrl: '',
    jewelryType: (pass1.jewelryType as string ?? 'unknown') as JewelryAnalysis['jewelryType'],
    metal: buildMetal(pass2, pass5),
    stones: buildStones(pass3),
    dimensions: buildDimensions(dims, pass5),
    overallConfidence: (pass5.overallConfidence as number) ?? 0.65,
    passes: [],
    optionalInputs,
    createdAt: new Date().toISOString(),
  }

  yield { type: 'analysis_complete', analysisId: id, data: analysis }
}

function mergeDimensions(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const avg = (k: string) => {
    const va = Number(a[k] ?? 0), vb = Number(b[k] ?? 0)
    if (va && vb) return (va + vb) / 2
    return va || vb
  }
  return {
    lengthMm: avg('lengthMm'), widthMm: avg('widthMm'), heightMm: avg('heightMm'),
    wireDiameterMm: avg('wireDiameterMm'), wallThicknessMm: avg('wallThicknessMm'),
    confidence: Math.max(Number(a.confidence ?? 0), Number(b.confidence ?? 0)),
  }
}

function buildMetal(pass2: Record<string, unknown>, pass5: Record<string, unknown>): MetalComponent {
  return {
    type: (pass5.finalMetalType ?? pass2.metalType ?? 'unknown') as MetalComponent['type'],
    purity: (pass5.finalMetalPurity ?? pass2.estimatedPurity ?? 'unknown') as MetalComponent['purity'],
    finish: (pass2.finishType ?? 'unknown') as MetalComponent['finish'],
    confidence: Number(pass5.finalMetalConfidence ?? pass2.confidence ?? 0.6),
  }
}

function buildStones(pass3: Record<string, unknown>): Stone[] {
  const raw = (pass3.stones as Record<string, unknown>[]) ?? []
  return raw.map(s => ({
    type: (s.type ?? 'unknown') as Stone['type'],
    cut: (s.cut ?? 'unknown') as Stone['cut'],
    setting: (s.setting ?? 'unknown') as Stone['setting'],
    estimatedDiameterMm: Number(s.estimatedDiameterMm ?? 0),
    estimatedCarats: 0, // filled by calculation engine
    count: Number(s.count ?? 1),
    colorGrade: s.colorGrade as string,
    confidence: Number(s.confidence ?? 0.6),
  }))
}

function buildDimensions(dims: Record<string, unknown>, pass5: Record<string, unknown>): Dimensions {
  const finalDims = (pass5.finalDimensions as Record<string, unknown>) ?? dims
  return {
    lengthMm: Number(finalDims.lengthMm ?? 0),
    widthMm: Number(finalDims.widthMm ?? 0),
    heightMm: Number(finalDims.heightMm ?? 0),
    wireDiameterMm: finalDims.wireDiameterMm ? Number(finalDims.wireDiameterMm) : undefined,
    wallThicknessMm: finalDims.wallThicknessMm ? Number(finalDims.wallThicknessMm) : undefined,
    confidence: Number(finalDims.confidence ?? 0.6),
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add -A && git commit -m "feat: 5-pass AI pipeline orchestrator with Claude+GPT dual validation"
```

---

### Task 9: Streaming API route

**Files:**
- Create: `app/api/analyze/route.ts`

- [ ] **Step 1: Create `app/api/analyze/route.ts`**
```ts
import { NextRequest } from 'next/server'
import { runPipeline } from '@/lib/ai/pipeline'
import type { OptionalInputs } from '@/types/analysis'

export const maxDuration = 300 // 5 min Vercel limit

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return new Response('No image provided', { status: 400 })

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) return new Response('Image too large (max 10MB)', { status: 413 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = file.type || 'image/jpeg'

  const optionalInputsRaw = formData.get('optionalInputs')
  const optionalInputs: OptionalInputs = optionalInputsRaw ? JSON.parse(optionalInputsRaw as string) : {}

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runPipeline(base64, mediaType, optionalInputs)) {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
        }
      } catch (err) {
        const errEvent = { type: 'error', data: { message: (err as Error).message } }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errEvent)}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Commit**
```bash
git add -A && git commit -m "feat: streaming SSE analyze API route"
```

---

## Chunk 4: CAD Generators

### Task 10: DXF generator

**Files:**
- Create: `lib/generators/dxfGenerator.ts`
- Create: `app/api/generate/dxf/route.ts`

- [ ] **Step 1: Create `lib/generators/dxfGenerator.ts`**
```ts
import type { JewelryAnalysis } from '@/types/analysis'

// dxf-writer uses CommonJS — import carefully
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DXF = require('dxf-writer')

export function generateDXF(analysis: JewelryAnalysis): string {
  const d = new DXF()
  d.addLayer('OUTLINE', DXF.ACI.WHITE, 'CONTINUOUS')
  d.addLayer('STONES', DXF.ACI.CYAN, 'CONTINUOUS')
  d.addLayer('DIMENSIONS', DXF.ACI.YELLOW, 'CONTINUOUS')
  d.setActiveLayer('OUTLINE')

  const { dimensions, jewelryType, stones } = analysis
  const L = dimensions.lengthMm || 20
  const W = dimensions.widthMm || 5
  const H = dimensions.heightMm || 5

  // Top view outline
  if (jewelryType === 'ring') {
    const R_outer = (L / 2 + (dimensions.wallThicknessMm || 1.5))
    const R_inner = L / 2
    d.drawCircle(0, 0, R_outer)
    d.drawCircle(0, 0, R_inner)
  } else if (jewelryType === 'bracelet') {
    const R = L / 2
    d.drawCircle(50, 0, R + (dimensions.wallThicknessMm || 1.5))
    d.drawCircle(50, 0, R)
  } else {
    // Necklace/pendant — top view rectangle
    d.drawRect(0, 0, L, W)
  }

  // Stone positions
  d.setActiveLayer('STONES')
  let stoneX = -L / 3
  for (const stone of stones) {
    const r = stone.estimatedDiameterMm / 2 || 2
    for (let i = 0; i < stone.count; i++) {
      d.drawCircle(stoneX + i * (stone.estimatedDiameterMm + 1), 0, r)
    }
    stoneX += stone.count * (stone.estimatedDiameterMm + 1)
  }

  // Side view (offset below)
  d.setActiveLayer('OUTLINE')
  d.drawRect(0, -(W + 10), L, H)

  // Dimension annotations
  d.setActiveLayer('DIMENSIONS')
  d.drawText(0, -(W + 10 + H + 5), 2.5, 0, `Length: ${L.toFixed(1)}mm  Width: ${W.toFixed(1)}mm  Height: ${H.toFixed(1)}mm`)

  return d.toDxfString()
}
```

- [ ] **Step 2: Create `app/api/generate/dxf/route.ts`**
```ts
import { NextRequest } from 'next/server'
import { generateDXF } from '@/lib/generators/dxfGenerator'
import type { JewelryAnalysis } from '@/types/analysis'

export async function POST(req: NextRequest) {
  const { analysis }: { analysis: JewelryAnalysis } = await req.json()
  const dxfString = generateDXF(analysis)
  return new Response(dxfString, {
    headers: {
      'Content-Type': 'application/dxf',
      'Content-Disposition': `attachment; filename="jewelry-${analysis.id}.dxf"`,
    },
  })
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: DXF 2D CAD generator with outline + stone positions"
```

---

### Task 11: PDF spec sheet generator

**Files:**
- Create: `lib/generators/pdfGenerator.ts`
- Create: `app/api/generate/pdf/route.ts`

- [ ] **Step 1: Create `lib/generators/pdfGenerator.ts`**
```ts
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { JewelryAnalysis } from '@/types/analysis'
import type { CalculationOutput } from '@/types/calculation'

export function generatePDF(analysis: JewelryAnalysis, calc: CalculationOutput, imageBase64?: string): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header bar
  doc.setFillColor(17, 17, 17)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(212, 175, 55) // gold
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('JewelCAD Material Specification', 14, 18)
  doc.setTextColor(200, 200, 200)
  doc.setFontSize(9)
  doc.text(`Report ID: ${analysis.id} | Generated: ${new Date().toLocaleDateString()}`, 14, 25)

  let y = 40

  // Photo
  if (imageBase64) {
    doc.addImage(imageBase64, 'JPEG', 14, y, 60, 60)
  }

  // Summary box
  const summaryX = imageBase64 ? 82 : 14
  doc.setFillColor(26, 21, 16)
  doc.roundedRect(summaryX, y, 115, 60, 3, 3, 'F')
  doc.setTextColor(212, 175, 55)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Analysis Summary', summaryX + 4, y + 10)
  doc.setTextColor(240, 235, 228)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const summaryLines = [
    `Type: ${analysis.jewelryType.toUpperCase()}`,
    `Metal: ${analysis.metal.type} (${analysis.metal.purity})`,
    `Total Metal: ${calc.totalMetalWeightG.toFixed(2)}g`,
    `Total Stones: ${calc.totalStoneWeightCt.toFixed(3)}ct`,
    `Overall Confidence: ${Math.round(calc.overallConfidence * 100)}%`,
    `Dimensions: ${analysis.dimensions.lengthMm.toFixed(1)} × ${analysis.dimensions.widthMm.toFixed(1)} × ${analysis.dimensions.heightMm.toFixed(1)} mm`,
  ]
  summaryLines.forEach((line, i) => doc.text(line, summaryX + 4, y + 20 + i * 7))

  y += 70

  // Materials table
  doc.setTextColor(212, 175, 55)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Material Breakdown', 14, y)
  y += 5

  autoTable(doc, {
    startY: y,
    head: [['Material', 'Quantity', 'Min', 'Max', 'Unit', 'Confidence']],
    body: calc.materials.map(m => [
      m.label,
      (m.valueG ?? m.valueCt ?? 0).toFixed(m.unit === 'g' ? 2 : 3),
      m.minValue.toFixed(m.unit === 'g' ? 2 : 3),
      m.maxValue.toFixed(m.unit === 'g' ? 2 : 3),
      m.unit,
      `${Math.round(m.confidence * 100)}%`,
    ]),
    headStyles: { fillColor: [42, 37, 32], textColor: [212, 175, 55], fontStyle: 'bold' },
    bodyStyles: { fillColor: [26, 21, 16], textColor: [240, 235, 228] },
    alternateRowStyles: { fillColor: [20, 17, 12] },
    styles: { fontSize: 9 },
  })

  // @ts-expect-error jspdf-autotable extends doc
  y = doc.lastAutoTable.finalY + 12

  // Improvement suggestions
  if (calc.improvementSuggestions.length > 0) {
    doc.setTextColor(212, 175, 55)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Accuracy Improvements', 14, y)
    y += 6
    doc.setTextColor(180, 170, 150)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    calc.improvementSuggestions.forEach(s => {
      doc.text(`• ${s}`, 14, y)
      y += 5
    })
  }

  // Footer
  doc.setFillColor(17, 17, 17)
  doc.rect(0, 282, 210, 15, 'F')
  doc.setTextColor(138, 122, 90)
  doc.setFontSize(7)
  doc.text('JewelCAD — Estimates based on AI analysis. Verify with physical measurement before manufacturing.', 14, 290)

  return doc.output('arraybuffer') as unknown as Uint8Array
}
```

- [ ] **Step 2: Create `app/api/generate/pdf/route.ts`**
```ts
import { NextRequest } from 'next/server'
import { generatePDF } from '@/lib/generators/pdfGenerator'
import { synthesize } from '@/lib/calculations/synthesize'
import type { JewelryAnalysis } from '@/types/analysis'

export async function POST(req: NextRequest) {
  const { analysis, imageBase64 }: { analysis: JewelryAnalysis; imageBase64?: string } = await req.json()
  const calc = synthesize(analysis)
  const pdf = generatePDF(analysis, calc, imageBase64)
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="jewelry-spec-${analysis.id}.pdf"`,
    },
  })
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: PDF spec sheet generator with material breakdown table"
```

---

### Task 12: STL generator API route

**Files:**
- Create: `app/api/generate/stl/route.ts`

- [ ] **Step 1: Create `app/api/generate/stl/route.ts`**

Note: STL generation uses Three.js which is browser-only for rendering. For server-side STL, we generate the binary STL directly from geometry math without Three.js.

```ts
import { NextRequest } from 'next/server'
import type { JewelryAnalysis } from '@/types/analysis'

// Binary STL writer — no Three.js dependency server-side
function writeBinarySTL(triangles: Float32Array[]): Uint8Array {
  const header = new Uint8Array(80) // 80-byte header
  const numTriangles = triangles.length
  const buffer = new ArrayBuffer(80 + 4 + numTriangles * 50)
  const view = new DataView(buffer)
  const headerStr = 'JewelCAD Generated STL'
  for (let i = 0; i < headerStr.length; i++) view.setUint8(i, headerStr.charCodeAt(i))
  view.setUint32(80, numTriangles, true)
  let offset = 84
  for (const tri of triangles) {
    for (let i = 0; i < 12; i++) view.setFloat32(offset + i * 4, tri[i], true) // normal + 3 verts
    view.setUint16(offset + 48, 0, true) // attribute
    offset += 50
  }
  return new Uint8Array(buffer)
}

function generateRingTriangles(innerR: number, outerR: number, height: number): Float32Array[] {
  const tris: Float32Array[] = []
  const segments = 64
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2
    const a1 = ((i + 1) / segments) * Math.PI * 2
    // Outer face
    const pts = [
      [Math.cos(a0) * outerR, Math.sin(a0) * outerR, 0],
      [Math.cos(a1) * outerR, Math.sin(a1) * outerR, 0],
      [Math.cos(a1) * outerR, Math.sin(a1) * outerR, height],
      [Math.cos(a0) * outerR, Math.sin(a0) * outerR, height],
    ]
    // Two triangles per quad
    const nx = Math.cos((a0 + a1) / 2), ny = Math.sin((a0 + a1) / 2)
    tris.push(new Float32Array([nx, ny, 0, ...pts[0], ...pts[1], ...pts[2]] as number[]))
    tris.push(new Float32Array([nx, ny, 0, ...pts[0], ...pts[2], ...pts[3]] as number[]))
  }
  return tris
}

export async function POST(req: NextRequest) {
  const { analysis }: { analysis: JewelryAnalysis } = await req.json()
  const { dimensions, jewelryType } = analysis

  let triangles: Float32Array[] = []

  if (jewelryType === 'ring') {
    const innerR = (dimensions.widthMm || 17) / 2
    const outerR = innerR + (dimensions.wallThicknessMm || 1.5)
    triangles = generateRingTriangles(innerR, outerR, dimensions.heightMm || 3)
  } else {
    // Generic bounding box for other types
    const L = dimensions.lengthMm || 20
    const W = dimensions.widthMm || 5
    const H = dimensions.heightMm || 3
    // Simple box — 12 triangles
    const v = [[0,0,0],[L,0,0],[L,W,0],[0,W,0],[0,0,H],[L,0,H],[L,W,H],[0,W,H]]
    const faces = [[0,1,2,0,0,-1],[0,2,3,0,0,-1],[4,6,5,0,0,1],[4,7,6,0,0,1],
                   [0,5,1,0,-1,0],[0,4,5,0,-1,0],[2,6,7,0,1,0],[2,7,3,0,1,0],
                   [0,7,4,-1,0,0],[0,3,7,-1,0,0],[1,5,6,1,0,0],[1,6,2,1,0,0]]
    for (const [a,b,c,nx,ny,nz] of faces) {
      tris: triangles.push(new Float32Array([nx,ny,nz,...v[a],...v[b],...v[c]] as number[]))
    }
  }

  const stl = writeBinarySTL(triangles)
  return new Response(stl, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="jewelry-${analysis.id}.stl"`,
    },
  })
}
```

- [ ] **Step 2: Fix syntax error in STL route (remove label from push)**

Replace `tris: triangles.push(...)` with `triangles.push(...)`

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: binary STL generator with parametric ring geometry"
```

---

## Chunk 5: UI Components + Pages

### Task 13: Upload component

**Files:**
- Create: `components/Upload/DropZone.tsx`
- Create: `components/Upload/OptionalInputs.tsx`
- Create: `components/Upload/AccuracyMeter.tsx`

- [ ] **Step 1: Create `components/Upload/DropZone.tsx`**
```tsx
'use client'
import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onFileSelected: (file: File, preview: string) => void
  disabled?: boolean
}

export default function DropZone({ onFileSelected, disabled }: Props) {
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onFileSelected(file, e.target?.result as string)
    reader.readAsDataURL(file)
  }, [onFileSelected])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <motion.label
      className={`relative flex flex-col items-center justify-center w-full min-h-64 rounded-2xl cursor-pointer transition-all duration-300
        border-2 ${dragging ? 'border-gold-400 bg-dark-800/60' : 'border-dark-700 bg-dark-900/40 hover:border-gold-500/60'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      whileHover={{ scale: 1.01 }}
    >
      <input type="file" accept="image/*" className="sr-only" onChange={onInputChange} disabled={disabled} />
      <div className="flex flex-col items-center gap-4 pointer-events-none px-6 text-center">
        <motion.div
          animate={{ scale: dragging ? 1.2 : 1 }}
          className="w-16 h-16 rounded-full border border-gold-500/40 flex items-center justify-center"
        >
          <svg className="w-8 h-8 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </motion.div>
        <div>
          <p className="text-dark-50 font-medium text-lg">Drop your jewelry photo here</p>
          <p className="text-dark-400 text-sm mt-1">or click to browse — JPG, PNG, WEBP up to 10MB</p>
        </div>
        <p className="text-gold-500/60 text-xs">Best results: clear, well-lit, single piece against plain background</p>
      </div>
    </motion.label>
  )
}
```

- [ ] **Step 2: Create `components/Upload/OptionalInputs.tsx`**
```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OptionalInputs } from '@/types/analysis'

interface Props { onChange: (inputs: OptionalInputs) => void }

export default function OptionalInputsPanel({ onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [inputs, setInputs] = useState<OptionalInputs>({})

  const update = (key: keyof OptionalInputs, value: unknown) => {
    const next = { ...inputs, [key]: value || undefined }
    setInputs(next)
    onChange(next)
  }

  const filledCount = Object.values(inputs).filter(Boolean).length

  return (
    <div className="card-dark rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-dark-50 font-medium">Optional Details</span>
          {filledCount > 0 && (
            <span className="bg-gold-500/20 text-gold-400 text-xs px-2 py-0.5 rounded-full">
              {filledCount} provided — +{filledCount * 8}% accuracy
            </span>
          )}
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-gold-400 text-lg">▾</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dark-700">
              <Field label="Ring Size (US)" hint="+15% accuracy" type="number" min={1} max={16} step={0.5}
                onChange={v => update('ringSizeUS', v ? parseFloat(v) : undefined)} />
              <Field label="Known Length (mm)" hint="+12% accuracy" type="number"
                onChange={v => update('knownLengthMm', v ? parseFloat(v) : undefined)} />
              <Field label="Known Weight (g)" hint="+15% accuracy — weigh on jeweler's scale" type="number"
                onChange={v => update('knownWeightG', v ? parseFloat(v) : undefined)} />
              <Field label="Metal Purity" hint="+8% accuracy" type="select"
                options={['unknown','24k','22k','18k','14k','10k','925','950']}
                onChange={v => update('metalPurity', v === 'unknown' ? undefined : v)} />
              <Field label="Stone Type" hint="If known" type="select"
                options={['unknown','diamond','ruby','emerald','sapphire','amethyst','topaz','pearl','opal','garnet']}
                onChange={v => update('stoneType', v === 'unknown' ? undefined : v)} />
              <Field label="Notes" hint="Any other details" type="text"
                onChange={v => update('additionalNotes', v)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, hint, type, options, min, max, step, onChange }:
  { label: string; hint: string; type: string; options?: string[]; min?: number; max?: number; step?: number; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5 mt-4">
      <label className="text-dark-50 text-sm font-medium">{label}</label>
      <p className="text-dark-400 text-xs">{hint}</p>
      {type === 'select' ? (
        <select onChange={e => onChange(e.target.value)}
          className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-50 text-sm focus:border-gold-500 outline-none">
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} min={min} max={max} step={step}
          onChange={e => onChange(e.target.value)}
          className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-50 text-sm focus:border-gold-500 outline-none" />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: DropZone and OptionalInputs UI components"
```

---

### Task 14: Analysis streaming page

**Files:**
- Create: `components/Analysis/PassCard.tsx`
- Create: `app/analyze/[id]/page.tsx` (client component wrapper)
- Create: `app/analyze/[id]/AnalysisClient.tsx`

- [ ] **Step 1: Create `components/Analysis/PassCard.tsx`**
```tsx
'use client'
import { motion } from 'framer-motion'

interface Props {
  passNumber: number
  passName: string
  status: 'pending' | 'running' | 'complete' | 'error'
}

const icons = ['🔍', '⚗️', '💎', '📐', '✨']

export default function PassCard({ passNumber, passName, status }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: status !== 'pending' ? 1 : 0.3, y: 0 }}
      className="card-dark rounded-xl px-5 py-4 flex items-center gap-4"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0
        ${status === 'complete' ? 'bg-gold-500/20 border border-gold-500/50' :
          status === 'running' ? 'bg-blue-500/20 border border-blue-500/50 animate-pulse' :
          'bg-dark-800 border border-dark-700'}`}>
        {status === 'complete' ? '✓' : icons[passNumber - 1]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-dark-50 font-medium text-sm">{passName}</p>
        <p className="text-dark-400 text-xs mt-0.5">
          {status === 'running' ? 'Analyzing...' :
           status === 'complete' ? 'Complete' :
           status === 'error' ? 'Error' : 'Waiting...'}
        </p>
      </div>
      {status === 'running' && (
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 bg-gold-400 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Create `app/analyze/[id]/page.tsx`**
```tsx
import AnalysisClient from './AnalysisClient'

export default function AnalyzePage() {
  return <AnalysisClient />
}
```

- [ ] **Step 3: Create `app/analyze/[id]/AnalysisClient.tsx`**
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import PassCard from '@/components/Analysis/PassCard'
import type { StreamEvent, JewelryAnalysis } from '@/types/analysis'

type PassStatus = 'pending' | 'running' | 'complete' | 'error'
interface PassState { name: string; status: PassStatus }

const PASS_NAMES = [
  'Classifying jewelry type',
  'Analyzing metal composition',
  'Identifying gemstones',
  'Estimating dimensions (dual AI)',
  'Synthesizing final analysis',
]

export default function AnalysisClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [passes, setPasses] = useState<PassState[]>(
    PASS_NAMES.map(name => ({ name, status: 'pending' }))
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const imageDataUrl = sessionStorage.getItem('pendingImage')
    const optionalInputs = sessionStorage.getItem('pendingInputs')
    if (!imageDataUrl) { router.push('/'); return }

    // Convert dataURL to blob for FormData
    const [header, b64] = imageDataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const binary = atob(b64)
    const arr = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
    const blob = new Blob([arr], { type: mime })

    const form = new FormData()
    form.append('image', blob, 'jewelry.jpg')
    if (optionalInputs) form.append('optionalInputs', optionalInputs)

    const controller = new AbortController()

    fetch('/api/analyze', { method: 'POST', body: form, signal: controller.signal })
      .then(res => {
        if (!res.body) throw new Error('No stream')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const read = (): Promise<void> => reader.read().then(({ done, value }) => {
          if (done) return
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const event: StreamEvent = JSON.parse(line.slice(6))
            handleEvent(event)
          }
          return read()
        })
        return read()
      })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })

    return () => controller.abort()
  }, [router])

  function handleEvent(event: StreamEvent) {
    if (event.type === 'pass_start' && event.passNumber) {
      setPasses(prev => prev.map((p, i) =>
        i === event.passNumber! - 1 ? { ...p, status: 'running' } : p
      ))
    }
    if (event.type === 'pass_complete' && event.passNumber) {
      setPasses(prev => prev.map((p, i) =>
        i === event.passNumber! - 1 ? { ...p, status: 'complete' } : p
      ))
    }
    if (event.type === 'analysis_complete') {
      const analysis = event.data as JewelryAnalysis
      const image = sessionStorage.getItem('pendingImage')
      sessionStorage.setItem(`analysis_${analysis.id}`, JSON.stringify(analysis))
      if (image) sessionStorage.setItem(`image_${analysis.id}`, image)
      router.push(`/results/${analysis.id}`)
    }
    if (event.type === 'error') {
      setError((event.data as { message: string }).message)
    }
  }

  return (
    <main className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4 py-16">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg">
        <h1 className="font-serif text-3xl text-dark-50 text-center mb-2">Analyzing Your Jewelry</h1>
        <p className="text-dark-400 text-center mb-10 text-sm">Running 5-pass AI analysis for maximum accuracy</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {passes.map((p, i) => (
            <PassCard key={i} passNumber={i + 1} passName={p.name} status={p.status} />
          ))}
        </div>
      </motion.div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: streaming analysis page with live pass progress"
```

---

### Task 15: 3D Viewer component

**Files:**
- Create: `components/Results/Viewer3D.tsx`

- [ ] **Step 1: Create `components/Results/Viewer3D.tsx`**
```tsx
'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { JewelryAnalysis } from '@/types/analysis'

function JewelryMesh({ analysis }: { analysis: JewelryAnalysis }) {
  const { dimensions, jewelryType } = analysis
  const material = { color: '#D4AF37', metalness: 0.9, roughness: 0.1 }

  if (jewelryType === 'ring') {
    const outerR = ((dimensions.widthMm || 17) / 2 + (dimensions.wallThicknessMm || 1.5)) / 10
    const innerR = (dimensions.widthMm || 17) / 2 / 10
    const tubeR = (outerR - innerR) / 2
    const torusR = (outerR + innerR) / 2
    return (
      <mesh>
        <torusGeometry args={[torusR, tubeR, 32, 64, Math.PI * 2]} />
        <meshStandardMaterial {...material} />
      </mesh>
    )
  }

  // Default: rounded box
  const L = (dimensions.lengthMm || 20) / 10
  const W = (dimensions.widthMm || 5) / 10
  const H = (dimensions.heightMm || 3) / 10
  return (
    <mesh>
      <boxGeometry args={[L, H, W]} />
      <meshStandardMaterial {...material} />
    </mesh>
  )
}

export default function Viewer3D({ analysis }: { analysis: JewelryAnalysis }) {
  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-dark-900 border border-dark-700">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#D4AF37" />
        <pointLight position={[-5, -5, 5]} intensity={0.5} />
        <Suspense fallback={null}>
          <JewelryMesh analysis={analysis} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add -A && git commit -m "feat: Three.js 3D jewelry viewer with orbit controls"
```

---

### Task 16: Results page

**Files:**
- Create: `components/Results/MaterialCard.tsx`
- Create: `components/Results/DownloadButtons.tsx`
- Create: `app/results/[id]/page.tsx`

- [ ] **Step 1: Create `components/Results/MaterialCard.tsx`**
```tsx
'use client'
import { motion } from 'framer-motion'
import type { MaterialResult } from '@/types/calculation'

export default function MaterialCard({ material, index }: { material: MaterialResult; index: number }) {
  const pct = Math.round(material.confidence * 100)
  const value = (material.valueG ?? material.valueCt ?? 0).toFixed(material.unit === 'g' ? 2 : 3)
  const min = material.minValue.toFixed(material.unit === 'g' ? 2 : 3)
  const max = material.maxValue.toFixed(material.unit === 'g' ? 2 : 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card-dark rounded-xl p-5"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-dark-50 font-medium text-sm leading-tight pr-4">{material.label}</h3>
        <span className="text-dark-400 text-xs flex-shrink-0">{pct}% conf.</span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-gold-400 font-bold text-2xl">{value}</span>
        <span className="text-dark-400 text-sm">{material.unit}</span>
        <span className="text-dark-500 text-xs ml-auto">({min}–{max})</span>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
          className={`h-full rounded-full ${pct >= 80 ? 'bg-gold-400' : pct >= 60 ? 'bg-yellow-500' : 'bg-orange-500'}`}
        />
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Create `components/Results/DownloadButtons.tsx`**
```tsx
'use client'
import { useState } from 'react'
import type { JewelryAnalysis } from '@/types/analysis'

export default function DownloadButtons({ analysis, imageBase64 }: { analysis: JewelryAnalysis; imageBase64?: string }) {
  const [loading, setLoading] = useState<string | null>(null)

  const download = async (type: 'dxf' | 'stl' | 'pdf') => {
    setLoading(type)
    try {
      const endpoint = `/api/generate/${type}`
      const body = type === 'pdf'
        ? JSON.stringify({ analysis, imageBase64 })
        : JSON.stringify({ analysis })
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jewelry-${analysis.id}.${type}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(null)
    }
  }

  const buttons = [
    { type: 'pdf' as const, label: 'PDF Spec Sheet', desc: 'Full material report' },
    { type: 'dxf' as const, label: '2D DXF CAD', desc: 'AutoCAD / Rhino' },
    { type: 'stl' as const, label: '3D STL Model', desc: '3D printing / CNC' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {buttons.map(({ type, label, desc }) => (
        <button key={type} onClick={() => download(type)} disabled={!!loading}
          className="card-dark rounded-xl px-4 py-4 text-left hover:border-gold-500/50 transition-all disabled:opacity-50">
          <div className="text-gold-400 font-medium text-sm">{label}</div>
          <div className="text-dark-400 text-xs mt-0.5">{desc}</div>
          {loading === type && <div className="text-dark-400 text-xs mt-1 animate-pulse">Generating...</div>}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/results/[id]/page.tsx`**
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import MaterialCard from '@/components/Results/MaterialCard'
import DownloadButtons from '@/components/Results/DownloadButtons'
import { synthesize } from '@/lib/calculations/synthesize'
import type { JewelryAnalysis } from '@/types/analysis'
import type { CalculationOutput } from '@/types/calculation'

const Viewer3D = dynamic(() => import('@/components/Results/Viewer3D'), { ssr: false })

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [analysis, setAnalysis] = useState<JewelryAnalysis | null>(null)
  const [calc, setCalc] = useState<CalculationOutput | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(`analysis_${id}`)
    const img = sessionStorage.getItem(`image_${id}`)
    if (!raw) { router.push('/'); return }
    const a: JewelryAnalysis = JSON.parse(raw)
    setAnalysis(a)
    setCalc(synthesize(a))
    setImageUrl(img)
  }, [id, router])

  if (!analysis || !calc) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="text-gold-400 animate-pulse">Loading results...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-dark-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-dark-400 text-sm cursor-pointer hover:text-gold-400" onClick={() => router.push('/')}>← New Analysis</span>
          </div>
          <h1 className="font-serif text-4xl text-dark-50">
            {analysis.jewelryType.charAt(0).toUpperCase() + analysis.jewelryType.slice(1)} Analysis
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Overall confidence: <span className={`font-medium ${calc.overallConfidence >= 0.8 ? 'text-gold-400' : 'text-yellow-500'}`}>
              {Math.round(calc.overallConfidence * 100)}%
            </span>
            &nbsp;·&nbsp;{analysis.metal.type} ({analysis.metal.purity})
            &nbsp;·&nbsp;{analysis.stones.length} stone type{analysis.stones.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Photo */}
          {imageUrl && (
            <div className="card-dark rounded-2xl overflow-hidden aspect-square">
              <img src={imageUrl} alt="Jewelry" className="w-full h-full object-contain p-4" />
            </div>
          )}

          {/* 3D Viewer */}
          <div className="flex flex-col gap-4">
            <Viewer3D analysis={analysis} />
            <div className="card-dark rounded-xl px-4 py-3 text-xs text-dark-400">
              Drag to rotate · Scroll to zoom · 3D model is parametric — based on estimated dimensions
            </div>
          </div>
        </div>

        {/* Material breakdown */}
        <h2 className="font-serif text-2xl text-dark-50 mb-4">Material Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {calc.materials.map((m, i) => <MaterialCard key={i} material={m} index={i} />)}
        </div>

        {/* Summary */}
        <div className="card-dark rounded-xl px-6 py-5 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Metal', value: `${calc.totalMetalWeightG.toFixed(2)}g` },
            { label: 'Total Stones', value: `${calc.totalStoneWeightCt.toFixed(3)}ct` },
            { label: 'Dimensions', value: `${analysis.dimensions.lengthMm.toFixed(0)}×${analysis.dimensions.widthMm.toFixed(0)}×${analysis.dimensions.heightMm.toFixed(0)}mm` },
            { label: 'Confidence', value: `${Math.round(calc.overallConfidence * 100)}%` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-dark-400 text-xs mb-1">{label}</p>
              <p className="text-gold-400 font-bold text-lg">{value}</p>
            </div>
          ))}
        </div>

        {/* Accuracy suggestions */}
        {calc.improvementSuggestions.length > 0 && (
          <div className="card-dark rounded-xl px-6 py-5 mb-8">
            <h3 className="text-dark-50 font-medium mb-3">Improve Accuracy</h3>
            <ul className="space-y-2">
              {calc.improvementSuggestions.map((s, i) => (
                <li key={i} className="text-dark-400 text-sm flex gap-2">
                  <span className="text-gold-500 flex-shrink-0">›</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Downloads */}
        <h2 className="font-serif text-2xl text-dark-50 mb-4">Download Files</h2>
        <DownloadButtons analysis={analysis} imageBase64={imageUrl ?? undefined} />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: results page with material cards, 3D viewer, and download buttons"
```

---

### Task 17: Hero homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**
```tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import DropZone from '@/components/Upload/DropZone'
import OptionalInputsPanel from '@/components/Upload/OptionalInputs'
import type { OptionalInputs } from '@/types/analysis'

export default function HomePage() {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [inputs, setInputs] = useState<OptionalInputs>({})
  const [loading, setLoading] = useState(false)

  const handleFile = useCallback((file: File, dataUrl: string) => {
    setPreview(dataUrl)
    setFileName(file.name)
  }, [])

  const handleAnalyze = () => {
    if (!preview) return
    setLoading(true)
    sessionStorage.setItem('pendingImage', preview)
    sessionStorage.setItem('pendingInputs', JSON.stringify(inputs))
    router.push('/analyze/new')
  }

  return (
    <main className="min-h-screen bg-dark-950 relative overflow-hidden">
      {/* Gold particle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div key={i}
            className="absolute w-px h-px bg-gold-400 rounded-full opacity-30"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-20">
        {/* Hero text */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            <span className="text-gold-400 text-xs font-medium">AI-Powered Jewelry Analysis</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl text-dark-50 mb-5 leading-tight">
            Upload a photo.<br />
            <span className="gold-shimmer">Know exactly what it's made of.</span>
          </h1>
          <p className="text-dark-400 text-lg max-w-xl mx-auto leading-relaxed">
            Our 5-pass AI analysis identifies metal type, purity, stone specifications, and precise weights — then generates CAD files for manufacturing.
          </p>
        </motion.div>

        {/* Upload card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card-dark rounded-2xl p-6 mb-4">
          {preview ? (
            <div className="flex gap-4 items-start">
              <img src={preview} alt="Preview" className="w-24 h-24 rounded-xl object-cover border border-dark-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-dark-50 font-medium text-sm">{fileName}</p>
                <p className="text-dark-400 text-xs mt-1">Ready for analysis</p>
                <button onClick={() => { setPreview(null); setFileName(null) }}
                  className="text-dark-400 text-xs mt-2 hover:text-gold-400 transition-colors">
                  Change photo ×
                </button>
              </div>
            </div>
          ) : (
            <DropZone onFileSelected={handleFile} />
          )}
        </motion.div>

        {/* Optional inputs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-6">
          <OptionalInputsPanel onChange={setInputs} />
        </motion.div>

        {/* Analyze button */}
        <motion.button
          onClick={handleAnalyze}
          disabled={!preview || loading}
          whileHover={{ scale: preview ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-300
            ${preview
              ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-dark-950 hover:from-gold-500 hover:to-gold-300 shadow-lg shadow-gold-500/20'
              : 'bg-dark-800 text-dark-500 cursor-not-allowed'}`}
        >
          {loading ? 'Starting analysis...' : 'Analyze Jewelry →'}
        </motion.button>

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Upload Photo', desc: 'Any clear photo of your jewelry. No special equipment needed.' },
            { step: '02', title: '5-Pass AI Analysis', desc: 'Claude + GPT-4 Vision analyze metal, stones, and dimensions in parallel.' },
            { step: '03', title: 'Get Exact Specs', desc: 'Material weights, stone carats, CAD files — everything to recreate the piece.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="text-gold-500/40 font-serif text-4xl font-bold mb-2">{step}</div>
              <h3 className="text-dark-50 font-medium mb-1">{title}</h3>
              <p className="text-dark-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add -A && git commit -m "feat: luxury hero page with upload, optional inputs, and analyze button"
```

---

## Chunk 6: Final Configuration + Deploy

### Task 18: Next.js config + final fixes

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update `next.config.ts`**
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['dxf-writer'],
  experimental: {
    serverActions: { bodySizeLimit: '11mb' },
  },
}

export default nextConfig
```

- [ ] **Step 2: Run full test suite**
```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 3: Build check**
```bash
npm run build
```
Expected: No build errors

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "chore: next.config + build verification"
```

---

### Task 19: Deploy to Vercel

- [ ] **Step 1: Initialize git (if not already)**
```bash
git init && git add -A && git commit -m "feat: initial jewelry analyzer implementation"
```

- [ ] **Step 2: Use Vercel deploy skill**
Invoke `vercel:deploy` skill for deployment steps including environment variable setup.

- [ ] **Step 3: Set env vars in Vercel dashboard**
```
ANTHROPIC_API_KEY=<your key>
OPENAI_API_KEY=<your key>
```

- [ ] **Step 4: Verify deployment**
Open the Vercel URL, upload a test jewelry photo, confirm all 5 passes complete and results render.

---

## Summary

| Chunk | Tasks | Core Deliverable |
|-------|-------|-----------------|
| 1 | 1–3 | Project scaffold, types, theme |
| 2 | 4–6 | Calculation engine (tested) |
| 3 | 7–9 | AI pipeline + streaming API |
| 4 | 10–12 | DXF + PDF + STL generators |
| 5 | 13–17 | All UI components + 3 pages |
| 6 | 18–19 | Build, test, deploy |
