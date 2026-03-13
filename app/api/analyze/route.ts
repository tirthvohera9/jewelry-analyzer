import { NextRequest } from 'next/server'
import { runPipeline } from '@/lib/ai/pipeline'
import type { OptionalInputs } from '@/types/analysis'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('image') as File|null
  if (!file) return new Response('No image', { status:400 })
  if (file.size > 10*1024*1024) return new Response('Image too large', { status:413 })

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  const mediaType = file.type||'image/jpeg'
  const optStr = formData.get('optionalInputs')
  const optionalInputs: OptionalInputs = optStr ? JSON.parse(optStr as string) : {}

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runPipeline(base64, mediaType, optionalInputs)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } catch(err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type:'error', data:{ message:(err as Error).message } })}\n\n`))
      } finally { controller.close() }
    }
  })
  return new Response(stream, { headers:{ 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive' } })
}
