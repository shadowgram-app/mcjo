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
    .replace(/`(.*?)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/^(#{1,3})\s(.+)$/gm, (_, hashes, content) => {
      const level = hashes.length
      const sizes = ['text-lg font-bold', 'text-base font-bold', 'text-sm font-semibold']
      return `<p class="${sizes[level - 1]} mt-2 mb-1">${content}</p>`
    })
    .replace(/^[-•]\s(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\.\s(.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/^□\s(.+)$/gm, '<li class="ml-4 list-none flex items-start gap-2"><span>□</span><span>$1</span></li>')
    .replace(/\n/g, '<br />')
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="bg-gray-800 dark:bg-gray-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
            <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1 px-1">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    )
  }

  const persona = message.personaId ? PERSONA_MAP[message.personaId] : null

  return (
    <div className="flex gap-3 animate-slide-up">
      {/* Persona icon */}
      <div className="flex-shrink-0 mt-0.5">
        {persona ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm"
            style={{ backgroundColor: persona.color }}
          >
            {persona.icon}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-[85%] md:max-w-[75%]">
        {/* Persona name */}
        {persona && (
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className="text-sm font-bold"
              style={{ color: persona.color }}
            >
              {persona.name}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{persona.role}</span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border-l-4 bg-white dark:bg-gray-800"
          style={{
            borderLeftColor: persona?.color ?? '#e5e7eb',
          }}
        >
          {message.isStreaming && message.content === '' ? (
            <div className="flex gap-1 py-1">
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: persona?.color ?? '#9ca3af', animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: persona?.color ?? '#9ca3af', animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: persona?.color ?? '#9ca3af', animationDelay: '300ms' }}
              />
            </div>
          ) : (
            <div
              className="text-base leading-relaxed text-gray-800 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )}
          {message.isStreaming && message.content !== '' && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-text-bottom"
              style={{ backgroundColor: persona?.color ?? '#9ca3af' }}
            />
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}
