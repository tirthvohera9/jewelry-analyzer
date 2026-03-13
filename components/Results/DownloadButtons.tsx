'use client'
import { useState } from 'react'
import type { JewelryAnalysis } from '@/types/analysis'
export default function DownloadButtons({ analysis, imageBase64 }: { analysis: JewelryAnalysis; imageBase64?: string }) {
  const [loading, setLoading] = useState<string|null>(null)
  const download = async (type: 'dxf'|'stl'|'pdf') => {
    setLoading(type)
    try {
      const body = type==='pdf' ? JSON.stringify({analysis,imageBase64}) : JSON.stringify({analysis})
      const res = await fetch(`/api/generate/${type}`,{ method:'POST', headers:{'Content-Type':'application/json'}, body })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=`jewelry-${analysis.id}.${type}`; a.click()
      URL.revokeObjectURL(url)
    } finally { setLoading(null) }
  }
  const btns = [
    { type:'pdf' as const, label:'PDF Spec Sheet', desc:'Full material report' },
    { type:'dxf' as const, label:'2D DXF CAD', desc:'AutoCAD / Rhino' },
    { type:'stl' as const, label:'3D STL Model', desc:'3D printing / CNC' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {btns.map(({type,label,desc})=>(
        <button key={type} onClick={()=>download(type)} disabled={!!loading}
          className="card-dark rounded-xl px-4 py-4 text-left hover:border-gold-500/50 transition-all disabled:opacity-50">
          <div className="text-gold-400 font-medium text-sm">{label}</div>
          <div className="text-dark-400 text-xs mt-0.5">{desc}</div>
          {loading===type&&<div className="text-dark-400 text-xs mt-1 animate-pulse">Generating...</div>}
        </button>
      ))}
    </div>
  )
}
