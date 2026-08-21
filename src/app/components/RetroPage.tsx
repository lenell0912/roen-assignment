'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { saveFrame } from '@/lib/frameStore'
import { loadRecords } from '@/lib/records'
import type { TradeReview, ReviewItem, ScenarioCard } from '@/lib/review'

export function RetroPage({ code, frame, setFrame }: { code?: string; frame: Frame; setFrame: (f: Frame) => void }) {
  const [review, setReview] = useState<TradeReview | null>(null)
  const [evo, setEvo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setFailed(false)
    setApplied(false)
    setEvo(null)
    const records = loadRecords().map((r) => ({
      code: r.code, at: r.at, okCount: r.okCount, violateCount: r.violateCount, naCount: r.naCount,
      priceAtDecision: r.priceAtDecision, note: r.note,
    }))
    fetch('/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ frame, code, records }) })
      .then((r) => r.json())
      .then((rv: TradeReview & { error?: string }) => {
        if (!alive) return
        if (rv.error) { setFailed(true); return }
        setReview(rv)
        return fetch('/api/evolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ frame, review: rv }) })
          .then((r) => r.json())
          .then((e) => { if (alive) setEvo(e) })
          .catch(() => {})
      })
      .catch(() => { if (alive) setFailed(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [code, frame])

  function applyProposal(p: any) {
    const rules = frame.rules.flatMap((r) => {
      if (r.id !== p.ruleId) return [r]
      if (p.action === 'drop') return []
      return [{ ...r, text: p.newText ?? r.text, check: r.check && p.paramPatch ? ({ ...r.check, ...p.paramPatch } as any) : r.check }]
    })
    const next = { rules, updatedAt: new Date().toISOString() }
    saveFrame(next)
    setFrame(next)
    setApplied(true)
  }

  if (loading) return <div className="p-6 text-gray-400 text-sm">내 매매를 프레임으로 돌아보는 중…</div>
  if (failed || !review) return <div className="p-6 text-red-500 text-sm">회고를 불러오지 못했어요 — 잠시 후 다시 시도해 주세요.</div>

  return (
    <div className="p-5 overflow-y-auto h-full text-sm">
      <div className="font-bold">🔁 회고 — 내 매매를 내 프레임으로 돌아보기</div>

      {/* 운/실력 요약 */}
      <div className="mt-2 p-3 rounded-lg bg-slate-50 border text-slate-800">
        <div className="text-[11px] font-semibold text-slate-500">운 vs 실력</div>
        <div className="mt-0.5 leading-relaxed">{review.summary.verdict}</div>
      </div>

      {/* 매매별 카드 */}
      <div className="mt-4 space-y-2">
        {review.items.length === 0 ? (
          <div className="text-xs text-gray-400">아직 돌아볼 매매가 없어요. 종목을 원칙에 대조해 기록을 쌓아보세요.</div>
        ) : (
          review.items.map((it, i) => <TradeRow key={`${it.source}-${it.code}-${i}`} it={it} />)
        )}
      </div>

      {/* 가상 시나리오 */}
      {review.scenario && <ScenarioRow sc={review.scenario} />}

      {/* 진화 제안 */}
      {evo?.suggestion && (
        <div className="mt-4 p-3 rounded-lg bg-indigo-50 text-indigo-900">
          <div className="font-semibold text-xs">🧬 프레임 진화 제안</div>
          <div className="mt-1 text-sm">{evo.suggestion}</div>
          {evo.proposal && !applied && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border">{evo.proposal.action} · {evo.proposal.ruleId}</span>
              <button onClick={() => applyProposal(evo.proposal)} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs">✅ 이 개정 반영</button>
            </div>
          )}
          {applied && <div className="mt-2 text-xs text-emerald-700">반영됨 — 프레임이 업데이트되고 회고가 다시 계산됐어요.</div>}
        </div>
      )}

      {/* 보너스: 이동평균 전체기간 시뮬 */}
      {review.smaBonus && (
        <div className="mt-4">
          <div className="font-semibold text-xs text-gray-600">➕ 보너스: 이동평균 규칙 전체기간 시뮬 ({review.smaBonus.params.fast}/{review.smaBonus.params.slow})</div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-center">
            <Stat label="규칙대로" value={fmt(review.smaBonus.result.strategyReturnPct)} />
            <Stat label="그냥 보유" value={fmt(review.smaBonus.result.buyHoldReturnPct)} />
            <Stat label="매매" value={`${review.smaBonus.result.trades}회`} />
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-amber-50 rounded-lg text-amber-800 text-xs">
        ⚠️ 이건 <b>정답이 아니라 "네 매매를 과거에 비춘 참고"</b>야. 표본이 적고 특정 구간에 치우칠 수 있으니, 규칙 변경은 신중히.
      </div>
    </div>
  )
}

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function FitPills({ fit }: { fit: { ok: number; violate: number; na: number } }) {
  return (
    <div className="flex gap-1 text-[10px] font-bold">
      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">부합 {fit.ok}</span>
      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">위반 {fit.violate}</span>
      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">미지원 {fit.na}</span>
    </div>
  )
}

function TradeRow({ it }: { it: ReviewItem }) {
  const up = (it.returnPct ?? 0) >= 0
  const when = it.source === 'holding'
    ? `매입가 ${it.entryPrice?.toLocaleString()}원`
    : `대조 결정${it.at ? ` · ${it.at.slice(0, 10)}` : ''}`
  return (
    <div className="border rounded-lg p-3 flex items-start gap-2.5">
      <span className={`shrink-0 whitespace-nowrap text-[11px] px-1.5 py-0.5 rounded border ${it.source === 'holding' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
        {it.source === 'holding' ? '보유' : '기록'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{it.name}</span>
          <span className="ml-auto text-right whitespace-nowrap">
            {it.returnPct == null
              ? <span className="text-[11px] text-gray-400">관찰 중(경과 짧음)</span>
              : <span className={`font-bold ${up ? 'text-red-500' : 'text-blue-500'}`}>{fmt(it.returnPct)}</span>}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-gray-500">{when}</div>
        <div className="mt-1"><FitPills fit={it.fit} /></div>
      </div>
    </div>
  )
}

function ScenarioRow({ sc }: { sc: ScenarioCard }) {
  const up = sc.returnPct >= 0
  return (
    <div className="mt-4 p-3 rounded-lg bg-violet-50 text-violet-900">
      <div className="font-semibold text-xs">🔮 가상 시나리오 — {sc.name}</div>
      <div className="mt-1 text-sm leading-relaxed">
        {sc.lookbackDays}거래일 전({sc.entryDate}) <b>{sc.entryPrice.toLocaleString()}원</b>에서 봤다면 지금까지{' '}
        <b className={up ? 'text-red-600' : 'text-blue-600'}>{fmt(sc.returnPct)}</b>.
      </div>
      <div className="mt-1"><FitPills fit={sc.fit} /></div>
      <div className="mt-1 text-[10px] text-violet-500">실제 매매가 아니라 참고용 가상 시나리오예요.</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  )
}
