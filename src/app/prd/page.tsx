'use client'
import Link from 'next/link'
import { useState } from 'react'

const KAKAO_FONT = '"Apple SD Gothic Neo", Pretendard, "Noto Sans KR", system-ui, sans-serif'

export default function PRD() {
  return (
    <div style={{ fontFamily: KAKAO_FONT }} className="min-h-screen bg-white text-[#191919]">
      <TopBar />
      <Hero />
      <div className="max-w-3xl mx-auto px-5 pb-12 space-y-10 pt-8">
        <Problem />
        <Target />
        <Hypotheses />
        <Scenario />
        <Solution />
        <Composition />
        <Goals />
        <Novelty />
        <Differentiation />
        <StrategicFit />
        <Risks />
        <LiveScope />
        <Roadmap />
        <AiUsage />
        <FooterCTA />
      </div>
    </div>
  )
}

function TopBar() {
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b">
      <div className="max-w-3xl mx-auto px-5 h-[52px] flex items-center gap-4">
        <FrameLogo />
        <span aria-hidden className="h-6 w-px bg-gray-200" />
        <span className="text-sm font-bold text-[#191919]">Product Requirement Document</span>
        <Link href="/" className="ml-auto shrink-0 text-sm font-bold bg-[#FFEC47] text-[#191919] px-3.5 py-1.5 rounded-full">
          프로토타입 →
        </Link>
      </div>
    </div>
  )
}

function FrameLogo() {
  return (
    <img
      src="/logo.png"
      alt="Frame"
      width={89}
      height={32}
      className="h-8 w-auto select-none object-contain"
    />
  )
}

function Hero() {
  return (
    <header className="bg-white">
      <div className="max-w-3xl mx-auto px-5 pt-[56px] pb-4">
        <div className="text-xs font-bold text-[#3478F6] pl-0.5">카카오페이증권 · 프로덕트 빌더(시니어) 과제</div>
        <h1 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
          사용자와 성장하는 투자 에이전트, Frame
        </h1>
        <p className="mt-4 text-gray-600 text-[15px] leading-relaxed">
          혼자 사고팔다 보면 &quot;내가 이걸 왜 샀지?&quot; 싶은 순간을 Frame이 기록하고 같이 고민합니다. 투자 동반자로서
          사용자의 곁에서 함께, 더 좋은 투자를 할 수 있도록 사용자만의 투자 기준과 매매 가치관을 조금씩 단단하게 만들어갑니다.
          이렇게 쌓인 판단 기록과 프레임은 시간이 지날수록 나에게만 맞춰진 자산이 되어, 오래 쓸수록 더 단단해집니다.
          <br />
          Frame과 함께 더 이상 감으로 투자하지 말고, 나만의 투자 기법을 만들 수 있습니다.
        </p>
      </div>
    </header>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#F7F8FA] rounded-2xl p-5 ${className}`}>{children}</div>
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" className="text-gray-300">
        <path d="M7 0v13M2 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function H2({ id, kicker, title }: { id?: string; kicker: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-16">
      <div className="text-xs font-bold text-[#3478F6] pl-0.5">{kicker}</div>
      <h2 className="mt-1 text-2xl font-extrabold">{title}</h2>
    </div>
  )
}

