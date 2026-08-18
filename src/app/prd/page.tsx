'use client'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'

const KAKAO_FONT = '"Apple SD Gothic Neo", Pretendard, "Noto Sans KR", system-ui, sans-serif'

export default function PRD() {
  const [mode, setMode] = useState<'summary' | 'detail'>('summary')
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'detail' && pending) {
      document.getElementById(pending)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setPending(null)
    }
  }, [mode, pending])

  const goSection = (id: string) => {
    setMode('detail')
    setPending(id)
  }
  const goSummary = () => {
    setMode('summary')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily: KAKAO_FONT }} className="min-h-screen bg-[#f7f8fa] text-[#191919]">
      <TopBar mode={mode} onSummary={goSummary} onSection={goSection} />
      <Hero />
      {mode === 'summary' ? (
        // 요약 개요 = 핵심 PRD (과제 필수 + 테제). 1~2장 분량.
        <div className="max-w-3xl mx-auto px-5 pb-24 space-y-14 pt-8">
          <Problem />
          <Target />
          <Scenario />
          <Solution />
          <Goals />
          <Novelty />
          <Hypotheses />
          <Differentiation />
          <FooterCTA />
        </div>
      ) : (
        // 상세 = 부록(더 깊은 근거). 탭으로 진입.
        <div className="max-w-3xl mx-auto px-5 pb-24 space-y-14 pt-8">
          <MvpScope />
          <StrategicFit />
          <Risks />
          <Roadmap />
          <OpenQuestions />
          <AiUsage />
          <FooterCTA />
        </div>
      )}
    </div>
  )
}

function TopBar({ mode, onSummary, onSection }: { mode: 'summary' | 'detail'; onSummary: () => void; onSection: (id: string) => void }) {
  const sections: [string, string][] = [
    ['스코프', 'scope'],
    ['전략적합성', 'fit'],
    ['리스크', 'risk'],
    ['로드맵', 'roadmap'],
    ['남은질문', 'open'],
    ['AI활용', 'ai'],
  ]
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b">
      <div className="max-w-3xl mx-auto px-5 h-12 flex items-center gap-3">
        <span className="font-extrabold text-sm">PRD · AI 투자 코파일럿</span>
        <Link href="/" className="ml-auto text-sm font-semibold bg-[#fee500] px-3 py-1.5 rounded-full">
          프로토타입 열기 →
        </Link>
      </div>
      <div className="max-w-3xl mx-auto px-5 flex items-center gap-1.5 overflow-x-auto pb-2 border-t">
        <button
          onClick={onSummary}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold ${mode === 'summary' ? 'bg-[#191919] text-white' : 'bg-[#f1f3f5] text-gray-600'}`}
        >
          요약 개요
        </button>
        <span className="w-px h-4 bg-gray-300 mx-1 shrink-0" aria-hidden />
        {sections.map(([label, id]) => (
          <button
            key={id}
            onClick={() => onSection(id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${mode === 'detail' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Summary({ onDetail }: { onDetail: () => void }) {
  const rows: [string, ReactNode][] = [
    ['문제', <>정보는 넘치는데 <b>스스로 판단이 안 된다</b> — 거래 프레임(판단 기준)과 피드백 루프의 부재. 그 결과 쏠림·추격매수·뇌동매매로 실패한다.</>],
    ['타겟', <>2030 초보 + 감으로 투자하는 사람</>],
    ['해결', <><b>&quot;나만의 거래 프레임&quot;</b>을 만들고·지키고·다듬는 루프(형성→결정→기록→회고·진화). 답을 주지 않고 판단을 보완하는 코파일럿.</>],
    ['새로움', <>추천을 거부하는 AI + 결정 직전 개입 + <b>프레임이 내 결과로 스스로 진화.</b></>],
    ['가설', <>프레임 대조 → 근거 있는 결정↑ · 기록·되먹임 → 판단력 성장 · 프레임 → 감정매매↓</>],
    ['검증 지표', <>NSM: 프레임에 근거한 결정 비율 · 위반 경고 시 보류율 · 회고/진화 횟수 · WAU</>],
    ['차별화', <>증권봇·AI인사이트가 &quot;답&quot;을 줄 때, 우리는 <b>판단력을 키운다.</b></>],
  ]
  return (
    <section className="pt-8">
      <div className="text-xs text-gray-400 mb-3">요약 개요 · 30초 · 상세는 위 탭에서</div>
      <Card>
        <div className="divide-y">
          {rows.map(([label, node]) => (
            <div key={label} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className="shrink-0 w-16 text-xs font-bold text-[#b8a500] pt-0.5">{label}</span>
              <div className="text-sm text-gray-700 leading-relaxed">{node}</div>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-4 flex gap-2">
        <button onClick={onDetail} className="bg-[#191919] text-white px-4 py-2 rounded-full text-sm font-semibold">
          상세 PRD 보기 →
        </button>
        <Link href="/" className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 bg-[#f1f3f5]">
          프로토타입 열기
        </Link>
      </div>
    </section>
  )
}

function Hero() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-3xl mx-auto px-5 py-14">
        <div className="text-xs font-bold text-[#c9a800]">카카오페이증권 · 프로덕트 빌더(시니어) 과제</div>
        <h1 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight">
          답을 주지 않는
          <br />
          투자 코파일럿
        </h1>
        <p className="mt-4 text-gray-600 text-[15px] leading-relaxed">
          종목을 추천하는 AI는 많다. 우리는 <b>추천을 거부하고</b>, 너의 판단 기준(프레임)을{' '}
          <b>너의 실제 결과로 진화시킨다.</b> 2030 초보가 남 따라 하지 않고, 스스로·근거 있게 결정하도록.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {['2030 초보·감투자자', '토스증권 오픈API 실연동', 'Claude Sonnet 에이전트', '탐색형 프로토타입'].map((c) => (
            <span key={c} className="text-xs bg-[#fff8cc] text-[#8a7400] px-2.5 py-1 rounded-full font-medium">
              {c}
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border p-5 ${className}`}>{children}</div>
}

