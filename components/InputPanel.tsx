'use client'

import { useRef, useState, useEffect } from 'react'

interface InputPanelProps {
  onSend: (text: string) => void
  isLoading: boolean
  initialValue?: string
  onInitialValueUsed?: () => void
}

export default function InputPanel({
  onSend,
  isLoading,
  initialValue = '',
  onInitialValueUsed,
}: InputPanelProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialValue) {
      setText(initialValue)
      onInitialValueUsed?.()
      textareaRef.current?.focus()
    }
  }, [initialValue, onInitialValueUsed])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasText = text.trim().length > 0

  return (
    <div
      className={`
        flex items-end gap-2 rounded-2xl border
        bg-white dark:bg-gray-800
        transition-all duration-200
        ${hasText
          ? 'border-gray-400 dark:border-gray-500 shadow-md'
          : 'border-gray-200 dark:border-gray-600 shadow-sm'
        }
      `}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="안건을 입력하세요... (Enter 전송 · Shift+Enter 줄바꿈)"
        rows={1}
        disabled={isLoading}
        className="
          flex-1 resize-none rounded-2xl
          bg-transparent text-gray-800 dark:text-gray-100
          px-4 py-3.5 text-sm leading-relaxed
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          focus:outline-none
          disabled:opacity-60 disabled:cursor-not-allowed
          min-h-[52px] max-h-[160px]
        "
      />
      <div className="flex-shrink-0 p-2">
        <button
          onClick={handleSend}
          disabled={!hasText || isLoading}
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center
            transition-all duration-150
            ${hasText && !isLoading
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 shadow-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
          aria-label="전송"
        >
          {isLoading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
