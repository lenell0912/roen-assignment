'use client'
// 채팅 인라인 카드 — 도구 출력의 컴팩트 렌더. '자세히'는 상세 뷰(기존 페이지 재활용)로.

const VCOLOR: Record<string, string> = { ok: 'text-emerald-600', violate: 'text-red-500', na: 'text-gray-400' }
const VLABEL: Record<string, string> = { ok: '부합', violate: '위반', na: '판단' }

export function CompareCard({ result, onExpand }: { result: any; onExpand: () => void }) {
  if (!result?.summary) return null
  const q = result.quote
  return (
    <div className="mt-1.5 border rounded-xl bg-white p-3 text-xs max-w-[88%]">
      <div className="flex items-baseline gap-1.5">
        <span className="font-bold text-sm">{result.code}</span>
        {q && (
          <>
            <span className="font-semibold">{Number(q.price).toLocaleString()}원</span>
            <span className={Number(q.changeRate) < 0 ? 'text-blue-500' : 'text-red-500'}>
              {Number(q.changeRate).toFixed(2)}%
            </span>
          </>
        )}
      </div>
      <div className="mt-1 text-gray-500">
        내 원칙 대조 — <span className="text-emerald-600 font-semibold">부합 {result.summary.ok}</span> ·{' '}
        <span className="text-red-500 font-semibold">위반 {result.summary.violate}</span> · 스스로 판단 {result.summary.na}
      </div>
      <div className="mt-1.5 space-y-1">
        {(result.verdicts ?? []).slice(0, 3).map((v: any, i: number) => (
          <div key={i} className="flex gap-1.5">
            <span className={`shrink-0 font-semibold ${VCOLOR[v.verdict.status]}`}>{VLABEL[v.verdict.status]}</span>
            <span className="text-gray-600 truncate">{v.rule.text}</span>
          </div>
        ))}
      </div>
      <button onClick={onExpand} className="mt-2 text-blue-600 font-semibold">전체 대조 결과 보기 →</button>
    </div>
  )
}

export function BacktestCard({ result, onExpand }: { result: any; onExpand: () => void }) {
  if (result?.supported === false) return null
  const r = result?.result
  if (!r) return null
  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
  return (
    <div className="mt-1.5 border rounded-xl bg-white p-3 text-xs max-w-[88%]">
      <div className="font-semibold">🔁 회고 — 내 원칙({result.params.fast}/{result.params.slow} 교차)을 과거에 대입</div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
        <div className="border rounded-lg p-1.5"><div className="text-[10px] text-gray-400">규칙대로</div><div className="font-bold">{fmt(r.strategyReturnPct)}</div></div>
        <div className="border rounded-lg p-1.5"><div className="text-[10px] text-gray-400">그냥 보유</div><div className="font-bold">{fmt(r.buyHoldReturnPct)}</div></div>
        <div className="border rounded-lg p-1.5"><div className="text-[10px] text-gray-400">매매</div><div className="font-bold">{r.trades}회</div></div>
      </div>
      <button onClick={onExpand} className="mt-2 text-blue-600 font-semibold">차트·규칙별 채점 보기 →</button>
    </div>
  )
}

export function FrameSavedCard({ rules, onExpand }: { rules: { text: string }[]; onExpand: () => void }) {
  return (
    <div className="mt-1.5 border border-emerald-200 bg-emerald-50 rounded-xl p-3 text-xs max-w-[88%]">
      <div className="font-semibold text-emerald-700">📋 내 매매 원칙 저장됨 ({rules.length}개)</div>
      <ul className="mt-1 list-disc ml-4 text-emerald-800 space-y-0.5">
        {rules.map((r, i) => (<li key={i}>{r.text}</li>))}
      </ul>
      <button onClick={onExpand} className="mt-1.5 text-emerald-700 font-semibold underline">위키에서 보기 →</button>
    </div>
  )
}

export function RecordChip({ onOpenWiki }: { onOpenWiki: () => void }) {
  return (
    <button
      onClick={onOpenWiki}
      className="mt-1.5 text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 border"
    >
      🗂 이 판단, 위키에 기록됐어요 · 보기
    </button>
  )
}