function H2({ id, kicker, title }: { id?: string; kicker: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-16">
      <div className="text-xs font-bold text-[#c9a800]">{kicker}</div>
      <h2 className="mt-1 text-2xl font-extrabold">{title}</h2>
    </div>
  )
}

function Problem() {
  const roots = {
    R1: { t: '프레임 부재', d: '무엇을 근거로 사고팔지 기준이 없다. 매 결정이 즉흥·감정·남의 말. "왜 사?"에 구조적으로 답을 못 한다.' },
    R2: { t: '피드백 루프 부재', d: '왜 샀는지 기록이 없어 결과가 실력인지 운인지 구분 못 한다. 그래서 다음에도 같은 실수 — 판단력이 안 자라는 진짜 이유.' },
    R3: { t: '감정(FOMO·패닉)', d: '중요하지만 대개 R1의 하위 증상. 프레임이 생기면 흔들릴 때 돌아갈 기준이 생겨 감정 매매가 크게 준다.' },
  } as const
  const [tab, setTab] = useState<keyof typeof roots>('R2')
  return (
    <section className="space-y-4">
      <H2 id="problem" kicker="Problem · 해결하려는 문제" title="정보는 넘치는데, 스스로 판단이 안 된다" />
      <p className="text-gray-600 text-sm">
        "정보 과잉 → 판단 부재"를 한 겹 더 파면 두 결핍이 나온다. (아래 탭을 눌러보세요)
      </p>
      <Card>
        <div className="flex gap-2">
          {(Object.keys(roots) as (keyof typeof roots)[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${tab === k ? 'bg-[#191919] text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <div className="font-bold">
            {tab} · {roots[tab].t}
          </div>
          <div className="mt-1 text-sm text-gray-600">{roots[tab].d}</div>
        </div>
      </Card>
      <div>
        <div className="text-xs font-semibold text-gray-500 mb-2">이 결핍이 실패 패턴(증상)으로 나타난다</div>
        <div className="flex flex-wrap gap-2">
          {['테마·한 종목 쏠림', '고점 추격매수(FOMO)', '레버리지 과신', '리딩방 뇌동매매', '손절 실패·물타기'].map((s) => (
            <span key={s} className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Target() {
  return (
    <section className="space-y-4">
      <H2 id="target" kicker="Target · 타겟 고객" title="2030 초보 + 감으로 투자하는 사람" />
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <div className="font-bold">누구</div>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc ml-4">
            <li>모바일 네이티브, 유튜브로 투자 학습</li>
            <li>커뮤니티 활동 활발, 소액·잦은 매매</li>
            <li>자기만의 판단 기준이 아직 없음</li>
          </ul>
        </Card>
        <Card>
          <div className="font-bold">왜 카카오페이증권</div>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc ml-4">
            <li>쉽고 친근한 UX · 행동 넛지 DNA</li>
            <li>이미 활성화된 커뮤니티(토론방)</li>
            <li>기존 증권봇·AI인사이트를 넘어설 여지</li>
          </ul>
        </Card>
      </div>
    </section>
  )
}

function Solution() {
  const stages = [
    { k: '① 형성', t: '프레임 형성', d: '대화로 나의 매매 규칙을 끌어내 저장. AI는 답을 주지 않고 되묻는다("왜 사? 팔 기준은?").' },
    { k: '② 결정', t: '결정 순간 (히어로)', d: '아무 종목의 실시간·과거 데이터로 내 프레임에 대조 + 반대근거. 부합/위반을 짚되 결정은 사용자.' },
    { k: '③ 기록', t: '판단 기록', d: '그때의 근거를 자동 저장(개인 위키). 운/실력 분리의 원천.' },
    { k: '④ 회고', t: '과거 대입 + 진화', d: '내 프레임을 과거 데이터에 백테스트하고, 규칙별 엣지를 채점해 프레임을 진화시킨다.' },
  ]
  const [i, setI] = useState(1)
  return (
    <section className="space-y-4">
      <H2 id="solution" kicker="Solution · 해결 방식" title="나만의 거래 프레임 강화 루프" />
      <Card className="bg-[#fffdf0] border-[#fee500]">
        <div className="text-sm">
          <b>해결 원칙(고정):</b> ① 답을 주지 않는다 — 프레임을 끌어내고·대조하고·되먹인다 · ② 항상 내 맥락 근거 · ③ 결정·실행은 사용자.
        </div>
      </Card>
      <div className="grid grid-cols-4 gap-2">
        {stages.map((s, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            className={`rounded-xl p-2 text-sm font-bold border ${i === k ? 'bg-[#191919] text-white border-black' : 'bg-white text-gray-600'}`}
          >
            {s.k}
          </button>
        ))}
      </div>
      <Card>
        <div className="font-bold">{stages[i].t}</div>
        <div className="mt-1 text-sm text-gray-600">{stages[i].d}</div>
      </Card>
      <p className="text-xs text-gray-400">
        기둥: 코파일럿(촉진자) · 개인 위키(프레임+기록 저장소) · 커뮤니티 다리(멘탈케어). 유튜브 영상→프레임 재료는 온램프.
      </p>
    </section>
  )
}

function Novelty() {
  return (
    <section className="space-y-4">
      <H2 id="novelty" kicker="Novelty · 무엇이 새로운가" title="기능이 아니라, 입장·개입 순간·루프가 새롭다" />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          ['입장', '"답을 거부하는 AI"', '모두가 시그널·예측을 줄 때, 우리는 일부러 답을 안 주고 판단력을 키운다.'],
          ['개입 순간', '결정 직전, 앱 안', '구매 버튼 누르기 직전 페이증권 안에서 네 규칙을 실데이터로 들이댄다.'],
          ['루프', '프레임의 자기 진화', '네 규칙을 네 결과로 채점해 규칙을 데이터로 개정한다.'],
        ].map(([k, t, d]) => (
          <Card key={t}>
            <div className="text-xs font-bold text-[#c9a800]">{k}</div>
            <div className="mt-1 font-bold">{t}</div>
            <div className="mt-1 text-sm text-gray-600">{d}</div>
          </Card>
        ))}
      </div>
      <div className="bg-[#191919] text-white rounded-2xl p-5">
        <div className="text-xs font-bold text-[#fee500]">실제 동작 예 · 프레임 진화</div>
        <div className="mt-2 text-sm leading-relaxed">
          삼성전자에서 규칙을 채점하니 — <b>정배열</b> 규칙은 엣지 <span className="text-emerald-400">+4.8%p</span>(유지),{' '}
          <b>고점회피</b> 규칙은 <span className="text-red-400">−13.3%p</span>로 오히려 손해. AI가 &quot;고점회피 10%→5%로 완화&quot;를 데이터 근거로 제안하고, 한 번 누르면 프레임이 스스로 수정된다.{' '}
          <span className="text-gray-400">(과최적화 경고 포함)</span>
        </div>
      </div>
    </section>
  )
}

function Hypotheses() {
  return (
    <section className="space-y-4">
      <H2 id="hypo" kicker="Hypothesis & Metrics · 가설과 검증 지표" title="가설과 검증 지표" />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          ['H1', '결정 순간 "내 프레임"에 대조시키면 근거 있는 결정이 늘고 뇌동·추격매수가 준다.'],
          ['H2', '판단을 기록하고 결과와 되먹이면(회고·진화) 운/실력이 분리되어 판단력이 자란다.'],
          ['H3', '프레임이 생기면 감정 매매(FOMO·패닉)가 준다.'],
        ].map(([h, d]) => (
          <Card key={h}>
            <div className="font-extrabold text-[#c9a800]">{h}</div>
            <div className="mt-1 text-sm text-gray-600">{d}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="font-bold text-sm">검증 지표</div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[
                ['북극성(NSM)', '프레임에 근거한 결정 비율 (프레임 대조를 거친 매매 / 전체)'],
                ['활성화', '프레임 형성 완료율 · 첫 결정-대조 도달률'],
                ['판단 품질', '프레임 위반 경고 시 보류/변경률 (뇌동 차단 신호)'],
                ['학습·리텐션', '회고 완료 수 · 프레임 진화 횟수 · 위키 기록 누적 · WAU'],
                ['정성', '"혼자보다 나은 결정을 했다 / 내 기준이 생겼다" (설문·NPS)'],
              ].map(([a, b]) => (
                <tr key={a} className="border-t">
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap align-top">{a}</td>
                  <td className="py-2 text-gray-600">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}

function Differentiation() {
  return (
    <section className="space-y-4">
      <H2 kicker="Differentiation · 차별화" title="기존 증권봇·AI인사이트 대비" />
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="border-gray-200">
          <div className="font-bold text-gray-500">기존 (증권봇 · AI인사이트)</div>
          <ul className="mt-2 text-sm text-gray-500 space-y-1 list-disc ml-4">
            <li>Q&A · 정보 제공 · 시그널/예측</li>
            <li>답을 준다 → 판단을 대신함</li>
            <li>사후 매매일지 / 사전 스크리너 / 별개 챗봇으로 분절</li>
          </ul>
        </Card>
        <Card className="border-[#fee500] bg-[#fffdf0]">
          <div className="font-bold">우리 (판단 코파일럿)</div>
          <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc ml-4">
            <li>판단 프레임을 키운다 → 판단력 성장</li>
            <li>답을 거부, 결정 직전 개입</li>
            <li>형성→결정→기록→진화를 하나의 프레임으로 관통</li>
          </ul>
        </Card>
      </div>
    </section>
  )
}

function Roadmap() {
  return (
    <section className="space-y-4">
      <H2 id="roadmap" kicker="Roadmap · 로드맵" title="판단에서 시작해, 나만의 트레이딩 프로덕트로" />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          ['Phase 1 · 지금(MVP)', '#22a06b', ['프레임 루프(형성→결정→기록→회고+진화)', '토스 실데이터 · Sonnet 에이전트', '탐색형 프로토타입']],
          ['Phase 2 · 확장', '#f0a020', ['유튜브 온램프 실동작', '커뮤니티 근거공유 실동작', '정식 백테스트']],
          ['Phase 3 · 비전', '#8f7ee7', ['감정 코치 에이전트', '멀티에이전트 · 카톡 실연동', '조건 알림 → 모의 자동주문']],
        ].map(([t, c, items]) => (
          <Card key={t as string} className="border-t-4" >
            <div className="font-bold" style={{ color: c as string }}>
              {t as string}
            </div>
            <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc ml-4">
              {(items as string[]).map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  )
}

function AiUsage() {
  return (
    <section className="space-y-4">
      <H2 id="ai" kicker="How we used AI · AI 활용" title="AI로 어떻게 만들었나" />
      <Card>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc ml-4">
          <li>
            <b>기획</b>: Claude와 브레인스토밍→스펙→구현계획을 반복하며 문제 정의를 프레임 부재까지 파고듦.
          </li>
          <li>
            <b>제품 자체가 에이전트</b>: Claude Sonnet + 도구(시세·프레임 대조·백테스트)로 human-in-the-loop 코파일럿 구현.
          </li>
          <li>
            <b>신뢰 설계</b>: LLM은 "이해·추출·제안"만, 신호·엣지 계산은 결정론적 코드로 분리(환각 방지, 검증 가능).
          </li>
          <li>
            <b>구현</b>: Next.js로 스캐폴드→실데이터 연동→에이전트→미니앱 페이지까지 AI 페어로 개발, TDD로 코어 검증.
          </li>
        </ul>
      </Card>
    </section>
  )
}

function Scenario() {
  const steps = [
    ['① 프레임 형성', '대화로 "난 왜 사고, 언제 파나"를 끌어냄 → 규칙 3개 저장. 답은 안 주고 되물음.'],
    ['② 결정 순간', '삼성전자 사려는데, 결정 페이지가 "2차전지 이미 62% — 쏠림" 위반을 짚음. 지훈은 보류.'],
    ['③ 기록', '"오늘은 감정이었다"를 근거로 남김. 나중에 운/실력을 가릴 씨앗.'],
    ['④ 회고·진화', '한 달 뒤, "고점회피 규칙이 오히려 −13%p 손해"를 데이터로 확인 → 규칙을 완화.'],
  ]
  return (
    <section className="space-y-4">
      <H2 id="scenario" kicker="User Scenario · 핵심 사용자 시나리오" title="지훈, 25세 — 에코프로에 물린 직장인" />
      <Card className="bg-red-50 border-red-100">
        <div className="text-sm text-red-700">
          <b>Before.</b> 유튜브 보고 고점에 샀는데 왜 샀는지 설명 못 함. 커뮤니티 보며 불안, 손절·물타기 반복. 다음에도 똑같이.
        </div>
      </Card>
      <div className="space-y-2">
        {steps.map(([t, d]) => (
          <Card key={t}>
            <div className="font-bold text-sm">{t}</div>
            <div className="mt-1 text-sm text-gray-600">{d}</div>
          </Card>
        ))}
      </div>
      <Card className="bg-emerald-50 border-emerald-100">
        <div className="text-sm text-emerald-800">
          <b>After.</b> 남 따라가 아니라 <b>자기 기준</b>으로 결정하고, 그 판단이 데이터로 쌓여 <b>점점 나아진다.</b>
        </div>
      </Card>
    </section>
  )
}

function Goals() {
  return (
    <section className="space-y-4">
      <H2 id="goals" kicker="Goals & Non-goals · 목표와 비목표" title="무엇을 하고, 무엇을 안 하나" />
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="border-emerald-200">
          <div className="font-bold text-emerald-700">목표 (Goals)</div>
          <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc ml-4">
            <li>사용자가 자기만의 거래 프레임을 갖게 한다</li>
            <li>결정 순간 근거 있는 판단을 늘린다(뇌동·추격 차단)</li>
            <li>판단을 기록·되먹여 판단력이 자라게 한다</li>
          </ul>
        </Card>
        <Card className="border-red-200">
          <div className="font-bold text-red-600">비목표 (Non-goals · 의도된 절제)</div>
          <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc ml-4">
            <li>종목 추천·"사라/팔아라" 답을 주지 않는다</li>
            <li>자동매매·자동주문을 하지 않는다(human-in-the-loop)</li>
            <li>수익률을 보장·예측하지 않는다</li>
            <li>사용자의 판단을 대체하지 않는다</li>
          </ul>
        </Card>
      </div>
    </section>
  )
}

function MvpScope() {
  const groups: [string, string, string[]][] = [
    ['✅ 지금 실제 동작', '#22a06b', ['코파일럿 대화(Sonnet)', '프레임 형성·편집', '결정 대조(실데이터)', '회고 백테스트', '프레임 진화(엣지·제안·적용)', '토스/Yahoo 실연동', '판단 기록']],
    ['🟡 목업/라이트', '#f0a020', ['커뮤니티 다리', '유튜브 온램프', '스크린샷 배경', '카카오톡 채널']],
    ['🔮 로드맵', '#8f7ee7', ['정식 백테스트', '모의 자동주문', '멀티에이전트', '카톡 실연동']],
  ]
  return (
    <section className="space-y-4">
      <H2 id="scope" kicker="Scope · MVP 범위" title="지금 만든 것 vs 목업 vs 로드맵" />
      <div className="grid md:grid-cols-3 gap-3">
        {groups.map(([t, c, items]) => (
          <Card key={t}>
            <div className="font-bold" style={{ color: c }}>
              {t}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {items.map((it) => (
                <span key={it} className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                  {it}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function StrategicFit() {
  return (
    <section className="space-y-4">
      <H2 id="fit" kicker="Strategic Fit · 전략적 적합성" title="왜 카카오페이증권이 이걸 해야 하나" />
      <div className="grid md:grid-cols-2 gap-3">
        {[
          ['리텐션 해자', '프레임·판단 기록이 쌓일수록 개인화가 깊어지고 이탈 비용이 커진다.'],
          ['차별화', '증권봇·AI인사이트가 "답"을 줄 때, 판단력을 키우는 유일한 결.'],
          ['자산 활용', '이미 활성화된 커뮤니티 + 2030 초보 유저베이스에 자연스럽게 얹힌다.'],
          ['브랜드 정합', '"쉽고 친근하게, 스스로 투자하게" — 카카오페이 결과 일치.'],
        ].map(([t, d]) => (
          <Card key={t}>
            <div className="font-bold">{t}</div>
            <div className="mt-1 text-sm text-gray-600">{d}</div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Risks() {
  const rows: [string, string][] = [
    ['AI 안전벨트 착시(과신)', '답을 안 줌 + "한 번 더 생각" 마찰 + 프레임 위반 경고'],
    ['책임 전가', '결정 주체는 사용자임을 상시 명시 + 면책 고지'],
    ['백테스트 과최적화', '"정답 아닌 참고"로 상시 고지 + 표본/구간 경고 노출'],
    ['투자자문 규제', "자문이 아닌 '보완' — 개별 종목 매수·매도 지시 안 함, 면책 고지"],
    ['데이터/자막 한계', '제공자 추상화(토스↔Yahoo 스왑) + 온램프 폴백'],
    ['채택 저항(프레임=노동)', 'AI가 대화로 초안 대신 작성 + 예시 프레임 제공'],
  ]
  return (
    <section className="space-y-4">
      <H2 id="risk" kicker="Risks & Mitigations · 리스크와 완화" title="무엇이 위험하고, 어떻게 막나" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([a, b]) => (
                <tr key={a} className="border-t first:border-t-0">
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap align-top text-red-600">{a}</td>
                  <td className="py-2 text-gray-600">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}

function OpenQuestions() {
  return (
    <section className="space-y-4">
      <H2 id="open" kicker="Open Questions · 남은 결정" title="아직 열려 있는 질문들" />
      <Card>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc ml-4">
          <li>개인 표본이 적을 때 프레임 진화의 과최적화를 어떻게 방지할까? (다종목·다구간 검증)</li>
          <li>프레임 만들기를 얼마나 더 가볍게 만들 수 있나? (온보딩 이탈 최소화)</li>
          <li>커뮤니티 발행에서 "자랑"이 아닌 "근거" 문화를 어떻게 유지할까?</li>
          <li>수익화 라인은? (심화 회고·멀티 전략·프리미엄 코칭)</li>
        </ul>
      </Card>
    </section>
  )
}

function FooterCTA() {
  return (
    <section>
      <div className="bg-[#fee500] rounded-2xl p-6 text-center">
        <div className="font-extrabold text-lg">직접 만져보세요</div>
        <div className="mt-1 text-sm text-[#5a4d00]">아무 종목·질문으로 벗어나도 실데이터로 동작합니다.</div>
        <Link href="/" className="inline-block mt-3 bg-[#191919] text-white px-5 py-2.5 rounded-full font-semibold">
          프로토타입 열기 →
        </Link>
      </div>
      <p className="mt-4 text-center text-[11px] text-gray-400">
        본 문서/서비스는 투자 참고용이며 투자자문이 아닙니다. 최종 결정은 사용자에게 있습니다.
      </p>
    </section>
  )
}
