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
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-16 h-16 text-base',
  }

  const labelSize = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  }

  return (
    <button
      onClick={() => onToggle(persona.id)}
      className="flex flex-col items-center gap-1.5 group"
      title={`${persona.name} — ${persona.role}`}
    >
      <div
        className={`
          ${sizeClasses[size]}
          relative rounded-full flex items-center justify-center font-bold
          transition-all duration-200 cursor-pointer select-none
          ${isSelected
            ? 'ring-2 ring-offset-2 shadow-lg scale-105'
            : 'opacity-50 hover:opacity-80 hover:scale-102'
          }
          ${isActive ? 'animate-pulse-soft' : ''}
        `}
        style={{
          backgroundColor: isSelected ? persona.color : '#e5e7eb',
          color: isSelected ? '#fff' : '#6b7280',
          ...(isSelected ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${persona.color}` } : {}),
        }}
      >
        <span
          className={`font-black tracking-tighter ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
          style={{ color: isSelected ? '#fff' : '#9ca3af' }}
        >
          {persona.icon}
        </span>

        {isActive && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: persona.color }}
          />
        )}
      </div>

      <div className="text-center">
        <p
          className={`font-semibold leading-tight ${labelSize[size]} ${
            isSelected ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {persona.name}
        </p>
        <p className={`${labelSize[size]} text-gray-400 dark:text-gray-500 leading-tight hidden sm:block`}>
          {persona.role}
        </p>
      </div>
    </button>
  )
}
