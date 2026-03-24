export type PersonaId =
  | 'shadow'
  | 'devil'
  | 'strategist'
  | 'lua'
  | 'sivoice'
  | 'netwin'
  | 'market'
  | 'sage'

export interface Persona {
  id: PersonaId
  name: string
  role: string
  domain: string
  style: string
  color: string
  icon: string
  shortDesc: string
}

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  personaId?: PersonaId
  personaName?: string
  timestamp: number
  isStreaming?: boolean
}

export interface ChatSession {
  id: string
  messages: Message[]
  createdAt: number
  title?: string
}

export interface QuickAction {
  label: string
  prompt: string
  suggestedPersonas: PersonaId[]
}
