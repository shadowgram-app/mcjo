'use client'

import { useState } from 'react'
import type { Message } from '@/types'
import { PERSONA_MAP } from '@/lib/personas'

interface MeetingMinutesProps {
  messages: Message[]
  onClose: () => void
}

export default function MeetingMinutes({ messages, onClose }: MeetingMinutesProps) {
  const [copied, setCopied] = useState(false)

  function generateMarkdown() {
    const now = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())

    let md = `# Shadowgram 보드룸 회의록\n\n`
    md += `**일시**: ${now}\n`
    md += `**참석자**: Shadowgram 8유형 페르소나\n\n`
    md += `---\n\n`

    const userMessages = messages.filter((m) => m.role === 'user')
    if (userMessages.length > 0) {
      md += `## 주요 안건\n\n`
      userMessages.forEach((m, i) => {
        md += `${i + 1}. ${m.content}\n`
      })
      md += `\n---\n\n`
    }

    md += `## 전체 대화록\n\n`

    // 요약 메시지 먼저 찾아서 맨 위에 배치
    const summaryMsg = messages.find((m) => m.isSummary)
    if (summaryMsg) {
      md += `## ✅ 최적 결론\n\n${summaryMsg.content}\n\n---\n\n`
    }

    md += `## 전체 대화록\n\n`

    for (const msg of messages) {
      if (msg.isSummary) continue // 요약은 위에서 이미 출력
      if (msg.role === 'user') {
        md += `### 🙋 민철\n\n${msg.content}\n\n`
      } else {
        const persona = msg.personaId ? PERSONA_MAP[msg.personaId] : null
        const name = persona ? `${persona.name} (${persona.role})` : '페르소나'
        md += `### ${name}\n\n${msg.content}\n\n`
      }
      md += `---\n\n`
    }

    return md
  }

  function handleDownload() {
    const md = generateMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shadowgram-boardroom-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCopy() {
    const md = generateMarkdown()
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const assistantMessages = messages.filter((m) => m.role === 'assistant')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">회의록</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              총 {messages.length}개 메시지 · 페르소나 응답 {assistantMessages.length}개
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-center py-8">
              아직 대화 내용이 없습니다.
            </p>
          ) : (
            messages.map((msg) => {
              const persona = msg.personaId ? PERSONA_MAP[msg.personaId] : null

              if (msg.isSummary) {
                return (
                  <div key={msg.id} className="text-sm rounded-xl border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                    <div className="px-3 py-1.5 bg-amber-400 dark:bg-amber-500">
                      <span className="text-white font-bold text-xs">✅ 최적 결론</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-6 px-3 py-2">
                      {msg.content}
                    </p>
                  </div>
                )
              }

              return (
                <div key={msg.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'user' ? (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        🙋 민철
                      </span>
                    ) : (
                      <span
                        className="font-semibold"
                        style={{ color: persona?.color ?? '#9ca3af' }}
                      >
                        {persona?.name ?? '?'} ({persona?.role})
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {msg.content}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? '✓ 복사됨' : '📋 클립보드 복사'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm font-semibold hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            ⬇️ 마크다운 다운로드
          </button>
        </div>
      </div>
    </div>
  )
}
