import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'AI 투자 Frame — 나만의 거래 프레임',
  description: '답을 주지 않고, 너의 판단 프레임을 키운다',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
