'use client'

import type { Persona } from '@/types'

interface PersonaAvatarProps {
  persona: Persona
  isSelected: boolean
  isActive?: boolean
  onToggle: (id: string) => void
  size?: 'sm' | 'md' | 'lg'
}

export default function PersonaAvatar({
  persona,
  isSelected,
  isActive = false,
  onToggle,
  size = 'md',
}: PersonaAvatarProps) {
  const avatarSize = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
  }[size]

  return (
    <button
      onClick={() => onToggle(persona.id)}
      title={`${persona.name} — ${persona.role}`}
      className={`
        relative flex flex-col items-center gap-1 px-1 py-1 rounded-xl
        transition-all duration-200 select-none
        ${isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-70'}
      `}
    >
      {/* Avatar circle */}
      <div
        className={`
          relative flex items-center justify-center font-black text-white rounded-full
          transition-all duration-200
          ${avatarSize}
          ${isActive ? 'scale-110' : isSelected ? 'scale-100' : ''}
        `}
        style={{
          backgroundColor: isSelected ? persona.color : '#d1d5db',
          boxShadow: isSelected
            ? isActive
              ? `0 0 0 3px ${persona.color}55, 0 4px 14px ${persona.color}66`
              : `0 2px 8px ${persona.color}44`
            : undefined,
        }}
      >
        <span style={{ color: isSelected ? '#fff' : '#9ca3af' }}>
          {persona.icon}
        </span>

        {/* Active pulse ring */}
        {isActive && (
          <>
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: persona.color }}
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800"
              style={{ backgroundColor: persona.color }}
            />
          </>
        )}
      </div>

      {/* Name */}
      <p
        className={`
          text-[10px] font-bold leading-tight tracking-tight
          ${isSelected ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
        `}
      >
        {persona.name}
      </p>
    </button>
  )
}
