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

  return (
    <div className="flex gap-3 items-end">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="안건을 입력하세요... (Shift+Enter: 줄바꿈)"
        rows={1}
        disabled={isLoading}
        className="
          flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-600
          bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
          px-4 py-3 text-base leading-relaxed
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-150
          min-h-[48px] max-h-[160px]
        "
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || isLoading}
        className="
          flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
          bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800
          hover:bg-gray-700 dark:hover:bg-gray-300
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-150 shadow-sm
        "
        aria-label="전송"
      >
        {isLoading ? (
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}