function Problem() {
  const roots = {
    R1: { t: '프레임 부재', d: '무엇을 언제 사고 팔지에 대한 기준이 없어서, 많은 결정이 즉흥적이거나 감정적이고 남의 말에 좌우됩니다. 내가 왜 이때 이 주식을 샀는지 답변하기 어렵습니다.' },
    R2: { t: '피드백 루프 부재', d: '왜 샀는지에 대한 기록이 없어 좋은 결과가 나와도 혹은 나쁜 결과가 나와도 왜인지 분석이 체계적이지 못합니다. 그래서 다음에도 같은 실수를 반복합니다.' },
  } as const
  const [tab, setTab] = useState<keyof typeof roots>('R1')
  return (
    <section className="space-y-4">
      <H2 id="problem" kicker="Problem · 해결하려는 문제" title="정보는 넘치는데, 스스로 판단이 안 됩니다" />
      <p className="text-gray-600 text-sm">
        투자에 대한 정보는 넘쳐나고, 개인이 투자를 선택하는 판단 기준은 갈수록 희미해지고 있습니다. 최근 주식시장에서 발생하는 여러 가지 FOMO 현상과 레버리지 상품 이슈, 뇌동매매와 빚투 모두 자신의 기준과 가치가 없어서 발생한 이슈입니다.
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
      <div className="rounded-2xl bg-gradient-to-br from-red-50 to-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <span aria-hidden className="text-base">⚠️</span>
          <span className="text-sm font-extrabold text-red-700">이 결핍이 실패 패턴(증상)으로 나타납니다</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['테마·한 종목 쏠림', '고점 추격매수(FOMO)', '레버리지 과신', '리딩방 뇌동매매', '손절 실패·물타기'].map((s) => (
            <span key={s} className="text-sm font-semibold bg-white text-red-600 border border-red-200 px-3 py-1.5 rounded-full shadow-sm">
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
      <H2 id="target" kicker="Target · 타겟 고객" title="2030 초보 투자자" />
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <div className="font-bold">Who</div>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc ml-4">
            <li>모바일에 익숙하고, 유튜브로 투자를 학습합니다</li>
            <li>커뮤니티 활동이 활발하고, 소액으로 자주 매매합니다</li>
            <li>아직 자기만의 판단 기준이 없습니다</li>
          </ul>
        </Card>
        <Card>
          <div className="font-bold">Why</div>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc ml-4">
            <li>재테크가 가장 절실한 세대입니다</li>
            <li>정보를 다루는 데 익숙한 세대입니다</li>
            <li>AI를 가장 잘 활용하는 세대입니다</li>
          </ul>
        </Card>
      </div>
    </section>
  )
}

function Solution() {
  const stages = [
    { k: '① 형성', t: '프레임 형성', d: '대화로 사용자의 매매 규칙을 끌어내 저장합니다. AI는 답을 드리지 않고 되묻습니다.' },
    { k: '② 결정', t: '결정 순간 (히어로)', d: '아무 종목의 실시간·과거 데이터로 사용자의 프레임에 대조하고 반대 근거를 제시합니다. 부합·위반을 짚고, 아직 자동 판정이 어려운 규칙(뉴스·여론 등)은 "미지원"으로 정직하게 표시합니다. 결정은 사용자가 합니다.' },
    { k: '③ 기록', t: '판단 기록', d: '그때의 근거를 개인 LLM 위키이자 컨텍스트 레이어로 자동 저장합니다. 운과 실력을 분리하는 원천이 됩니다.' },
    { k: '④ 회고', t: '내 매매 돌아보기 + 진화', d: '내가 한 매매(보유내역·판단 기록)를 내 프레임으로 돌아봅니다. 원칙을 지킨 매매가 더 나았는지 운과 실력을 갈라 보고(익절/손절은 보유 종목 매입가로 실계산), 그 결과에 근거해 규칙 개정을 제안합니다. 특정 종목은 실데이터로 "그때 샀다면" 가상 시나리오도 보여줍니다. (이동평균 규칙이 있으면 전체기간 시뮬을 보너스로)' },
  ]
  const [i, setI] = useState(0)
  return (
    <section className="space-y-4">
      <H2 id="solution" kicker="Solution · 해결 방식" title="나만의 거래 프레임 강화 루프" />
      <div className="rounded-2xl bg-[#FFEC47] text-[#191919] p-5">
        <div className="text-xs font-extrabold mb-3">해결 원칙 (고정)</div>
        <div className="grid sm:grid-cols-3 gap-2">
          {[
            ['① 답을 드리지 않습니다', '프레임을 끌어내고 대조하고 되먹입니다'],
            ['② 항상 사용자 맥락에 근거합니다', '사용자의 데이터·규칙만을 근거로 합니다'],
            ['③ 결정·실행은 사용자입니다', 'human-in-the-loop'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-white p-3">
              <div className="text-sm font-bold">{t}</div>
              <div className="mt-1 text-xs text-[#191919]/70 leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
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
    </section>
  )
}

function Composition() {
  const agentFns = [
    ['프레임 끌어내기', '소크라테스식 되묻기로 매매 규칙을 대화에서 추출'],
    ['실데이터 대조 + 반대근거', '아무 종목을 내 프레임에 대조하고 악마의 변호인'],
    ['내 매매 회고', '보유내역·판단 기록을 내 프레임으로 돌아보고 운/실력을 분리'],
    ['프레임 진화', '실제 매매 결과에 근거해 규칙 개정 제안'],
  ]
  const pillars = [
    ['🧭', 'Frame 에이전트', '프레임을 끌어내고, 결정 순간 실데이터로 대조하는 촉진자. Human-in-the-loop 도구사용 에이전트입니다.'],
    ['🗂', '개인 위키 = 컨텍스트 레이어', '프레임(원칙) + 판단 기록 + 회고가 쌓이는 저장소. 쓸수록 개인화가 깊어지는 데이터 해자입니다.'],
    ['👥', '커뮤니티 다리', '프레임·근거 공유와 멘탈 케어. 발행은 사용자가 트리거하며, 지금은 라이트/목업입니다.'],
  ]
  return (
    <section className="space-y-4">
      <H2 id="composition" kicker="Architecture · 제품 구성" title="무엇으로 이루어져 있나요" />
      <p className="text-gray-600 text-sm">
        위 루프는 페이증권 앱 안에서 이렇게 담깁니다. 어느 화면에서든 <b>FAB 한 번</b>으로 불러, 대화와 위키 두 축으로 루프를 돌립니다.
      </p>

      {/* 레이어드 구성도 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
        {/* 진입 */}
        <div className="rounded-xl bg-[#F7F8FA] p-3 text-center">
          <div className="text-[11px] font-bold text-gray-400">진입 · 페이증권 앱 내</div>
          <div className="mt-1 text-sm font-bold">
            홈/종목상세 <span className="text-gray-300">→</span> <span className="text-[#191919]">🟡 FAB</span>{' '}
            <span className="text-gray-300">→</span> 바텀시트 <span className="text-gray-300">→</span> 미니앱
          </div>
        </div>
        <FlowArrow />
        {/* 미니앱 2축 */}
        <div className="rounded-xl bg-[#191919] p-3">
          <div className="text-[11px] font-bold text-gray-400 text-center">미니앱 (에이전트 기반) · 대화 + 위키 2축</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-sm font-bold text-white">💬 에이전트와의 대화 (루프 형태)</div>
              <div className="mt-0.5 text-xs text-gray-300 leading-relaxed">
                사용자만의 투자 방법을 만들고, 실제 투자법과 매매를 대조·회고하여 개선하는 루프로 나만의 매매법을 고도화하는 에이전트 루프
              </div>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-sm font-bold text-white">🗂 LLM 위키 (컨텍스트 축적)</div>
              <div className="mt-0.5 text-xs text-gray-300 leading-relaxed">
                행동과 판단을 기록·회고하는 루프로 사용자만의 히스토리가 쌓이고, 이것이 에이전트 개인화와 매매법 개선의 맥락이 됨
              </div>
            </div>
          </div>
        </div>
        <FlowArrow />
        {/* 에이전트 기능 (Sonnet 기반) */}
        <div className="rounded-xl bg-[#FFEC47] p-3">
          <div className="text-[11px] font-bold text-[#191919]/50 text-center">에이전트 · Claude Sonnet 기반 기능</div>
          <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
            {agentFns.map(([t, d]) => (
              <div key={t} className="rounded-lg bg-white/70 px-3 py-2">
                <div className="text-xs font-bold text-[#191919]">{t}</div>
                <div className="mt-0.5 text-[11px] text-[#191919]/60 leading-snug">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <FlowArrow />
        {/* 데이터 */}
        <div className="rounded-xl bg-[#F7F8FA] p-3 text-center">
          <div className="text-[11px] font-bold text-gray-400">데이터 · 현재 과제 프로토타입 구성</div>
          <div className="mt-1 text-sm font-bold">
            토스증권 오픈 API <span className="text-gray-400 font-medium">(주)</span> <span className="text-gray-300">↔</span> Yahoo Finance{' '}
            <span className="text-gray-400 font-medium">(폴백)</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 leading-relaxed">
            ※ 토스 API의 allow-IP 정책으로 배포 환경에서는 실질적으로 Yahoo Finance API를 호출합니다.
          </div>
        </div>
      </div>

      {/* 3대 기둥 */}
      <div className="grid md:grid-cols-3 gap-3">
        {pillars.map(([icon, t, d]) => (
          <Card key={t}>
            <div className="text-2xl" aria-hidden>
              {icon}
            </div>
            <div className="mt-1.5 font-bold">{t}</div>
            <div className="mt-1 text-sm text-gray-600">{d}</div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Novelty() {
  return (
    <section className="space-y-4">
      <H2 id="novelty" kicker="Novelty · 무엇이 새로운가" title="기능이 아닌 목표" />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          ['입장', '"답을 거부하는 AI"', '모두가 시그널·예측을 줄 때, Frame은 일부러 답을 드리지 않고 판단력을 키웁니다.'],
          ['개입 순간', '결정 직전, 앱 안', '구매 버튼을 누르기 직전, 페이증권 안에서 사용자의 규칙을 실데이터로 대조합니다.'],
          ['루프', '프레임의 자기 진화', '사용자의 규칙을 사용자의 결과로 채점해, 규칙을 데이터로 개정합니다.'],
        ].map(([k, t, d]) => (
          <Card key={t}>
            <div className="text-xs font-bold text-[#c9a800]">{k}</div>
            <div className="mt-1 font-bold">{t}</div>
            <div className="mt-1 text-sm text-gray-600">{d}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="text-xs font-bold text-[#c9a800]">복리</div>
        <div className="mt-1 font-bold">쓸수록 대체 불가능한 데이터 해자</div>
        <div className="mt-1 text-sm text-gray-600">
          프레임·판단 기록이 쌓일수록 개인화가 깊어지고, 프레임이 사용자의 결과로 스스로 진화합니다. 사용자 본인이 쌓은 맥락이라, 경쟁사가 복제할 수 없는 스위칭 코스트가 됩니다.
        </div>
      </Card>
    </section>
  )
}

function Hypotheses() {
  return (
    <section className="space-y-4">
      <H2 id="hypo" kicker="Hypothesis & Metrics · 가설과 검증 지표" title="가설과 검증 지표" />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          ['H1', '결정 순간 "내 프레임"에 대조시키면, 근거 있는 결정이 늘고 뇌동·추격매수가 줄어듭니다.'],
          ['H2', '판단을 기록하고 결과와 되먹이면(회고·진화), 운과 실력이 분리되어 판단력이 자랍니다.'],
          ['H3', '프레임이 생기면 감정 매매(FOMO·패닉)가 줄고, 근거 있는 결정이 늘어 판단의 질이 좋아집니다.'],
        ].map(([h, d]) => (
          <Card key={h}>
            <div className="font-extrabold text-[#c9a800]">{h}</div>
            <div className="mt-1 text-sm text-gray-600">{d}</div>
          </Card>
        ))}
      </div>
      <Card className="!bg-white border border-gray-200 pb-2 text-[#191919]">
        <div className="text-base font-extrabold text-[#c9a800]">검증 지표</div>
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
                <tr key={a} className="border-t border-black/10">
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap align-top">{a}</td>
                  <td className="py-2 text-[#191919]/70">{b}</td>
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
        <Card>
          <div className="font-bold text-gray-500">기존 (증권봇 · AI인사이트)</div>
          <ul className="mt-2 text-sm text-gray-500 space-y-1 list-disc ml-4">
            <li>Q&A·정보 제공·시그널/예측에 머무릅니다</li>
            <li>답을 주고, 사용자의 판단을 대신합니다</li>
            <li>사후 매매일지·사전 스크리너·별개 챗봇으로 분절되어 있습니다</li>
          </ul>
        </Card>
        <Card className="!bg-[#191919]">
          <div className="font-bold text-white">우리 (Frame 에이전트)</div>
          <ul className="mt-2 text-sm text-gray-300 space-y-1 list-disc ml-4">
            <li>판단 프레임을 키워 판단력을 성장시킵니다</li>
            <li>답을 거부하고, 결정 직전에 개입합니다</li>
            <li>형성→결정→기록→진화를 하나의 프레임으로 관통합니다</li>
          </ul>
        </Card>
      </div>
    </section>
  )
}

function LiveScope() {
  const items = [
    'Frame 대화(Sonnet)',
    '프레임 형성·편집',
    '결정 대조(실데이터)',
    '회고(내 매매 돌아보기·가상 시나리오)',
    '프레임 진화(제안·적용)',
    '증권사 오픈 API(토스증권) 실연동',
    '판단 기록',
  ]
  return (
    <section className="space-y-4">
      <H2 id="live" kicker="Live · 지금 실제 동작" title="프로토타입에서 실제로 도는 것" />
      <Card className="!bg-white border border-emerald-200">
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span key={it} className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
              ✓ {it}
            </span>
          ))}
        </div>
      </Card>
    </section>
  )
}

function Roadmap() {
  return (
    <section className="space-y-4">
      <H2 id="roadmap" kicker="Roadmap · 로드맵" title="판단에서 시작해, 나만의 트레이딩 프로덕트로" />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          ['Phase 1 · 지금(MVP)', '#22a06b', ['프레임 루프 설계 구현', '증권사 오픈 API(토스증권) 실연동 · Sonnet 에이전트', '탐색형 프로토타입']],
          ['Phase 2 · 확장', '#f0a020', ['유튜브 온램프 실동작', '커뮤니티 근거공유 실동작', '정식 백테스트']],
          ['Phase 3 · 비전', '#8f7ee7', ['감정 코치 에이전트', '멀티에이전트 · 카톡 실연동', '조건 알림 → 모의 자동주문']],
        ].map(([t, c, items], idx) => (
          <Card key={t as string} className={['!bg-[#FFFAC2]', '!bg-[#FFF285]', '!bg-[#FFEC47]'][idx]}>
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
  const pipeline: [string, string][] = [
    ['문제 정의 · PRD', 'Claude와 “질문 우선” 브레인스토밍으로 표면 요구가 아니라 “프레임(판단 기준) 부재”라는 진짜 문제까지 파고들어 정의'],
    ['설계', '합의된 내용을 스펙 문서 → 구현 계획으로 구조화(docs/specs·plans). “무엇을·왜”를 코드보다 먼저 고정'],
    ['구현', '태스크별 서브에이전트를 병렬로 오케스트레이션하고, 각 태스크마다 스펙 준수 → 코드 품질 2단 리뷰 게이트를 통과시킴'],
    ['검증', '브라우저 자동화로 에이전트가 직접 시연·확인(스크린샷·DOM·콘솔·실측)하고, 통과분만 커밋'],
    ['반복', '실데이터 프로토타입에서 바로 확인 → 대화 한 번에 개선·재검증(Build → Measure → Learn)'],
  ]
  const principles: [string, string][] = [
    ['결정론 / LLM 분리', 'LLM은 이해·추출·제안만, 신호·엣지·수치 판정은 결정론적 코드로. 환각을 막고 결과를 검증 가능하게'],
    ['정직한 범위 표기', '실데이터로 되는 것만 “실데이터”, 안 되는 건 “미지원·범위 밖”으로 명시 — 과장 없이'],
    ['회귀 안전망', '코어 로직 TDD(테스트 60개 통과)·타입 체크로 매 변경을 자동 검증'],
  ]
  const tools = [
    'Claude Code · 서브에이전트 오케스트레이션',
    'MCP(로고 생성 등)',
    '브라우저 자동화 자가검증',
    'Next.js · TypeScript',
    '실데이터(토스증권 · Yahoo)',
  ]
  return (
    <section className="space-y-4">
      <H2 id="ai" kicker="How we build · AI 프로덕트 빌딩" title="AI로 어떻게 만들고 검증하나요" />

      {/* 1) End-to-End 파이프라인 */}
      <Card>
        <div className="text-xs font-bold text-gray-400 mb-2">문제 정의부터 검증까지 — 재현 가능한 파이프라인</div>
        <ol className="space-y-2.5">
          {pipeline.map(([label, desc], i) => (
            <li key={label} className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 grid place-items-center rounded-full bg-[#191919] text-white text-[10px] font-extrabold">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#191919]">{label}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{desc}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 text-[11px] text-gray-400 leading-relaxed">
          바이브 코딩을 “즉흥”이 아니라 <b className="text-gray-600">스킬 기반의 구조화된 오케스트레이션</b>으로 — 개인 생산성을 넘어 팀이 재현할 수 있는 일하는 방식으로 설계했습니다.
        </div>
      </Card>

      {/* 2) 신뢰 원칙 */}
      <div className="grid sm:grid-cols-3 gap-2">
        {principles.map(([t, d]) => (
          <div key={t} className="rounded-xl bg-white border border-black/5 p-3">
            <div className="text-sm font-bold text-[#191919]">{t}</div>
            <div className="mt-1 text-xs text-gray-600 leading-relaxed">{d}</div>
          </div>
        ))}
      </div>

      {/* 3) 도구 + 메타 강조 */}
      <Card>
        <div className="flex flex-wrap gap-1.5">
          {tools.map((t) => (
            <span key={t} className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-[#FFF9DB] border border-[#FFEC47] p-3 text-sm text-[#191919] leading-relaxed">
          이 <b>PRD · 프로토타입 · 지금 보시는 이 문서</b>까지 전부 이 방식으로 만들었어요. 금융/투자 도메인에서 <b>0 → 1</b>을, 요청 한 번에 <b>기능 추가 → 브라우저 검증 → 커밋</b>으로 돌립니다.
        </div>
      </Card>
    </section>
  )
}

function Scenario() {
  const steps = [
    ['① 투자 에이전트 프레임과 대화', '대화로 "왜 사고, 언제 파는가"를 끌어내 규칙 3개를 저장합니다. 투자 시점을 단언하기보다, 사용자의 판단을 지원하고 평가합니다.'],
    ['② 결정 순간', '삼성전자를 사려 할 때, 프레임 에이전트가 "반도체 비중이 이미 62% — 쏠림" 위반을 짚습니다. 지훈은 매수를 보류합니다.'],
    ['③ 기록', '"오늘은 감정적이었다"를 근거로 남깁니다. 나중에 운과 실력을 가릴 씨앗이 됩니다.'],
    ['④ 회고·진화', '한 달 뒤, 그동안의 매매를 프레임으로 돌아보니 "고점회피 규칙을 지킨 매매가 오히려 −13%p 낮았음"을 확인하고 규칙을 완화합니다.'],
  ]
  return (
    <section className="space-y-4">
      <H2 id="scenario" kicker="User Scenario · 핵심 사용자 시나리오" title="지훈, 25세 — 삼성전자에 물린 직장인" />
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <div className="inline-flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-extrabold tracking-wide text-white bg-red-500 px-2 py-0.5 rounded-full">BEFORE</span>
        </div>
        <div className="text-sm font-medium text-red-900">
          유튜브를 보고 고점에 샀지만, 왜 샀는지 설명하지 못합니다. 커뮤니티를 보며 불안해하고, 손절과 물타기를 반복합니다. 다음에도 똑같습니다.
        </div>
      </div>
      <FlowArrow />
      <div className="space-y-2">
        {steps.map(([t, d], idx) => (
          <div key={t}>
            {idx > 0 && <FlowArrow />}
            <Card>
              <div className="font-bold text-sm">{t}</div>
              <div className="mt-1 text-sm text-gray-600">{d}</div>
            </Card>
          </div>
        ))}
      </div>
      <FlowArrow />
      <div className="rounded-2xl bg-white border border-gray-200 p-5">
        <div className="inline-flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-extrabold tracking-wide text-white bg-emerald-600 px-2 py-0.5 rounded-full">AFTER</span>
        </div>
        <div className="text-sm font-medium text-emerald-900">
          남을 따라가지 않고 <b>자기 기준</b>으로 결정하며, 그 판단이 데이터로 쌓여 <b>점점 나아집니다.</b>
        </div>
      </div>
    </section>
  )
}

function Goals() {
  return (
    <section className="space-y-4">
      <H2 id="goals" kicker="Goals & Non-goals · 목표와 비목표" title="무엇을 하고, 무엇을 하지 않나요" />
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="!bg-[#E8F8E8]">
          <div className="font-bold text-emerald-700">목표 (Goals)</div>
          <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc ml-4">
            <li>사용자가 자기만의 거래 프레임을 갖도록 돕습니다</li>
            <li>결정 순간, 근거 있는 판단을 늘립니다 (뇌동·추격 차단)</li>
            <li>판단을 기록하고 컨텍스트로 쌓아 맥락을 발전시킵니다</li>
            <li>좋은 매매법이 나오도록 조언을 아끼지 않습니다</li>
          </ul>
        </Card>
        <Card className="!bg-[#FFEDED]">
          <div className="font-bold text-red-600">비목표 (Non-goals · 의도된 절제)</div>
          <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc ml-4">
            <li>종목 추천이나 "사라/팔아라" 답을 드리지 않습니다</li>
            <li>자동매매·자동주문을 하지 않습니다 (human-in-the-loop)</li>
            <li>수익률을 보장하거나 예측하지 않습니다</li>
            <li>사용자의 판단을 대체하지 않습니다</li>
            <li>투자·프레임과 무관한 질문엔 답하지 않습니다 (LLM 범용 남용 차단)</li>
          </ul>
        </Card>
      </div>
    </section>
  )
}

function StrategicFit() {
  return (
    <section className="space-y-4">
      <H2 id="fit" kicker="Strategic Fit · 전략적 적합성" title="왜 카카오페이증권이 이걸 해야 하나요" />
      <div className="grid md:grid-cols-2 gap-3">
        {[
          ['리텐션 해자', '이미 확보된 리텐션 위에서 프레임·판단 기록이 쌓일수록 개인화가 깊어지고, 이탈 비용이 커집니다.'],
          ['차별화', '"마음 놓고 금융하다" — 다른 증권봇·AI인사이트가 "답"을 줄 때, 판단력을 키우는 유일한 결입니다.'],
          ['자산 활용', '이미 활성화된 커뮤니티와 2030 초보 유저베이스에 자연스럽게 얹힙니다.'],
          ['브랜드 정합', '"쉽고 친근하게, 스스로 투자하게" — 그 누구보다 가까이 있는 나만의 투자 에이전트로 포지셔닝합니다.'],
        ].map(([t, d]) => (
          <Card key={t} className="!bg-[#FFEC47]">
            <div className="font-bold">{t}</div>
            <div className="mt-1 text-sm text-[#191919]/70">{d}</div>
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
    ['회고 과최적화·표본 부족', '"정답 아닌 참고"로 상시 고지 + 표본 적으면 "판단 이르다"로 폴백, 구간 편향 경고'],
    ['투자자문 규제', "자문이 아닌 '보완' — 개별 종목 매수·매도 지시 안 함, 면책 고지"],
    ['데이터/자막 한계', '제공자 추상화(토스↔Yahoo 스왑) + 온램프 폴백'],
    ['채택 저항(프레임=노동)', 'AI가 대화로 초안 대신 작성 + 예시 프레임 제공'],
    ['LLM 남용·프롬프트 인젝션', '도메인 화이트리스트 제한 + 내·외부 지시 무시 + 시스템 프롬프트 비노출'],
  ]
  return (
    <section className="space-y-4">
      <H2 id="risk" kicker="Risks & Mitigations · 리스크와 완화" title="무엇이 위험하고, 어떻게 막나요" />
      <Card className="!bg-white border border-gray-200 py-3">
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

function FooterCTA() {
  return (
    <section>
      <hr className="border-t border-gray-200 mb-8" />
      <div className="bg-[#191919] rounded-2xl p-6 text-center">
        <div className="font-extrabold text-lg text-white">프로토타입 바로가기</div>
        <div className="mt-2 text-sm text-gray-300 leading-relaxed">
          실제 Sonnet 모델이 연결되어 동작합니다. 간단한 에이전트 튜닝이 포함되어 있습니다.
          <br />
          <span className="text-gray-500">과제 평가 이외의 목표로는 사용을 자제해주세요.</span>
        </div>
        <Link href="/" className="inline-block mt-3 bg-[#FFEC47] text-[#191919] px-5 py-2.5 rounded-full font-semibold">
          프로토타입 →
        </Link>
      </div>
    </section>
  )
}
