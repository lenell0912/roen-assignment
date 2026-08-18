'use client'
import { useState } from 'react'
import { Frame } from '@/lib/frame'
import { loadFrame } from '@/lib/frameStore'
import { ChatPage } from './ChatPage'
import { FramePage } from './FramePage'
import { DecisionPage } from './DecisionPage'
import { RetroPage } from './RetroPage'
import { WikiPage } from './WikiPage'
import { CommunityPage } from './CommunityPage'

export type Tab = 'chat' | 'frame' | 'decision' | 'retro' | 'wiki' | 'community'

const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: '💬 대화' },
  { id: 'frame', label: '📋 내 프레임' },
  { id: 'decision', label: '🎯 결정' },
  { id: 'retro', label: '🔁 회고' },
  { id: 'wiki', label: '🗂 위키' },
  { id: 'community', label: '👥 커뮤니티' },
]

const STOCKS = [
  { code: '005930', name: '삼성전자' },
  { code: '000660', name: 'SK하이닉스' },
  { code: '247540', name: '에코프로비엠' },
  { code: '373220', name: 'LG에너지솔루션' },
  { code: '035720', name: '카카오' },
]

export function AgentApp({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('chat')
  const [code, setCode] = useState('005930')
  const [frame, setFrame] = useState<Frame>(() => loadFrame())
  const [seed, setSeed] = useState<string | undefined>()

  function scenario(nextCode: string | null, tabId: Tab, chat?: string) {
    if (nextCode) setCode(nextCode)
    setTab(tabId)
    if (chat) setSeed(chat + ' ')
  }

  return (
    <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-neutral-50">
        <span className="font-bold">🧭 AI 투자 코파일럿</span>
        <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded">📍 종목</span>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          {STOCKS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        <button onClick={onExit} className="ml-auto text-sm text-gray-500">
          ↩ 페이증권으로
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 px-3 py-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              tab === t.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 본문 + 시나리오 패널 */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 border-r">
          {tab === 'chat' && <ChatPage code={code} frame={frame} seed={seed} onOpenPage={(t) => setTab(t as Tab)} />}
          {tab === 'frame' && <FramePage frame={frame} setFrame={setFrame} />}
          {tab === 'decision' && <DecisionPage code={code} frame={frame} />}
          {tab === 'retro' && <RetroPage code={code} frame={frame} />}
          {tab === 'wiki' && <WikiPage frame={frame} />}
          {tab === 'community' && <CommunityPage code={code} />}
        </div>

        {/* 시나리오 패널 */}
        <aside className="w-60 shrink-0 p-3 bg-neutral-50 overflow-y-auto hidden md:block">
          <div className="text-[11px] font-semibold text-gray-500 mb-2">권장 테스트 시나리오</div>
          <div className="space-y-2">
            <ScenarioBtn label='"삼성전자 지금 사도 될까?"' onClick={() => scenario('005930', 'chat', '삼성전자 지금 사도 될까?')} />
            <ScenarioBtn label='"에코프로 담아도 될까?" (쏠림 확인)' onClick={() => scenario('247540', 'chat', '에코프로비엠 지금 담아도 될까?')} />
            <ScenarioBtn label='"내 매매 원칙부터 만들래"' onClick={() => scenario(null, 'chat', '내 매매 원칙부터 만들고 싶어. 뭐부터 정하면 좋아?')} />
            <ScenarioBtn label="📋 내 프레임 보기" onClick={() => scenario(null, 'frame')} />
            <ScenarioBtn label="🔁 과거에 내 프레임 대입(회고)" onClick={() => scenario(null, 'retro')} />
          </div>
          <p className="text-[10px] text-gray-400 mt-4">아무 종목·질문으로 자유롭게 벗어나도 됩니다. 시나리오는 길 안내일 뿐.</p>
        </aside>
      </div>

      {/* 면책 */}
      <div className="px-4 py-1.5 border-t text-[10px] text-gray-400">
        본 서비스는 투자 참고용이며 투자자문이 아닙니다. 최종 결정은 사용자에게 있습니다.
      </div>
    </div>
  )
}

function ScenarioBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left text-xs bg-white border rounded-lg px-2 py-2 hover:border-blue-400">
      {label}
    </button>
  )
}
