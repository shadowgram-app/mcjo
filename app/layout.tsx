import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shadowgram Boardroom | 8유형 글로벌 비즈니스 가상 회의실',
  description:
    'Shadowgram 8가지 심리 유형 페르소나가 디지털 콘텐츠 자동화 글로벌 비즈니스를 주제로 실시간 가상 회의를 진행합니다.',
  keywords: ['Shadowgram', 'Borderless Human', 'MBTI', '비즈니스 전략', 'AI 회의실'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
