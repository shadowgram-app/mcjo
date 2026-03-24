import Anthropic from '@anthropic-ai/sdk'
import { PERSONA_MAP } from '@/lib/personas'
import { buildSystemPrompt } from '@/lib/prompts'
import type { PersonaId } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages, personaId } = await req.json()

    if (!personaId) {
      return new Response(JSON.stringify({ error: 'personaId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const persona = PERSONA_MAP[personaId as PersonaId]
    if (!persona) {
      return new Response(JSON.stringify({ error: 'Invalid personaId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = buildSystemPrompt(persona)

    // Keep only the last 20 turns
    const recentMessages = messages.slice(-40)

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: recentMessages,
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ text: chunk.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
