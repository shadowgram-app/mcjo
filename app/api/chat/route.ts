import Anthropic from '@anthropic-ai/sdk'
import { PERSONA_MAP } from '@/lib/personas'
import { buildSystemPrompt } from '@/lib/prompts'
import type { PersonaId } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const runtime = 'edge'

const SUMMARY_SYSTEM_PROMPT = `당신은 Shadowgram 보드룸 회의 서기입니다.
8명의 페르소나가 논의한 회의 내용을 구조화된 요약으로 정리하세요.

반드시 아래 형식을 사용하세요:

## 📋 회의 요약

### 핵심 주제
[한 줄 요약]

### 페르소나별 핵심 포인트
[각 페르소나의 핵심 주장 — 페르소나명: 1-2문장 요약]

### 합의된 액션 아이템
□ [실행 가능한 다음 단계]
□ ...

### 주요 리스크
[Devil이 지적한 핵심 리스크 1-3가지]

### 종합 판단
[전체 논의를 아우르는 통찰 1-2단락]

한국어로 작성. 간결하고 실용적으로.`

export async function POST(req: Request) {
  try {
    const { messages, personaId } = await req.json()

    if (!personaId) {
      return new Response(JSON.stringify({ error: 'personaId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Special case: meeting summary
    let systemPrompt: string
    let maxTokens = 1000

    if (personaId === 'summary') {
      systemPrompt = SUMMARY_SYSTEM_PROMPT
      maxTokens = 1500
    } else {
      const persona = PERSONA_MAP[personaId as PersonaId]
      if (!persona) {
        return new Response(JSON.stringify({ error: 'Invalid personaId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      systemPrompt = buildSystemPrompt(persona)
    }

    // Keep only the last 20 turns
    const recentMessages = messages.slice(-40)

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
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
