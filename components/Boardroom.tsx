'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PERSONAS } from '@/lib/personas'
import PersonaAvatar from './PersonaAvatar'
import MessageBubble from './MessageBubble'
import InputPanel from './InputPanel'
import QuickActions from './QuickActions'
import MeetingMinutes from './MeetingMinutes'
import DayCounter from './DayCounter'
import type { Message, PersonaId } from '@/types'

const STORAGE_KEY = 'shadowgram-boardroom-history'
// API에 전달할 최대 히스토리 턴 수 (user+assistant 쌍)
const MAX_API_TURNS = 20

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadHistory(): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // ignore storage errors
  }
}

/** messages 배열을 Claude API 형식으로 변환 (최근 N턴, streaming 제외) */
function toApiMessages(
  messages: Message[],
  maxTurns = MAX_API_TURNS
): Array<{ role: string; content: string }> {
  const finished = messages.filter((m) => !m.isStreaming && m.content.trim())
  // 최근 maxTurns * 2 개 메시지만 (user+assistant 쌍)
  const sliced = finished.slice(-(maxTurns * 2))

  // Claude API는 user로 시작해야 함 — 첫 메시지가 assistant이면 제거
  const adjusted = [...sliced]
  while (adjusted.length > 0 && adjusted[0].role === 'assistant') {
    adjusted.shift()
  }

  return adjusted.map((m) => ({
    role: m.role,
    content: m.content,
  }))
}

/** 이번 라운드에서 앞서 응답한 페르소나들의 발언을 user 메시지 끝에 주입 */
function injectRoundContext(
  baseMessages: Array<{ role: string; content: string }>,
  prevResponses: Array<{ name: string; role: string; content: string }>
): Array<{ role: string; content: string }> {
  if (prevResponses.length === 0) return baseMessages

  const contextBlock = prevResponses
    .map((r) => `[${r.name} — ${r.role}]\n${r.content}`)
    .join('\n\n')

  const last = baseMessages[baseMessages.length - 1]
  const rest = baseMessages.slice(0, -1)

  return [
    ...rest,
    {
      role: last.role,
      content: `${last.content}\n\n---\n[이 라운드 앞선 발언들 — 참고하여 자신의 관점으로 응답하세요]\n\n${contextBlock}`,
    },
  ]
}

