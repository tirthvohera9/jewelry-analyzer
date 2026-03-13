import { GoogleGenerativeAI } from '@google/generative-ai'
import { PASS1_SYSTEM, PASS1_USER } from './prompts/pass1_classify'
import { PASS2_SYSTEM, PASS2_USER } from './prompts/pass2_metal'
import { PASS3_SYSTEM, PASS3_USER } from './prompts/pass3_stones'
import { PASS4_SYSTEM, PASS4_USER } from './prompts/pass4_dimensions'
import { PASS5_SYSTEM, PASS5_USER } from './prompts/pass5_synthesis'
import type { JewelryAnalysis, OptionalInputs, StreamEvent, Stone, MetalComponent, Dimensions } from '@/types/analysis'
import { v4 as uuidv4 } from 'uuid'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Flash: fast, accurate for classification and analysis
const FLASH = 'gemini-2.0-flash'
// Pro: deeper reasoning for gemstones, dimensions cross-validation, synthesis
const PRO = 'gemini-1.5-pro'

function safeJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) { try { return JSON.parse(match[0]) } catch { /* fall through */ } }
    return {}
  }
}

async function geminiVision(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mediaType: string
): Promise<Record<string, unknown>> {
  const model = genai.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  })
  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType: mediaType as 'image/jpeg' } },
    userPrompt,
  ])
  return safeJSON(result.response.text())
}

function mergeDimensions(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const avg = (k: string) => { const va = Number(a[k] ?? 0), vb = Number(b[k] ?? 0); return va && vb ? (va + vb) / 2 : va || vb }
  return { lengthMm: avg('lengthMm'), widthMm: avg('widthMm'), heightMm: avg('heightMm'), wireDiameterMm: avg('wireDiameterMm'), wallThicknessMm: avg('wallThicknessMm'), confidence: Math.max(Number(a.confidence ?? 0), Number(b.confidence ?? 0)) }
}

function buildMetal(p2: Record<string, unknown>, p5: Record<string, unknown>): MetalComponent {
  return { type: (p5.finalMetalType ?? p2.metalType ?? 'unknown') as MetalComponent['type'], purity: (p5.finalMetalPurity ?? p2.estimatedPurity ?? 'unknown') as MetalComponent['purity'], finish: (p2.finishType ?? 'unknown') as MetalComponent['finish'], confidence: Number(p5.finalMetalConfidence ?? p2.confidence ?? 0.6) }
}

function buildStones(p3: Record<string, unknown>): Stone[] {
  return ((p3.stones as Record<string, unknown>[]) || []).map(s => ({ type: (s.type ?? 'unknown') as Stone['type'], cut: (s.cut ?? 'unknown') as Stone['cut'], setting: (s.setting ?? 'unknown') as Stone['setting'], estimatedDiameterMm: Number(s.estimatedDiameterMm ?? 0), estimatedCarats: 0, count: Number(s.count ?? 1), colorGrade: s.colorGrade as string, confidence: Number(s.confidence ?? 0.6) }))
}

function buildDimensions(dims: Record<string, unknown>, p5: Record<string, unknown>): Dimensions {
  const d = (p5.finalDimensions as Record<string, unknown>) ?? dims
  return { lengthMm: Number(d.lengthMm ?? 0), widthMm: Number(d.widthMm ?? 0), heightMm: Number(d.heightMm ?? 0), wireDiameterMm: d.wireDiameterMm ? Number(d.wireDiameterMm) : undefined, wallThicknessMm: d.wallThicknessMm ? Number(d.wallThicknessMm) : undefined, confidence: Number(d.confidence ?? 0.6) }
}

export async function* runPipeline(
  imageBase64: string,
  mediaType: string,
  optionalInputs: OptionalInputs = {}
): AsyncGenerator<StreamEvent> {
  const id = uuidv4()
  const optStr = JSON.stringify(optionalInputs)

  yield { type: 'pass_start', passNumber: 1, passName: 'Classifying jewelry type' }
  const pass1 = await geminiVision(FLASH, PASS1_SYSTEM, PASS1_USER(optStr), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 1, passName: 'Classifying jewelry type', data: pass1 }

  yield { type: 'pass_start', passNumber: 2, passName: 'Analyzing metal composition' }
  const pass2 = await geminiVision(FLASH, PASS2_SYSTEM, PASS2_USER(JSON.stringify(pass1), optStr), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 2, passName: 'Analyzing metal composition', data: pass2 }

  yield { type: 'pass_start', passNumber: 3, passName: 'Identifying gemstones' }
  const pass3 = await geminiVision(PRO, PASS3_SYSTEM, PASS3_USER(JSON.stringify(pass1)), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 3, passName: 'Identifying gemstones', data: pass3 }

  // Pass 4: Flash + Pro in parallel for cross-validated dimension estimation
  yield { type: 'pass_start', passNumber: 4, passName: 'Estimating dimensions (dual model)' }
  const dimPrompt = PASS4_USER(JSON.stringify(pass1), JSON.stringify(pass3), optStr)
  const [flashDims, proDims] = await Promise.all([
    geminiVision(FLASH, PASS4_SYSTEM, dimPrompt, imageBase64, mediaType),
    geminiVision(PRO,   PASS4_SYSTEM, dimPrompt, imageBase64, mediaType),
  ])
  const dims = mergeDimensions(flashDims, proDims)
  yield { type: 'pass_complete', passNumber: 4, passName: 'Estimating dimensions (dual model)', data: dims }

  yield { type: 'pass_start', passNumber: 5, passName: 'Synthesizing final analysis' }
  const allPasses = `Pass1:${JSON.stringify(pass1)}\nPass2:${JSON.stringify(pass2)}\nPass3:${JSON.stringify(pass3)}\nPass4:${JSON.stringify(dims)}`
  const pass5 = await geminiVision(PRO, PASS5_SYSTEM, PASS5_USER(allPasses), imageBase64, mediaType)
  yield { type: 'pass_complete', passNumber: 5, passName: 'Synthesizing final analysis', data: pass5 }

  const analysis: JewelryAnalysis = {
    id, imageUrl: '', jewelryType: (pass1.jewelryType as string ?? 'unknown') as JewelryAnalysis['jewelryType'],
    metal: buildMetal(pass2, pass5), stones: buildStones(pass3), dimensions: buildDimensions(dims, pass5),
    overallConfidence: Number(pass5.overallConfidence ?? 0.65), passes: [], optionalInputs, createdAt: new Date().toISOString(),
  }
  yield { type: 'analysis_complete', analysisId: id, data: analysis }
}
