const ROUND_BRILLIANT: [number, number][] = [
  [1.0,0.005],[1.2,0.009],[1.3,0.01],[1.5,0.015],[1.7,0.02],[1.8,0.025],
  [2.0,0.03],[2.2,0.04],[2.5,0.06],[2.7,0.07],[3.0,0.11],[3.25,0.14],
  [3.5,0.17],[3.75,0.21],[4.0,0.25],[4.25,0.28],[4.5,0.36],[4.75,0.44],
  [5.0,0.50],[5.2,0.55],[5.5,0.66],[5.75,0.75],[6.0,0.84],[6.25,0.93],
  [6.5,1.00],[6.8,1.15],[7.0,1.25],[7.3,1.50],[7.75,1.75],[8.0,2.00],
  [8.5,2.43],[9.0,2.75],[9.35,3.00],[10.0,3.87],[10.8,5.00],
]
const PRINCESS: [number, number][] = [
  [1.5,0.02],[2.0,0.05],[2.5,0.10],[3.0,0.18],[3.5,0.28],[4.0,0.40],
  [4.5,0.56],[5.0,0.68],[5.5,0.75],[6.0,1.00],[6.5,1.30],[7.0,1.60],
]
const OVAL: [number, number][] = [[5,0.25],[6,0.50],[7,0.75],[8,1.00],[9,1.50],[10,2.00]]
const TABLES: Record<string, [number,number][]> = {
  round_brilliant: ROUND_BRILLIANT, princess: PRINCESS, oval: OVAL,
  pear: OVAL, marquise: OVAL, cushion: PRINCESS,
  emerald_cut: PRINCESS, asscher: PRINCESS, radiant: PRINCESS,
}
function interpolate(table: [number,number][], sizeMm: number): number {
  if (sizeMm <= table[0][0]) return table[0][1]
  if (sizeMm >= table[table.length-1][0]) return table[table.length-1][1]
  for (let i=0;i<table.length-1;i++) {
    const [x0,y0]=table[i],[x1,y1]=table[i+1]
    if (sizeMm>=x0&&sizeMm<=x1) return y0+(sizeMm-x0)/(x1-x0)*(y1-y0)
  }
  return 0
}
export function sizeToCarats(cut: string, diameterMm: number): number {
  return interpolate(TABLES[cut] ?? ROUND_BRILLIANT, diameterMm)
}
export function calcSettingMetal(setting: string, prongCount: number, stoneDiameterMm: number, density: number): number {
  if (setting==='prong') return Math.PI*(0.025)**2*2.0*prongCount*density
  if (setting==='bezel') return (Math.PI*stoneDiameterMm/10)*0.15*0.05*density
  if (setting==='pave') return 0.04*density/15.58
  return 0.10
}
