import { NextRequest } from 'next/server'
import { generateDXF } from '@/lib/generators/dxfGenerator'
import type { JewelryAnalysis } from '@/types/analysis'
export async function POST(req: NextRequest) {
  const { analysis }: { analysis: JewelryAnalysis } = await req.json()
  const dxf = generateDXF(analysis)
  return new Response(dxf, { headers: { 'Content-Type':'application/dxf', 'Content-Disposition':`attachment; filename="jewelry-${analysis.id}.dxf"` } })
}
