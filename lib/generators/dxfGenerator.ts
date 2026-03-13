import type { JewelryAnalysis } from '@/types/analysis'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DXF = require('dxf-writer')

export function generateDXF(analysis: JewelryAnalysis): string {
  const d = new DXF()
  d.addLayer('OUTLINE', DXF.ACI.WHITE, 'CONTINUOUS')
  d.addLayer('STONES', DXF.ACI.CYAN, 'CONTINUOUS')
  d.addLayer('DIMENSIONS', DXF.ACI.YELLOW, 'CONTINUOUS')
  d.setActiveLayer('OUTLINE')
  const { dimensions, jewelryType, stones } = analysis
  const L = dimensions.lengthMm||20, W = dimensions.widthMm||5
  if (jewelryType==='ring') {
    d.drawCircle(0,0,(L/2+(dimensions.wallThicknessMm||1.5)))
    d.drawCircle(0,0,L/2)
  } else if (jewelryType==='bracelet') {
    d.drawCircle(50,0,L/2+(dimensions.wallThicknessMm||1.5))
    d.drawCircle(50,0,L/2)
  } else {
    d.drawRect(0,0,L,W)
  }
  d.setActiveLayer('STONES')
  let sx = -L/3
  for (const stone of stones) {
    const r = stone.estimatedDiameterMm/2||2
    for (let i=0;i<stone.count;i++) d.drawCircle(sx+i*(stone.estimatedDiameterMm+1),0,r)
    sx += stone.count*(stone.estimatedDiameterMm+1)
  }
  d.setActiveLayer('OUTLINE')
  d.drawRect(0,-(W+10),L,dimensions.heightMm||5)
  d.setActiveLayer('DIMENSIONS')
  d.drawText(0,-(W+20),2.5,0,`L:${L.toFixed(1)}mm W:${W.toFixed(1)}mm H:${(dimensions.heightMm||5).toFixed(1)}mm`)
  return d.toDxfString()
}
