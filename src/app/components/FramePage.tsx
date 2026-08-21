'use client'
import { useState } from 'react'
import { Frame, Rule, RuleKind, EXAMPLE_FRAME } from '@/lib/frame'
import { saveFrame, resetFrame } from '@/lib/frameStore'

const KIND_BADGE: Record<RuleKind, string> = {
  buy: 'bg-red-50 text-red-600',
  sell: 'bg-blue-50 text-blue-600',
  risk: 'bg-amber-50 text-amber-700',
}
const KIND_LABEL: Record<RuleKind, string> = { buy: '매수', sell: '매도', risk: '리스크' }

export function FramePage({ frame, setFrame }: { frame: Frame; setFrame: (f: Frame) => void }) {
  const [rules, setRules] = useState<Rule[]>(frame.rules)
  const [kind, setKind] = useState<RuleKind>('buy')
  const [text, setText] = useState('')

  function edit(id: string, t: string) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, text: t } : r)))
  }
  function remove(id: string) {
    setRules((rs) => rs.filter((r) => r.id !== id))
  }
  function add() {
    if (!text.trim()) return
    setRules((rs) => [...rs, { id: 'u' + Date.now(), kind, text: text.trim() }])
    setText('')
  }
  function save() {
    const f = { rules, updatedAt: new Date().toISOString() }
    saveFrame(f)
    setFrame({ ...f })
  }
  function reset() {
    resetFrame()
    setRules(EXAMPLE_FRAME.rules)
    setFrame({ ...EXAMPLE_FRAME })
  }

  return (
    <div className="p-4 overflow-y-auto h-full text-sm bg-[#F1F3F5]">
      <div className="text-lg font-extrabold text-[#191919]">📋 내 거래 프레임</div>
      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
        나만의 매매 규칙이에요. <b>자동체크</b> 규칙은 결정·회고에서 실데이터로 검증돼요. 익절·손절은 보유 종목이면 매입가로 자동 계산하고, 뉴스·여론 같은 규칙은 아직 자동 판정을 지원하지 않아 직접 확인합니다.
      </div>

      {/* 규칙 목록 — 각 규칙을 2줄 카드로(배지 행 + 입력 행) */}
      <div className="mt-3 space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="rounded-xl bg-white border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-3">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${KIND_BADGE[r.kind]}`}>{KIND_LABEL[r.kind]}</span>
              {r.check && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">자동체크</span>}
              <button onClick={() => remove(r.id)} aria-label="삭제" className="ml-auto w-6 h-6 grid place-items-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50">
                ✕
              </button>
            </div>
            <textarea
              value={r.text}
              rows={1}
              onChange={(e) => edit(r.id, e.target.value)}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                }
              }}
              className="mt-1.5 w-full text-sm outline-none bg-transparent resize-none overflow-hidden leading-snug"
            />
          </div>
        ))}
        {rules.length === 0 && (
          <div className="rounded-xl bg-white border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400">
            규칙이 없어요. 아래에서 추가하거나, 대화로 Frame과 함께 만들어보세요.
          </div>
        )}
      </div>

      {/* 새 규칙 추가 */}
      <div className="mt-3 rounded-xl bg-white border border-black/5 p-3">
        <div className="flex gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as RuleKind)} className="border rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="buy">매수</option>
            <option value="sell">매도</option>
            <option value="risk">리스크</option>
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // 한글 IME 조합 중 Enter는 무시 — 마지막 글자 잔여 버그 방지
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) add()
            }}
            placeholder="새 규칙 (예: 실적 근거 없으면 안 산다)"
            className="flex-1 min-w-0 border rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>
        <button onClick={add} className="mt-2 w-full py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold">
          규칙 추가
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={save} className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-bold">저장</button>
        <button onClick={reset} className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-600">예시로 초기화</button>
      </div>
    </div>
  )
}
