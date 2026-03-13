'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { JewelryAnalysis } from '@/types/analysis'

function JewelryMesh({ analysis }: { analysis: JewelryAnalysis }) {
  const { dimensions, jewelryType } = analysis
  const mat = { color:'#D4AF37', metalness:0.9, roughness:0.1 }
  if (jewelryType==='ring') {
    const outerR = ((dimensions.widthMm||17)/2+(dimensions.wallThicknessMm||1.5))/10
    const innerR = (dimensions.widthMm||17)/2/10
    const tubeR = (outerR-innerR)/2
    const torusR = (outerR+innerR)/2
    return <mesh><torusGeometry args={[torusR,tubeR,32,64]}/><meshStandardMaterial {...mat}/></mesh>
  }
  const L=(dimensions.lengthMm||20)/10, W=(dimensions.widthMm||5)/10, H=(dimensions.heightMm||3)/10
  return <mesh><boxGeometry args={[L,H,W]}/><meshStandardMaterial {...mat}/></mesh>
}

export default function Viewer3D({ analysis }: { analysis: JewelryAnalysis }) {
  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-dark-900 border border-dark-700">
      <Canvas camera={{ position:[0,0,5], fov:45 }} gl={{ antialias:true }}>
        <ambientLight intensity={0.3}/>
        <pointLight position={[5,5,5]} intensity={1.5} color="#D4AF37"/>
        <pointLight position={[-5,-5,5]} intensity={0.5}/>
        <Suspense fallback={null}>
          <JewelryMesh analysis={analysis}/>
          <Environment preset="studio"/>
        </Suspense>
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={2}/>
      </Canvas>
    </div>
  )
}
