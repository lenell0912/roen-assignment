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
  const [msg, setMsg] = useState('')

  function edit(id: string, t: string) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, text: t } : r)))
    setMsg('')
  }
  function remove(id: string) {
    setRules((rs) => rs.filter((r) => r.id !== id))
    setMsg('')
  }
  function add() {
    if (!text.trim()) return
    setRules((rs) => [...rs, { id: 'u' + Date.now(), kind, text: text.trim() }])
    setText('')
    setMsg('')
  }
  function save() {
    const f = { rules, updatedAt: new Date().toISOString() }
    saveFrame(f)
    setFrame({ ...f })
    setMsg('저장됨 — 대화·결정·회고가 이 프레임을 씁니다')
  }
  function reset() {
    resetFrame()
    setRules(EXAMPLE_FRAME.rules)
    setFrame({ ...EXAMPLE_FRAME })
    setMsg('예시 프레임으로 초기화됨')
  }

  return (
    <div className="p-5 overflow-y-auto h-full text-sm">
      <div className="font-bold">📋 내 거래 프레임</div>
      <div className="text-xs text-gray-500 mt-0.5">
        나만의 매매 규칙. <b>자동체크</b> 규칙은 결정·회고에서 실데이터로 검증되고, 서술형은 스스로 판단합니다.
      </div>

      <div className="mt-3 space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-2 border rounded-lg p-2">
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${KIND_BADGE[r.kind]}`}>{KIND_LABEL[r.kind]}</span>
            <input value={r.text} onChange={(e) => edit(r.id, e.target.value)} className="flex-1 text-sm outline-none" />
            {r.check && <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-600">자동체크</span>}
            <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-red-500">✕</button>
          </div>
        ))}
        {rules.length === 0 && <div className="text-xs text-gray-400">규칙이 없어. 아래에서 추가하거나, 대화로 Frame과 함께 만들어봐.</div>}
      </div>

      <div className="mt-3 flex gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as RuleKind)} className="border rounded px-2 text-sm">
          <option value="buy">매수</option>
          <option value="sell">매도</option>
          <option value="risk">리스크</option>
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="새 규칙 (예: 실적 근거 없으면 안 산다)"
          className="flex-1 border rounded px-2 py-1.5 text-sm"
        />
        <button onClick={add} className="px-3 rounded bg-gray-800 text-white text-sm">추가</button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={save} className="px-3 py-1.5 rounded bg-black text-white text-xs">저장</button>
        <button onClick={reset} className="px-3 py-1.5 rounded border text-xs">예시로 초기화</button>
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
      </div>
    </div>
  )
}
