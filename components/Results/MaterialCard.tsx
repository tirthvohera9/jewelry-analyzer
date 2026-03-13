'use client'
import { motion } from 'framer-motion'
import type { MaterialResult } from '@/types/calculation'
export default function MaterialCard({ material, index }: { material: MaterialResult; index: number }) {
  const pct = Math.round(material.confidence*100)
  const value = (material.valueG??material.valueCt??0).toFixed(material.unit==='g'?2:3)
  const min = material.minValue.toFixed(material.unit==='g'?2:3)
  const max = material.maxValue.toFixed(material.unit==='g'?2:3)
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:index*0.1 }}
      className="card-dark rounded-xl p-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-dark-50 font-medium text-sm leading-tight pr-4">{material.label}</h3>
        <span className="text-dark-400 text-xs flex-shrink-0">{pct}% conf.</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-gold-400 font-bold text-2xl">{value}</span>
        <span className="text-dark-400 text-sm">{material.unit}</span>
        <span className="text-dark-500 text-xs ml-auto">({min}–{max})</span>
      </div>
      <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8, delay:index*0.1+0.3 }}
          className={`h-full rounded-full ${pct>=80?'bg-gold-400':pct>=60?'bg-yellow-500':'bg-orange-500'}`}/>
      </div>
    </motion.div>
  )
}
