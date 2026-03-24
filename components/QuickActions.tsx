'use client'

import { QUICK_ACTIONS } from '@/lib/personas'

interface QuickActionsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export default function QuickActions({ onSelect, disabled = false }: QuickActionsProps) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        빠른 안건
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onSelect(action.prompt)}
            disabled={disabled}
            className="
              px-3 py-1.5 rounded-full text-sm font-medium
              bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-150
              border border-gray-200 dark:border-gray-600
            "
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
