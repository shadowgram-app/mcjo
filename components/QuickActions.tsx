'use client'

import { QUICK_ACTIONS } from '@/lib/personas'

interface QuickActionsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

const ACTION_ICONS: Record<string, string> = {
  '브라질 런칭 전략': '🇧🇷',
  '국내 결제 승인 대기 중 할 일': '⏳',
  '콘텐츠 현지화': '🌐',
  '수익 구조 검토': '📊',
  '리스크 확인': '⚠️',
  '오늘 실행 계획': '✅',
}

export default function QuickActions({ onSelect, disabled = false }: QuickActionsProps) {
  return (
    <div className="w-full">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onSelect(action.prompt)}
            disabled={disabled}
            className="
              flex-shrink-0 flex items-center gap-1.5
              px-3 py-1.5 rounded-full text-xs font-medium
              bg-white dark:bg-gray-700/80
              text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-600
              hover:text-gray-800 dark:hover:text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150
              border border-gray-200 dark:border-gray-600
              shadow-sm hover:shadow
              whitespace-nowrap
            "
          >
            <span>{ACTION_ICONS[action.label] ?? '💬'}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
