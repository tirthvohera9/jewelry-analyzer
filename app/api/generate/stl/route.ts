import { NextRequest } from 'next/server'
import type { JewelryAnalysis } from '@/types/analysis'

function writeBinarySTL(triangles: number[][]): Uint8Array {
  const buffer = new ArrayBuffer(80+4+triangles.length*50)
  const view = new DataView(buffer)
  const h = 'JewelCAD Generated STL'
  for (let i=0;i<h.length;i++) view.setUint8(i,h.charCodeAt(i))
  view.setUint32(80,triangles.length,true)
  let off=84
  for (const tri of triangles) {
    for (let i=0;i<12;i++) view.setFloat32(off+i*4,tri[i],true)
    view.setUint16(off+48,0,true); off+=50
  }
  return new Uint8Array(buffer)
}

function ringTriangles(innerR: number, outerR: number, height: number): number[][] {
  const tris: number[][]=[], segs=64
  for (let i=0;i<segs;i++) {
    const a0=(i/segs)*Math.PI*2, a1=((i+1)/segs)*Math.PI*2
    const nx=Math.cos((a0+a1)/2), ny=Math.sin((a0+a1)/2)
    const p=[[Math.cos(a0)*outerR,Math.sin(a0)*outerR,0],[Math.cos(a1)*outerR,Math.sin(a1)*outerR,0],[Math.cos(a1)*outerR,Math.sin(a1)*outerR,height],[Math.cos(a0)*outerR,Math.sin(a0)*outerR,height]]
    tris.push([nx,ny,0,...p[0],...p[1],...p[2]])
    tris.push([nx,ny,0,...p[0],...p[2],...p[3]])
  }
  return tris
}

function boxTriangles(L: number, W: number, H: number): number[][] {
  const v=[[0,0,0],[L,0,0],[L,W,0],[0,W,0],[0,0,H],[L,0,H],[L,W,H],[0,W,H]]
  const faces=[[0,1,2,0,0,-1],[0,2,3,0,0,-1],[4,6,5,0,0,1],[4,7,6,0,0,1],[0,5,1,0,-1,0],[0,4,5,0,-1,0],[2,6,7,0,1,0],[2,7,3,0,1,0],[0,7,4,-1,0,0],[0,3,7,-1,0,0],[1,5,6,1,0,0],[1,6,2,1,0,0]]
  return faces.map(([a,b,c,nx,ny,nz])=>[nx,ny,nz,...v[a],...v[b],...v[c]])
}

export async function POST(req: NextRequest) {
  const { analysis }: { analysis: JewelryAnalysis } = await req.json()
  const { dimensions, jewelryType } = analysis
  const tris = jewelryType==='ring'
    ? ringTriangles(dimensions.widthMm/2/10||0.85, (dimensions.widthMm/2+(dimensions.wallThicknessMm||1.5))/10, (dimensions.heightMm||3)/10)
    : boxTriangles((dimensions.lengthMm||20)/10,(dimensions.widthMm||5)/10,(dimensions.heightMm||3)/10)
  const stl = writeBinarySTL(tris)
  return new Response(stl.buffer as ArrayBuffer, { headers:{ 'Content-Type':'application/octet-stream', 'Content-Disposition':`attachment; filename="jewelry-${analysis.id}.stl"` } })
}