export default function Boardroom() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedPersonas, setSelectedPersonas] = useState<Set<PersonaId>>(
    new Set(PERSONAS.map((p) => p.id as PersonaId))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [activePersonaId, setActivePersonaId] = useState<PersonaId | null>(null)
  const [showMinutes, setShowMinutes] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [quickActionPrompt, setQuickActionPrompt] = useState('')
  const [meetingMode, setMeetingMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 히스토리 로드
  useEffect(() => {
    setMessages(loadHistory())
  }, [])

  // 시스템 다크모드 감지
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function toggleMeetingMode() {
    setMeetingMode((prev) => {
      if (!prev) {
        // 회의 모드 켤 때 전체 선택
        setSelectedPersonas(new Set(PERSONAS.map((p) => p.id as PersonaId)))
      }
      return !prev
    })
  }

  function togglePersona(id: string) {
    if (meetingMode) return // 회의 모드 중엔 개별 선택 불가
    setSelectedPersonas((prev) => {
      const next = new Set(prev)
      if (next.has(id as PersonaId)) {
        if (next.size <= 1) return prev
        next.delete(id as PersonaId)
      } else {
        next.add(id as PersonaId)
      }
      return next
    })
  }

  function selectAllPersonas() {
    setSelectedPersonas(new Set(PERSONAS.map((p) => p.id as PersonaId)))
  }

  function deselectAllPersonas() {
    setSelectedPersonas(new Set([PERSONAS[0].id as PersonaId]))
  }

  /**
   * 단일 페르소나 스트리밍 응답.
   * 완료된 최종 content 문자열을 반환한다.
   */
  const streamPersonaResponse = useCallback(
    async (
      apiMessages: Array<{ role: string; content: string }>,
      personaId: PersonaId,
      isMeetingMode = false
    ): Promise<string> => {
      const msgId = generateId()
      const persona = PERSONAS.find((p) => p.id === personaId)!

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant' as const,
          content: '',
          personaId,
          personaName: persona.name,
          timestamp: Date.now(),
          isStreaming: true,
        },
      ])

      setActivePersonaId(personaId)

      let accumulated = ''

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, personaId, meetingMode: isMeetingMode }),
        })

        if (!res.ok || !res.body) {
          throw new Error(`API error: ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                accumulated += parsed.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId ? { ...m, content: accumulated } : m
                  )
                )
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        console.error(`[${personaId}] stream error:`, err)
        const errMsg = '⚠️ 응답 오류가 발생했습니다.'
        accumulated = errMsg
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: errMsg, isStreaming: false } : m
          )
        )
        return accumulated
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, isStreaming: false } : m))
        )
        setActivePersonaId(null)
      }

      return accumulated
    },
    []
  )

  /** 회의 모드: 8명 발언 후 자동 요약 생성 */
  const streamMeetingSummary = useCallback(
    async (
      question: string,
      roundResponses: Array<{ name: string; role: string; content: string }>
    ): Promise<void> => {
      const msgId = generateId()

      const summaryContext = `[회의 주제]\n${question}\n\n[페르소나 발언]\n\n${roundResponses
        .map((r) => `### ${r.name} (${r.role})\n${r.content}`)
        .join('\n\n')}\n\n---\n위 발언들을 바탕으로 구조화된 회의 요약을 작성해주세요.`

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant' as const,
          content: '',
          personaName: '최적 결론',
          timestamp: Date.now(),
          isStreaming: true,
          isSummary: true,
        },
      ])

      let accumulated = ''

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: summaryContext }],
            personaId: 'summary',
          }),
        })

        if (!res.ok || !res.body) throw new Error(`Summary API error: ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                accumulated += parsed.text
                setMessages((prev) =>
                  prev.map((m) => (m.id === msgId ? { ...m, content: accumulated } : m))
                )
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.error('[summary] stream error:', err)
        accumulated = '⚠️ 요약 생성 오류가 발생했습니다.'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: accumulated, isStreaming: false } : m
          )
        )
        return
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, isStreaming: false } : m))
        )
      }
    },
    []
  )

  const handleSend = useCallback(
    async (text: string) => {
      if (isLoading) return

      // 1. 사용자 메시지 즉시 추가
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }

      // 최신 messages snapshot을 ref로 참조
      let latestMessages: Message[] = []
      setMessages((prev) => {
        latestMessages = [...prev, userMsg]
        saveHistory(latestMessages)
        return latestMessages
      })

      setIsLoading(true)

      // 2. 기본 API 히스토리 구성 (사용자 메시지 포함, 전체 히스토리 기반)
      // 직전 state에서 읽으므로 userMsg 추가 전 messages 사용
      const baseApiMessages = [
        ...toApiMessages(messages),
        { role: 'user', content: text },
      ]

      // 회의 모드: 전체 8명 강제 사용
      const personasToQuery = meetingMode
        ? PERSONAS
        : PERSONAS.filter((p) => selectedPersonas.has(p.id as PersonaId))

      // 3. 이번 라운드 누적 응답 (회의 모드: 순서대로 앞선 발언 컨텍스트 제공)
      const roundResponses: Array<{
        name: string
        role: string
        content: string
      }> = []

      try {
        for (const persona of personasToQuery) {
          // 앞선 페르소나 응답을 컨텍스트에 주입
          const apiMessages = injectRoundContext(baseApiMessages, roundResponses)

          const content = await streamPersonaResponse(
            apiMessages,
            persona.id as PersonaId,
            meetingMode
          )

          if (content && !content.startsWith('⚠️')) {
            roundResponses.push({
              name: persona.name,
              role: persona.role,
              content,
            })
          }
        }
        // 회의 모드: 모든 페르소나 응답 후 자동 요약 생성
        if (meetingMode && roundResponses.length > 0) {
          await streamMeetingSummary(text, roundResponses)
        }
      } finally {
        setIsLoading(false)
        // 4. 모든 응답 완료 후 localStorage 최종 저장
        setMessages((prev) => {
          saveHistory(prev)
          return prev
        })
      }
    },
    [isLoading, meetingMode, messages, selectedPersonas, streamPersonaResponse, streamMeetingSummary]
  )

  function clearHistory() {
    if (window.confirm('대화 내용을 모두 지우시겠습니까?\n(이 작업은 되돌릴 수 없습니다)')) {
      setMessages([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const msgCount = messages.filter((m) => !m.isStreaming).length

  return (
    <div className="flex flex-col h-screen bg-[#f4f1eb] dark:bg-gray-950 transition-colors duration-200">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo + title */}
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">🏛️</span>
            <div>
              <h1 className="text-sm font-black text-gray-900 dark:text-gray-100 leading-none tracking-tight">
                Shadowgram Boardroom
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-none">
                8유형 AI 가상 회의실{msgCount > 0 && ` · ${msgCount}개 메시지`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <DayCounter />

            <button
              onClick={toggleMeetingMode}
              disabled={isLoading}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                meetingMode
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              {meetingMode ? '🔴 회의 중' : '🏛️ 회의 모드'}
            </button>

            <button
              onClick={() => setShowMinutes(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
            >
              📋 회의록
            </button>

            <button
              onClick={clearHistory}
              disabled={isLoading || messages.length === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="대화 초기화"
            >
              🗑️
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Persona selector bar */}
      {meetingMode ? (
        <div className="flex-shrink-0 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900">
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">🏛️ 회의 모드</span>
            <span className="text-amber-500 dark:text-amber-600 text-xs hidden sm:block">
              8명 전원이 순서대로 짧게 답변 → 최적 결론 자동 도출
            </span>
            <div className="flex gap-1 ml-auto">
              {PERSONAS.map((p) => (
                <div
                  key={p.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white transition-all ${
                    activePersonaId === p.id ? 'scale-125 shadow-md' : ''
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                >
                  {p.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-1 min-w-max">
                  {PERSONAS.map((persona) => (
                    <PersonaAvatar
                      key={persona.id}
                      persona={persona}
                      isSelected={selectedPersonas.has(persona.id as PersonaId)}
                      isActive={activePersonaId === persona.id}
                      onToggle={togglePersona}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 flex gap-2 border-l border-gray-100 dark:border-gray-800 pl-3">
                <button
                  onClick={selectAllPersonas}
                  className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors whitespace-nowrap"
                >
                  전체
                </button>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <button
                  onClick={deselectAllPersonas}
                  className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  해제
                </button>
              </div>
            </div>
            {selectedPersonas.size < PERSONAS.length && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 pl-1">
                {selectedPersonas.size}명 선택됨
              </p>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-20 space-y-5">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white dark:bg-gray-800 shadow-lg text-4xl">
                🏛️
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  보드룸에 오신 것을 환영합니다
                </h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Shadowgram 8유형 페르소나와 함께<br />글로벌 비즈니스 전략을 논의하세요
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {PERSONAS.map((p) => (
                  <span
                    key={p.id}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: p.color + 'cc' }}
                  >
                    {p.icon} {p.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 pt-2 pb-4 space-y-2">
          <QuickActions
            onSelect={(prompt) => setQuickActionPrompt(prompt)}
            disabled={isLoading}
          />
          <InputPanel
            onSend={handleSend}
            isLoading={isLoading}
            initialValue={quickActionPrompt}
            onInitialValueUsed={() => setQuickActionPrompt('')}
          />
        </div>
      </div>

      {/* Meeting minutes modal */}
      {showMinutes && (
        <MeetingMinutes
          messages={messages}
          onClose={() => setShowMinutes(false)}
        />
      )}
    </div>
  )
}
