import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { JewelryAnalysis } from '@/types/analysis'
import type { CalculationOutput } from '@/types/calculation'

export function generatePDF(analysis: JewelryAnalysis, calc: CalculationOutput, imageBase64?: string): ArrayBuffer {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  doc.setFillColor(17,17,17); doc.rect(0,0,210,30,'F')
  doc.setTextColor(212,175,55); doc.setFontSize(20); doc.setFont('helvetica','bold')
  doc.text('JewelCAD Material Specification',14,18)
  doc.setTextColor(200,200,200); doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text(`Report ID: ${analysis.id} | ${new Date().toLocaleDateString()}`,14,25)
  let y=40
  if (imageBase64) { try { doc.addImage(imageBase64,'JPEG',14,y,60,60) } catch(_){} }
  const sx = imageBase64 ? 82 : 14
  doc.setFillColor(26,21,16); doc.roundedRect(sx,y,115,60,3,3,'F')
  doc.setTextColor(212,175,55); doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text('Analysis Summary',sx+4,y+10)
  doc.setTextColor(240,235,228); doc.setFontSize(9); doc.setFont('helvetica','normal')
  const lines=[`Type: ${analysis.jewelryType.toUpperCase()}`,`Metal: ${analysis.metal.type} (${analysis.metal.purity})`,`Total Metal: ${calc.totalMetalWeightG.toFixed(2)}g`,`Total Stones: ${calc.totalStoneWeightCt.toFixed(3)}ct`,`Confidence: ${Math.round(calc.overallConfidence*100)}%`,`Dimensions: ${analysis.dimensions.lengthMm.toFixed(1)}×${analysis.dimensions.widthMm.toFixed(1)}×${analysis.dimensions.heightMm.toFixed(1)}mm`]
  lines.forEach((l,i)=>doc.text(l,sx+4,y+20+i*7))
  y+=70
  doc.setTextColor(212,175,55); doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('Material Breakdown',14,y); y+=5
  autoTable(doc,{
    startY:y,
    head:[['Material','Qty','Min','Max','Unit','Conf.']],
    body:calc.materials.map(m=>[(m.label),(m.valueG??m.valueCt??0).toFixed(m.unit==='g'?2:3),m.minValue.toFixed(m.unit==='g'?2:3),m.maxValue.toFixed(m.unit==='g'?2:3),m.unit,`${Math.round(m.confidence*100)}%`]),
    headStyles:{fillColor:[42,37,32],textColor:[212,175,55],fontStyle:'bold'},
    bodyStyles:{fillColor:[26,21,16],textColor:[240,235,228]},
    alternateRowStyles:{fillColor:[20,17,12]},
    styles:{fontSize:9},
  })
  // @ts-expect-error jspdf-autotable extends doc
  y=doc.lastAutoTable.finalY+12
  if (calc.improvementSuggestions.length>0) {
    doc.setTextColor(212,175,55); doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text('Accuracy Improvements',14,y); y+=6
    doc.setTextColor(180,170,150); doc.setFontSize(8); doc.setFont('helvetica','normal')
    calc.improvementSuggestions.forEach(s=>{doc.text(`• ${s}`,14,y);y+=5})
  }
  doc.setFillColor(17,17,17); doc.rect(0,282,210,15,'F')
  doc.setTextColor(138,122,90); doc.setFontSize(7)
  doc.text('JewelCAD — Estimates based on AI analysis. Verify with physical measurement before manufacturing.',14,290)
  return doc.output('arraybuffer')
}
