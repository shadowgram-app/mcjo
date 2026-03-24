import Anthropic from '@anthropic-ai/sdk'
import { PERSONA_MAP } from '@/lib/personas'
import { buildSystemPrompt } from '@/lib/prompts'
import type { PersonaId } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const runtime = 'edge'

const SUMMARY_SYSTEM_PROMPT = `당신은 Shadowgram 보드룸의 최종 의사결정자입니다.
8명의 페르소나가 각자의 관점에서 발언한 내용을 바탕으로 **최적 결론**을 도출하세요.

단순 요약이 아닙니다. 지금 당장 실행해야 할 최선의 선택을 명확히 제시하세요.

반드시 아래 형식을 사용하세요:

## ✅ 최적 결론

### 결론
[한 문장으로 — "지금 해야 할 최선의 선택은 OOO이다"]

### 근거
[8명의 발언에서 가장 중요한 인사이트 3가지 — 번호로]

### 즉시 실행 액션
□ [오늘 또는 이번 주 내 실행할 것]
□ ...

### 경계해야 할 리스크
[가장 치명적인 리스크 1-2가지만]

한국어로. 군더더기 없이 명확하게.`

export async function POST(req: Request) {
  try {
    const { messages, personaId, meetingMode } = await req.json()

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
      // 회의 모드: 간결한 응답 요구
      if (meetingMode) {
        systemPrompt += '\n\n## 회의 모드\n지금은 빠른 회의입니다. 핵심 관점 1-2문장만 말하세요. 길게 쓰지 마세요.'
        maxTokens = 300
      }
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
