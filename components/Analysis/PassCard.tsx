'use client'
import { motion } from 'framer-motion'
interface Props { passNumber: number; passName: string; status: 'pending'|'running'|'complete'|'error' }
const icons = ['🔍','⚗️','💎','📐','✨']
export default function PassCard({ passNumber, passName, status }: Props) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity: status!=='pending'?1:0.3, y:0 }}
      className="card-dark rounded-xl px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0
        ${status==='complete'?'bg-gold-500/20 border border-gold-500/50':status==='running'?'bg-blue-500/20 border border-blue-500/50 animate-pulse':'bg-dark-800 border border-dark-700'}`}>
        {status==='complete'?'✓':icons[passNumber-1]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-dark-50 font-medium text-sm">{passName}</p>
        <p className="text-dark-400 text-xs mt-0.5">{status==='running'?'Analyzing...':status==='complete'?'Complete':status==='error'?'Error':'Waiting...'}</p>
      </div>
      {status==='running'&&(
        <div className="flex gap-1">
          {[0,1,2].map(i=>(
            <motion.div key={i} className="w-1.5 h-1.5 bg-gold-400 rounded-full"
              animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:1.2, repeat:Infinity, delay:i*0.2 }} />
          ))}
        </div>
      )}
    </motion.div>
  )
}
