'use client'

import { useEffect, useState } from 'react'

// Payment approval was pending as of 2026-03-24 with 4 weeks (28 days) to go
// Target date: 2026-04-21
const TARGET_DATE = new Date('2026-04-21T00:00:00+09:00')

export default function DayCounter() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    function calc() {
      const now = new Date()
      const diff = TARGET_DATE.getTime() - now.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      setDaysLeft(days)
    }
    calc()
    const timer = setInterval(calc, 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  if (daysLeft === null) return null

  const isOverdue = daysLeft < 0
  const isDue = daysLeft === 0

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold
        ${isOverdue
          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          : isDue
          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
        }
      `}
    >
      <span className="text-base">
        {isOverdue ? '⚠️' : isDue ? '🎉' : '⏳'}
      </span>
      <span>
        {isOverdue
          ? `D+${Math.abs(daysLeft)} 결제 승인 지연`
          : isDue
          ? '결제 승인 D-DAY!'
          : `결제 승인 D-${daysLeft}`}
      </span>
    </div>
  )
}
