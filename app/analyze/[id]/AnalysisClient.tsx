'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import PassCard from '@/components/Analysis/PassCard'
import type { StreamEvent, JewelryAnalysis } from '@/types/analysis'

type PassStatus = 'pending'|'running'|'complete'|'error'
interface PassState { name: string; status: PassStatus }
const PASS_NAMES = ['Classifying jewelry type','Analyzing metal composition','Identifying gemstones','Estimating dimensions (dual AI)','Synthesizing final analysis']

export default function AnalysisClient() {
  const router = useRouter()
  const [passes, setPasses] = useState<PassState[]>(PASS_NAMES.map(name=>({ name, status:'pending' })))
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    const imageDataUrl = sessionStorage.getItem('pendingImage')
    const optionalInputs = sessionStorage.getItem('pendingInputs')
    if (!imageDataUrl) { router.push('/'); return }
    const [header, b64] = imageDataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1]??'image/jpeg'
    const binary = atob(b64)
    const arr = new Uint8Array(binary.length)
    for (let i=0;i<binary.length;i++) arr[i]=binary.charCodeAt(i)
    const form = new FormData()
    form.append('image', new Blob([arr],{type:mime}), 'jewelry.jpg')
    if (optionalInputs) form.append('optionalInputs', optionalInputs)
    const controller = new AbortController()
    fetch('/api/analyze',{ method:'POST', body:form, signal:controller.signal })
      .then(res => {
        if (!res.body) throw new Error('No stream')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        const read = (): Promise<void> => reader.read().then(({ done, value }) => {
          if (done) return
          buffer += decoder.decode(value,{ stream:true })
          const lines = buffer.split('\n\n'); buffer = lines.pop()??''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try { handleEvent(JSON.parse(line.slice(6))) } catch(_) {}
          }
          return read()
        })
        return read()
      })
      .catch(err => { if (err.name!=='AbortError') setError(err.message) })
    return () => controller.abort()
  }, [router])

  function handleEvent(event: StreamEvent) {
    if (event.type==='pass_start'&&event.passNumber) setPasses(p=>p.map((x,i)=>i===event.passNumber!-1?{...x,status:'running'}:x))
    if (event.type==='pass_complete'&&event.passNumber) setPasses(p=>p.map((x,i)=>i===event.passNumber!-1?{...x,status:'complete'}:x))
    if (event.type==='analysis_complete') {
      const analysis = event.data as JewelryAnalysis
      sessionStorage.setItem(`analysis_${analysis.id}`, JSON.stringify(analysis))
      const img = sessionStorage.getItem('pendingImage')
      if (img) sessionStorage.setItem(`image_${analysis.id}`, img)
      router.push(`/results/${analysis.id}`)
    }
    if (event.type==='error') setError((event.data as {message:string}).message)
  }

  return (
    <main className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4 py-16">
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="w-full max-w-lg">
        <h1 className="font-serif text-3xl text-dark-50 text-center mb-2">Analyzing Your Jewelry</h1>
        <p className="text-dark-400 text-center mb-10 text-sm">Running 5-pass AI analysis for maximum accuracy</p>
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-6 text-red-400 text-sm">{error}</div>}
        <div className="flex flex-col gap-3">
          {passes.map((p,i)=><PassCard key={i} passNumber={i+1} passName={p.name} status={p.status} />)}
        </div>
      </motion.div>
    </main>
  )
}
