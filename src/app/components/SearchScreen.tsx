'use client'
import { useState } from 'react'
import { STOCKS, StockInfo, searchStocks } from '@/lib/stocks'

export function SearchScreen({ onBack, onPick }: { onBack: () => void; onPick: (s: StockInfo) => void }) {
  const [q, setQ] = useState('')
  const results = q.trim() ? searchStocks(q, 12) : STOCKS.slice(0, 10)
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <div className="pt-12 px-3 pb-2 flex items-center gap-2 border-b">
        <button onClick={onBack} aria-label="뒤로" className="w-8 h-8 grid place-items-center text-lg">←</button>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="종목명 또는 6자리 코드"
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {!q.trim() && <div className="px-4 pt-3 text-[11px] text-gray-400">인기 종목 — 아무 종목이나 검색해도 됩니다</div>}
        {results.length === 0 && (
          <div className="p-6 text-sm text-gray-400 text-center">검색 결과 없음 — 6자리 종목코드로도 찾을 수 있어요</div>
        )}
        {results.map((s) => (
          <button
            key={s.code}
            onClick={() => onPick(s)}
            className="w-full flex items-center px-4 py-3 border-b text-left hover:bg-gray-50"
          >
            <span className="text-sm font-medium">{s.name}</span>
            <span className="ml-2 text-xs text-gray-400">{s.code}</span>
            <span className="ml-auto text-gray-300">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
