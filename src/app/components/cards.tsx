'use client'
// 채팅 인라인 카드 — 도구 출력의 강조 카드 렌더. '자세히'는 상세 뷰(기존 페이지 재활용)로.
// 메시지 말풍선과 구분되게: 풀폭 · 라운드 · 그림자 · 컬러 헤더 · 푸터 액션.

const VCOLOR: Record<string, string> = { ok: 'text-emerald-600', violate: 'text-red-500', na: 'text-gray-400' }
const VLABEL: Record<string, string> = { ok: '부합', violate: '위반', na: '판단' }
const CARD = 'mt-2 max-w-[88%] rounded-2xl bg-white overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-black/5'
const FOOT = 'w-full px-4 py-2.5 border-t border-gray-100 text-xs font-bold flex items-center gap-1 active:bg-gray-50 transition-colors'

export function CompareCard({ result, onExpand }: { result: any; onExpand: () => void }) {
  if (!result?.summary) return null
  const q = result.quote
  const down = q && Number(q.changeRate) < 0
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 px-4 py-3 bg-[#191919] text-white">
        <span className="font-extrabold text-sm">{result.code}</span>
        {q && (
          <>
            <span className="text-sm font-semibold">{Number(q.price).toLocaleString()}원</span>
            <span className={`text-xs font-semibold ${down ? 'text-blue-300' : 'text-red-300'}`}>
              {down ? '▼' : '▲'} {Math.abs(Number(q.changeRate)).toFixed(2)}%
            </span>
          </>
        )}
        <span className="ml-auto text-[11px] font-semibold opacity-70">내 원칙 대조</span>
      </div>
      <div className="px-4 pt-3 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <Pill className="bg-emerald-50 text-emerald-700">부합 {result.summary.ok}</Pill>
          <Pill className="bg-red-50 text-red-600">위반 {result.summary.violate}</Pill>
          <Pill className="bg-gray-100 text-gray-500">스스로 판단 {result.summary.na}</Pill>
        </div>
        <div className="mt-2.5 space-y-1.5">
          {(result.verdicts ?? []).slice(0, 3).map((v: any, i: number) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className={`shrink-0 font-bold ${VCOLOR[v.verdict.status]}`}>{VLABEL[v.verdict.status]}</span>
              <span className="text-gray-700 truncate">{v.rule.text}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onExpand} className={`${FOOT} text-[#191919]`}>
        전체 대조 결과 보기 <span className="ml-auto">→</span>
      </button>
    </div>
  )
}

export function BacktestCard({ result, onExpand }: { result: any; onExpand: () => void }) {
  if (result?.supported === false) return null
  const r = result?.result
  if (!r) return null
  const fmt = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`)
  const win = (r.strategyReturnPct ?? 0) >= (r.buyHoldReturnPct ?? 0)
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 px-4 py-3 bg-[#3478F6] text-white">
        <span className="text-base">🔁</span>
        <span className="font-extrabold text-sm">회고 · 내 원칙을 과거에 대입</span>
        <span className="ml-auto text-[11px] font-semibold opacity-80">{result.params.fast}/{result.params.slow} 교차</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="규칙대로" value={fmt(r.strategyReturnPct)} highlight={win} />
        <Stat label="그냥 보유" value={fmt(r.buyHoldReturnPct)} />
        <Stat label="매매" value={`${r.trades}회`} />
      </div>
      <button onClick={onExpand} className={`${FOOT} text-[#3478F6]`}>
        차트·규칙별 채점 보기 <span className="ml-auto">→</span>
      </button>
    </div>
  )
}

export function FrameSavedCard({ rules, onExpand, onEdit }: { rules: { text: string }[]; onExpand: () => void; onEdit: () => void }) {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white">
        <span className="text-base">📋</span>
        <span className="font-extrabold text-sm">내 매매 원칙 저장됨</span>
        <span className="ml-auto text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{rules.length}개</span>
      </div>
      <ul className="px-4 py-3 space-y-2">
        {rules.map((r, i) => (
          <li key={i} className="flex gap-2.5 text-xs text-gray-800">
            <span className="shrink-0 w-5 h-5 grid place-items-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
              {i + 1}
            </span>
            <span className="pt-0.5 leading-snug">{r.text}</span>
          </li>
        ))}
      </ul>
      <div className="flex border-t border-gray-100">
        <button onClick={onEdit} className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-600 active:bg-gray-50 border-r border-gray-100 flex items-center justify-center gap-1">
          ✏️ 수정
        </button>
        <button onClick={onExpand} className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-600 active:bg-gray-50 flex items-center justify-center gap-1">
          🗂 위키에서 보기
        </button>
      </div>
    </div>
  )
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${className}`}>{children}</span>
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 ${highlight ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className={`mt-0.5 font-extrabold text-sm ${highlight ? 'text-emerald-700' : 'text-[#191919]'}`}>{value}</div>
    </div>
  )
}

export function RecordChip({ onOpenWiki }: { onOpenWiki: () => void }) {
  return (
    <button
      onClick={onOpenWiki}
      className="mt-1.5 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
    >
      🗂 이 판단, 위키에 기록됐어요 · 보기
    </button>
  )
}
