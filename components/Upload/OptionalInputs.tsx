'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OptionalInputs } from '@/types/analysis'

interface Props { onChange: (inputs: OptionalInputs) => void }

export default function OptionalInputsPanel({ onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [inputs, setInputs] = useState<OptionalInputs>({})
  const update = (key: keyof OptionalInputs, value: unknown) => {
    const next = { ...inputs, [key]: value||undefined } as OptionalInputs
    setInputs(next); onChange(next)
  }
  const filledCount = Object.values(inputs).filter(Boolean).length
  return (
    <div className="card-dark rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o=>!o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-dark-50 font-medium">Optional Details</span>
          {filledCount > 0 && <span className="bg-gold-500/20 text-gold-400 text-xs px-2 py-0.5 rounded-full">{filledCount} provided — +{filledCount*8}% accuracy</span>}
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-gold-400 text-lg">▾</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0 }} animate={{ height:'auto' }} exit={{ height:0 }} className="overflow-hidden">
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dark-700">
              {[
                {label:'Ring Size (US)',hint:'+15% accuracy',type:'number',key:'ringSizeUS',parse:(v:string)=>v?parseFloat(v):undefined},
                {label:'Known Length (mm)',hint:'+12% accuracy',type:'number',key:'knownLengthMm',parse:(v:string)=>v?parseFloat(v):undefined},
                {label:'Known Weight (g)',hint:'+15% accuracy',type:'number',key:'knownWeightG',parse:(v:string)=>v?parseFloat(v):undefined},
                {label:'Additional Notes',hint:'Any other details',type:'text',key:'additionalNotes',parse:(v:string)=>v||undefined},
              ].map(f=>(
                <div key={f.key} className="flex flex-col gap-1.5 mt-4">
                  <label className="text-dark-50 text-sm font-medium">{f.label}</label>
                  <p className="text-dark-400 text-xs">{f.hint}</p>
                  <input type={f.type} onChange={e=>update(f.key as keyof OptionalInputs, f.parse(e.target.value))}
                    className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-50 text-sm focus:border-gold-500 outline-none" />
                </div>
              ))}
              <div className="flex flex-col gap-1.5 mt-4">
                <label className="text-dark-50 text-sm font-medium">Metal Purity</label>
                <p className="text-dark-400 text-xs">+8% accuracy</p>
                <select onChange={e=>update('metalPurity', e.target.value==='unknown'?undefined:e.target.value)}
                  className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-50 text-sm focus:border-gold-500 outline-none">
                  {['unknown','24k','22k','18k','14k','10k','925','950'].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 mt-4">
                <label className="text-dark-50 text-sm font-medium">Stone Type</label>
                <p className="text-dark-400 text-xs">If known</p>
                <select onChange={e=>update('stoneType', e.target.value==='unknown'?undefined:e.target.value)}
                  className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-50 text-sm focus:border-gold-500 outline-none">
                  {['unknown','diamond','ruby','emerald','sapphire','amethyst','topaz','pearl','opal','garnet'].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
