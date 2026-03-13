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
const Viewer3D = dynamic(()=>import('@/components/Results/Viewer3D'),{ ssr:false })

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [analysis, setAnalysis] = useState<JewelryAnalysis|null>(null)
  const [calc, setCalc] = useState<CalculationOutput|null>(null)
  const [imageUrl, setImageUrl] = useState<string|null>(null)

  useEffect(()=>{
    const raw = sessionStorage.getItem(`analysis_${id}`)
    const img = sessionStorage.getItem(`image_${id}`)
    if (!raw) { router.push('/'); return }
    const a: JewelryAnalysis = JSON.parse(raw)
    setAnalysis(a); setCalc(synthesize(a)); setImageUrl(img)
  },[id,router])

  if (!analysis||!calc) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="text-gold-400 animate-pulse">Loading results...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-dark-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="mb-10">
          <span className="text-dark-400 text-sm cursor-pointer hover:text-gold-400" onClick={()=>router.push('/')}>← New Analysis</span>
          <h1 className="font-serif text-4xl text-dark-50 mt-2">{analysis.jewelryType.charAt(0).toUpperCase()+analysis.jewelryType.slice(1)} Analysis</h1>
          <p className="text-dark-400 mt-1 text-sm">
            Confidence: <span className={`font-medium ${calc.overallConfidence>=0.8?'text-gold-400':'text-yellow-500'}`}>{Math.round(calc.overallConfidence*100)}%</span>
            &nbsp;·&nbsp;{analysis.metal.type} ({analysis.metal.purity})
            &nbsp;·&nbsp;{analysis.stones.length} stone type{analysis.stones.length!==1?'s':''}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {imageUrl&&<div className="card-dark rounded-2xl overflow-hidden aspect-square"><img src={imageUrl} alt="Jewelry" className="w-full h-full object-contain p-4"/></div>}
          <div className="flex flex-col gap-4">
            <Viewer3D analysis={analysis}/>
            <div className="card-dark rounded-xl px-4 py-3 text-xs text-dark-400">Drag to rotate · Scroll to zoom · Parametric model from estimated dimensions</div>
          </div>
        </div>

        <h2 className="font-serif text-2xl text-dark-50 mb-4">Material Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {calc.materials.map((m,i)=><MaterialCard key={i} material={m} index={i}/>)}
        </div>

        <div className="card-dark rounded-xl px-6 py-5 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {label:'Total Metal',value:`${calc.totalMetalWeightG.toFixed(2)}g`},
            {label:'Total Stones',value:`${calc.totalStoneWeightCt.toFixed(3)}ct`},
            {label:'Dimensions',value:`${analysis.dimensions.lengthMm.toFixed(0)}×${analysis.dimensions.widthMm.toFixed(0)}×${analysis.dimensions.heightMm.toFixed(0)}mm`},
            {label:'Confidence',value:`${Math.round(calc.overallConfidence*100)}%`},
          ].map(({label,value})=>(
            <div key={label}><p className="text-dark-400 text-xs mb-1">{label}</p><p className="text-gold-400 font-bold text-lg">{value}</p></div>
          ))}
        </div>

        {calc.improvementSuggestions.length>0&&(
          <div className="card-dark rounded-xl px-6 py-5 mb-8">
            <h3 className="text-dark-50 font-medium mb-3">Improve Accuracy</h3>
            <ul className="space-y-2">{calc.improvementSuggestions.map((s,i)=><li key={i} className="text-dark-400 text-sm flex gap-2"><span className="text-gold-500 flex-shrink-0">›</span>{s}</li>)}</ul>
          </div>
        )}

        <h2 className="font-serif text-2xl text-dark-50 mb-4">Download Files</h2>
        <DownloadButtons analysis={analysis} imageBase64={imageUrl??undefined}/>
      </div>
    </main>
  )
}
