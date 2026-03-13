'use client'
import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'

interface Props { onFileSelected: (file: File, preview: string) => void; disabled?: boolean }

export default function DropZone({ onFileSelected, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onFileSelected(file, e.target?.result as string)
    reader.readAsDataURL(file)
  }, [onFileSelected])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }, [handleFile])
  return (
    <motion.label
      className={`relative flex flex-col items-center justify-center w-full min-h-64 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${dragging ? 'border-gold-400 bg-dark-800/60' : 'border-dark-700 bg-dark-900/40 hover:border-gold-500/60'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      whileHover={{ scale: 1.01 }}
    >
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f=e.target.files?.[0]; if(f) handleFile(f) }} disabled={disabled} />
      <div className="flex flex-col items-center gap-4 pointer-events-none px-6 text-center">
        <motion.div animate={{ scale: dragging ? 1.2 : 1 }} className="w-16 h-16 rounded-full border border-gold-500/40 flex items-center justify-center">
          <svg className="w-8 h-8 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </motion.div>
        <div>
          <p className="text-dark-50 font-medium text-lg">Drop your jewelry photo here</p>
          <p className="text-dark-400 text-sm mt-1">or click to browse — JPG, PNG, WEBP up to 10MB</p>
        </div>
        <p className="text-gold-500/60 text-xs">Best results: clear, well-lit, single piece against plain background</p>
      </div>
    </motion.label>
  )
}
