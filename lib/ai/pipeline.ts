import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { PASS1_SYSTEM, PASS1_USER } from './prompts/pass1_classify'
import { PASS2_SYSTEM, PASS2_USER } from './prompts/pass2_metal'
import { PASS3_SYSTEM, PASS3_USER } from './prompts/pass3_stones'
import { PASS4_SYSTEM, PASS4_USER } from './prompts/pass4_dimensions'
import { PASS5_SYSTEM, PASS5_USER } from './prompts/pass5_synthesis'
import type { JewelryAnalysis, OptionalInputs, StreamEvent, Stone, MetalComponent, Dimensions } from '@/types/analysis'
import { v4 as uuidv4 } from 'uuid'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function safeJSON(text: string): Record<string, unknown> {
  try { return JSON.parse(text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()) }
  catch { return {} }
}

async function claudeVision(system: string, userPrompt: string, imageBase64: string, mediaType: string): Promise<Record<string, unknown>> {
  const r = await anthropic.messages.create({
    model: 'claude-opus-4-6', max_tokens: 2048, system,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: userPrompt },
    ]}],
  })
  return safeJSON(r.content[0].type === 'text' ? r.content[0].text : '')
}

async function gptVision(userPrompt: string, imageBase64: string, mediaType: string): Promise<Record<string, unknown>> {
  const r = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: 1024,
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}`, detail: 'high' } },
      { type: 'text', text: userPrompt },
    ]}],
  })
  return safeJSON(r.choices[0].message.content ?? '')
}

function mergeDimensions(a: Record<string,unknown>, b: Record<string,unknown>): Record<string,unknown> {
  const avg = (k: string) => { const va=Number(a[k]??0),vb=Number(b[k]??0); return va&&vb?(va+vb)/2:va||vb }
  return { lengthMm:avg('lengthMm'), widthMm:avg('widthMm'), heightMm:avg('heightMm'), wireDiameterMm:avg('wireDiameterMm'), wallThicknessMm:avg('wallThicknessMm'), confidence:Math.max(Number(a.confidence??0),Number(b.confidence??0)) }
}

function buildMetal(p2: Record<string,unknown>, p5: Record<string,unknown>): MetalComponent {
  return { type:(p5.finalMetalType??p2.metalType??'unknown') as MetalComponent['type'], purity:(p5.finalMetalPurity??p2.estimatedPurity??'unknown') as MetalComponent['purity'], finish:(p2.finishType??'unknown') as MetalComponent['finish'], confidence:Number(p5.finalMetalConfidence??p2.confidence??0.6) }
}

function buildStones(p3: Record<string,unknown>): Stone[] {
  return ((p3.stones as Record<string,unknown>[])||[]).map(s => ({ type:(s.type??'unknown') as Stone['type'], cut:(s.cut??'unknown') as Stone['cut'], setting:(s.setting??'unknown') as Stone['setting'], estimatedDiameterMm:Number(s.estimatedDiameterMm??0), estimatedCarats:0, count:Number(s.count??1), colorGrade:s.colorGrade as string, confidence:Number(s.confidence??0.6) }))
}

function buildDimensions(dims: Record<string,unknown>, p5: Record<string,unknown>): Dimensions {
  const d = (p5.finalDimensions as Record<string,unknown>)??dims
  return { lengthMm:Number(d.lengthMm??0), widthMm:Number(d.widthMm??0), heightMm:Number(d.heightMm??0), wireDiameterMm:d.wireDiameterMm?Number(d.wireDiameterMm):undefined, wallThicknessMm:d.wallThicknessMm?Number(d.wallThicknessMm):undefined, confidence:Number(d.confidence??0.6) }
}

export async function* runPipeline(imageBase64: string, mediaType: string, optionalInputs: OptionalInputs = {}): AsyncGenerator<StreamEvent> {
  const id = uuidv4()
  const optStr = JSON.stringify(optionalInputs)

  yield { type:'pass_start', passNumber:1, passName:'Classifying jewelry type' }
  const pass1 = await claudeVision(PASS1_SYSTEM, PASS1_USER(optStr), imageBase64, mediaType)
  yield { type:'pass_complete', passNumber:1, passName:'Classifying jewelry type', data:pass1 }

  yield { type:'pass_start', passNumber:2, passName:'Analyzing metal composition' }
  const pass2 = await claudeVision(PASS2_SYSTEM, PASS2_USER(JSON.stringify(pass1), optStr), imageBase64, mediaType)
  yield { type:'pass_complete', passNumber:2, passName:'Analyzing metal composition', data:pass2 }

  yield { type:'pass_start', passNumber:3, passName:'Identifying gemstones' }
  const pass3 = await claudeVision(PASS3_SYSTEM, PASS3_USER(JSON.stringify(pass1)), imageBase64, mediaType)
  yield { type:'pass_complete', passNumber:3, passName:'Identifying gemstones', data:pass3 }

  yield { type:'pass_start', passNumber:4, passName:'Estimating dimensions (dual AI)' }
  const [claudeDims, gptDims] = await Promise.all([
    claudeVision(PASS4_SYSTEM, PASS4_USER(JSON.stringify(pass1), JSON.stringify(pass3), optStr), imageBase64, mediaType),
    gptVision(PASS4_USER(JSON.stringify(pass1), JSON.stringify(pass3), optStr), imageBase64, mediaType),
  ])
  const dims = mergeDimensions(claudeDims, gptDims)
  yield { type:'pass_complete', passNumber:4, passName:'Estimating dimensions (dual AI)', data:dims }

  yield { type:'pass_start', passNumber:5, passName:'Synthesizing final analysis' }
  const allPasses = `Pass1:${JSON.stringify(pass1)}\nPass2:${JSON.stringify(pass2)}\nPass3:${JSON.stringify(pass3)}\nPass4:${JSON.stringify(dims)}`
  const pass5 = await claudeVision(PASS5_SYSTEM, PASS5_USER(allPasses), imageBase64, mediaType)
  yield { type:'pass_complete', passNumber:5, passName:'Synthesizing final analysis', data:pass5 }

  const analysis: JewelryAnalysis = {
    id, imageUrl:'', jewelryType:(pass1.jewelryType as string??'unknown') as JewelryAnalysis['jewelryType'],
    metal:buildMetal(pass2,pass5), stones:buildStones(pass3), dimensions:buildDimensions(dims,pass5),
    overallConfidence:Number(pass5.overallConfidence??0.65), passes:[], optionalInputs, createdAt:new Date().toISOString(),
  }
  yield { type:'analysis_complete', analysisId:id, data:analysis }
}
