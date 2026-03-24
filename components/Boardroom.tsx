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
    // Keep last 100 messages
    const toSave = messages.slice(-100)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // ignore storage errors
  }
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load history
  useEffect(() => {
    setMessages(loadHistory())
  }, [])

  // Dark mode from system preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function togglePersona(id: string) {
    setSelectedPersonas((prev) => {
      const next = new Set(prev)
      if (next.has(id as PersonaId)) {
        // Don't deselect if it's the last one
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
    // Keep first one selected
    setSelectedPersonas(new Set([PERSONAS[0].id as PersonaId]))
  }

  const streamPersonaResponse = useCallback(
    async (userMessages: Array<{ role: string; content: string }>, personaId: PersonaId) => {
      const msgId = generateId()

      // Add empty streaming message
      setMessages((prev) => {
        const updated = [
          ...prev,
          {
            id: msgId,
            role: 'assistant' as const,
            content: '',
            personaId,
            personaName: PERSONAS.find((p) => p.id === personaId)?.name,
            timestamp: Date.now(),
            isStreaming: true,
          },
        ]
        return updated
      })

      setActivePersonaId(personaId)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: userMessages,
            personaId,
          }),
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') break
              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === msgId
                        ? { ...m, content: m.content + parsed.text }
                        : m
                    )
                  )
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        console.error('Stream error:', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: '⚠️ 응답 오류가 발생했습니다.', isStreaming: false }
              : m
          )
        )
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, isStreaming: false } : m))
        )
        setActivePersonaId(null)
      }
    },
    []
  )

  const handleSend = useCallback(
    async (text: string) => {
      if (isLoading) return

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }

      setMessages((prev) => {
        const updated = [...prev, userMsg]
        saveHistory(updated)
        return updated
      })

      setIsLoading(true)

      // Build conversation history for API (max 20 turns = 40 messages)
      const historyForApi = messages
        .slice(-39)
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))
      historyForApi.push({ role: 'user', content: text })

      const personasToQuery = PERSONAS.filter((p) =>
        selectedPersonas.has(p.id as PersonaId)
      )

      try {
        // Sequential streaming per persona
        for (const persona of personasToQuery) {
          await streamPersonaResponse(historyForApi, persona.id as PersonaId)
        }
      } finally {
        setIsLoading(false)
        setMessages((prev) => {
          saveHistory(prev)
          return prev
        })
      }
    },
    [isLoading, messages, selectedPersonas, streamPersonaResponse]
  )

  function clearHistory() {
    if (window.confirm('대화 내용을 모두 지우시겠습니까?')) {
      setMessages([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#f5f2ec] dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-black text-gray-900 dark:text-gray-100 leading-none">
                Shadowgram Boardroom
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                8유형 글로벌 비즈니스 가상 회의실
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DayCounter />

            <button
              onClick={() => setShowMinutes(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
            >
              📋 회의록
            </button>

            <button
              onClick={clearHistory}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="대화 초기화"
            >
              🗑
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Persona selector */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-start gap-4">
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-1">
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
            <div className="flex-shrink-0 flex flex-col gap-1 pt-0.5">
              <button
                onClick={selectAllPersonas}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors whitespace-nowrap"
              >
                전체 선택
              </button>
              <button
                onClick={deselectAllPersonas}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors whitespace-nowrap"
              >
                해제
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {selectedPersonas.size === PERSONAS.length
              ? '전체 8명 참여 중'
              : `${selectedPersonas.size}명 선택됨 — 선택된 페르소나만 응답합니다`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {messages.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="text-5xl">🏛️</div>
              <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">
                보드룸에 오신 것을 환영합니다
              </h2>
              <p className="text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
                Shadowgram 8유형 페르소나와 함께 글로벌 비즈니스 전략을 논의하세요.
                아래 빠른 안건을 클릭하거나 직접 안건을 입력하세요.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {PERSONAS.map((p) => (
                  <span
                    key={p.id}
                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name}
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
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
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
