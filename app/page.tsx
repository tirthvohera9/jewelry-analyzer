'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import DropZone from '@/components/Upload/DropZone'
import OptionalInputsPanel from '@/components/Upload/OptionalInputs'
import type { OptionalInputs } from '@/types/analysis'

export default function HomePage() {
  const router = useRouter()
  const [preview, setPreview] = useState<string|null>(null)
  const [fileName, setFileName] = useState<string|null>(null)
  const [inputs, setInputs] = useState<OptionalInputs>({})
  const [loading, setLoading] = useState(false)

  const handleFile = useCallback((file: File, dataUrl: string) => {
    setPreview(dataUrl); setFileName(file.name)
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({length:20}).map((_,i)=>(
          <motion.div key={i} className="absolute w-px h-px bg-gold-400 rounded-full opacity-30"
            style={{left:`${(i*37)%100}%`,top:`${(i*53)%100}%`}}
            animate={{y:[0,-30,0],opacity:[0.1,0.4,0.1]}}
            transition={{duration:3+i*0.5,repeat:Infinity,delay:i*0.3}}/>
        ))}
      </div>
      <div className="relative max-w-3xl mx-auto px-4 py-20">
        <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse"/>
            <span className="text-gold-400 text-xs font-medium">AI-Powered Jewelry Analysis</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl text-dark-50 mb-5 leading-tight">
            Upload a photo.<br/>
            <span className="gold-shimmer">Know exactly what it&apos;s made of.</span>
          </h1>
          <p className="text-dark-400 text-lg max-w-xl mx-auto leading-relaxed">
            Our 5-pass AI analysis identifies metal type, purity, stone specifications, and precise weights — then generates CAD files for manufacturing.
          </p>
        </motion.div>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="card-dark rounded-2xl p-6 mb-4">
          {preview ? (
            <div className="flex gap-4 items-start">
              <img src={preview} alt="Preview" className="w-24 h-24 rounded-xl object-cover border border-dark-600 flex-shrink-0"/>
              <div className="flex-1">
                <p className="text-dark-50 font-medium text-sm">{fileName}</p>
                <p className="text-dark-400 text-xs mt-1">Ready for analysis</p>
                <button onClick={()=>{setPreview(null);setFileName(null)}} className="text-dark-400 text-xs mt-2 hover:text-gold-400 transition-colors">Change photo ×</button>
              </div>
            </div>
          ) : (
            <DropZone onFileSelected={handleFile}/>
          )}
        </motion.div>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="mb-6">
          <OptionalInputsPanel onChange={setInputs}/>
        </motion.div>

        <motion.button onClick={handleAnalyze} disabled={!preview||loading}
          whileHover={{scale:preview?1.02:1}} whileTap={{scale:0.98}}
          className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-300
            ${preview?'bg-gradient-to-r from-gold-600 to-gold-400 text-dark-950 hover:from-gold-500 hover:to-gold-300 shadow-lg shadow-gold-500/20':'bg-dark-800 text-dark-500 cursor-not-allowed'}`}>
          {loading?'Starting analysis...':'Analyze Jewelry →'}
        </motion.button>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {step:'01',title:'Upload Photo',desc:'Any clear photo of your jewelry. No special equipment needed.'},
            {step:'02',title:'5-Pass AI Analysis',desc:'Claude + GPT-4 Vision analyze metal, stones, and dimensions in parallel.'},
            {step:'03',title:'Get Exact Specs',desc:'Material weights, stone carats, CAD files — everything to recreate the piece.'},
          ].map(({step,title,desc})=>(
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
