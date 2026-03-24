'use client'

import { PERSONA_MAP } from '@/lib/personas'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-black/8 dark:bg-white/10 px-1.5 py-0.5 rounded text-[0.85em] font-mono">$1</code>')
    .replace(/^(#{1,3})\s(.+)$/gm, (_, hashes, content) => {
      const level = hashes.length
      const sizes = ['text-base font-bold mt-3 mb-1', 'text-sm font-bold mt-2 mb-1', 'text-sm font-semibold mt-2 mb-0.5']
      return `<p class="${sizes[level - 1]}">${content}</p>`
    })
    .replace(/^[-•]\s(.+)$/gm, '<li class="ml-4 list-disc leading-relaxed">$1</li>')
    .replace(/^(\d+)\.\s(.+)$/gm, '<li class="ml-4 list-decimal leading-relaxed">$2</li>')
    .replace(/^□\s(.+)$/gm, '<li class="ml-4 list-none flex items-start gap-2"><span class="mt-0.5 opacity-60">□</span><span>$1</span></li>')
    .replace(/\n/g, '<br />')
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] md:max-w-[68%]">
          <div className="bg-gray-900 dark:bg-gray-700 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-1 px-1">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    )
  }

  const persona = message.personaId ? PERSONA_MAP[message.personaId] : null

  // 회의 요약 메시지 특별 렌더링
  if (message.isSummary) {
    return (
      <div className="my-2">
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-gradient-to-b from-amber-50 to-amber-50/50 dark:from-amber-950/50 dark:to-amber-950/20 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-400/90 dark:bg-amber-600/80">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-white font-bold text-sm">최적 결론</span>
            </div>
            <span className="text-amber-100 text-[10px]">{formatTime(message.timestamp)}</span>
          </div>
          <div className="px-5 py-4">
            {message.isStreaming && message.content === '' ? (
              <div className="flex gap-1.5 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <div
                className="text-sm leading-relaxed text-gray-800 dark:text-gray-100"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
            )}
            {message.isStreaming && message.content !== '' && (
              <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-text-bottom bg-amber-400" />
            )}
          </div>
        </div>
      </div>
    )
  }

  // 일반 페르소나 메시지
  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {persona ? (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm transition-all ${
              message.isStreaming ? 'scale-110' : ''
            }`}
            style={{
              backgroundColor: persona.color,
              boxShadow: message.isStreaming ? `0 0 0 3px ${persona.color}33` : undefined,
            }}
          >
            {persona.icon}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-[84%] md:max-w-[76%]">
        {/* Persona name row */}
        {persona && (
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-xs font-bold" style={{ color: persona.color }}>
              {persona.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{persona.role}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className="rounded-2xl rounded-tl-md px-4 py-3 bg-white dark:bg-gray-800 shadow-sm border-l-[3px]"
          style={{ borderLeftColor: persona?.color ?? '#e5e7eb' }}
        >
          {message.isStreaming && message.content === '' ? (
            <div className="flex gap-1.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: persona?.color ?? '#9ca3af', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: persona?.color ?? '#9ca3af', animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: persona?.color ?? '#9ca3af', animationDelay: '300ms' }} />
            </div>
          ) : (
            <div
              className="text-sm leading-relaxed text-gray-800 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )}
          {message.isStreaming && message.content !== '' && (
            <span
              className="inline-block w-0.5 h-[1em] ml-0.5 animate-pulse align-text-bottom"
              style={{ backgroundColor: persona?.color ?? '#9ca3af' }}
            />
          )}
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}
