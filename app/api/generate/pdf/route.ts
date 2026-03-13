import { NextRequest } from 'next/server'
import { generatePDF } from '@/lib/generators/pdfGenerator'
import { synthesize } from '@/lib/calculations/synthesize'
import type { JewelryAnalysis } from '@/types/analysis'
export async function POST(req: NextRequest) {
  const { analysis, imageBase64 }: { analysis: JewelryAnalysis; imageBase64?: string } = await req.json()
  const calc = synthesize(analysis)
  const pdf = generatePDF(analysis, calc, imageBase64)
  return new Response(pdf, { headers:{ 'Content-Type':'application/pdf', 'Content-Disposition':`attachment; filename="jewelry-spec-${analysis.id}.pdf"` } })
}
