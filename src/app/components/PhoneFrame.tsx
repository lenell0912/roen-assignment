'use client'
import { ReactNode } from 'react'

// iPhone 16 Pro 비율(402×874pt). 뷰포트 높이에 맞춰 축소.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative shrink-0 bg-black rounded-[56px] p-[10px] shadow-2xl"
      style={{ height: 'min(88vh, 874px)', aspectRatio: '402 / 874' }}
    >
      <div className="relative w-full h-full rounded-[46px] overflow-hidden bg-white">
        {/* 다이내믹 아일랜드 */}
        <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 w-[112px] h-[28px] bg-black rounded-full z-40" />
        {children}
      </div>
    </div>
  )
}
