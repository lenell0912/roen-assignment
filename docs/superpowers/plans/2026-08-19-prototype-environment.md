# 프로토타입 환경 재구축 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데스크톱 와이드 에이전트 지면을 "폰 프레임(iPhone 16 Pro 비율) 안 순수 제품 + 프레임 밖 도슨트 패널" 구조로 재구축한다. 주 경로는 대화(FAB→채팅으로 루프 완주), 보너스는 화면 맥락 상속.

**Architecture:** `page.tsx` → `DemoStage`(전체 상태) → `PhoneFrame`(홈/검색/종목상세 + `MiniApp` 오버레이) + `DocentPanel`(체크리스트·내레이션·배지·초기화). 기능은 대화 안으로(인라인 카드), 기존 Decision/Retro/Frame 페이지는 카드의 상세 뷰로 재활용. 진행 상태는 `lib/demo.ts`(localStorage + CustomEvent)로 프레임 안팎이 통신한다.

**Tech Stack:** Next.js 14 (app router), React 18, Tailwind, Anthropic SDK(도구 사용 루프), vitest(node 환경, `src/test/*.test.ts`, 상대경로 import).

**Spec:** [docs/superpowers/specs/2026-08-19-prototype-environment-design.md](../specs/2026-08-19-prototype-environment-design.md)

**전제:** `.env.local`에 ANTHROPIC_API_KEY, TOSS_CLIENT_ID/SECRET 존재(기존 그대로). 홈 스크린샷은 `public/screens/home.png`에 사용자가 넣으면 오버레이되고, 없으면 코드 폴백 홈이 뜬다.

---

### Task 1: 종목 리졸버 라이브러리 (`lib/stocks.ts`)

이름/별칭/6자리 코드 → 종목 해석. 검색 화면과 에이전트 `resolve_stock` 도구가 공용.

**Files:**
- Create: `src/lib/stocks.ts`
- Test: `src/test/stocks.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/test/stocks.test.ts
import { describe, it, expect } from 'vitest'
import { searchStocks, STOCKS } from '../lib/stocks'

describe('searchStocks', () => {
  it('정확한 이름은 1순위로 찾는다', () => {
    expect(searchStocks('삼성전자')[0]).toMatchObject({ code: '005930', name: '삼성전자' })
  })
  it('별칭으로 찾는다', () => {
    expect(searchStocks('삼전')[0].code).toBe('005930')
    expect(searchStocks('네이버')[0].code).toBe('035420')
  })
  it('부분 일치는 여러 개를 돌려준다 (카카오 계열)', () => {
    const names = searchStocks('카카오').map((s) => s.name)
    expect(names).toContain('카카오')
    expect(names).toContain('카카오뱅크')
    expect(names.indexOf('카카오')).toBe(0) // 정확 일치 우선
  })
  it('6자리 코드는 리스트에 있으면 그 종목, 없으면 코드 그대로 통과시킨다(열린 탐색)', () => {
    expect(searchStocks('005930')[0].name).toBe('삼성전자')
    expect(searchStocks('123450')[0]).toMatchObject({ code: '123450' })
  })
  it('빈 질의/미지 종목은 빈 배열', () => {
    expect(searchStocks('')).toEqual([])
    expect(searchStocks('없는종목이름')).toEqual([])
  })
  it('STOCKS 코드는 중복이 없다', () => {
    const codes = STOCKS.map((s) => s.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/stocks.test.ts`
Expected: FAIL — `Cannot find module '../lib/stocks'`

- [ ] **Step 3: 구현**

```ts
// src/lib/stocks.ts
// 국내 주요 종목 정적 사전 — 검색 화면과 에이전트 resolve_stock 도구가 공용.
// 사전에 없는 6자리 코드도 통과시켜 열린 탐색(아무 종목)을 보장한다.
export interface StockInfo {
  code: string
  name: string
  aliases?: string[]
}

export const STOCKS: StockInfo[] = [
  { code: '005930', name: '삼성전자', aliases: ['삼전'] },
  { code: '000660', name: 'SK하이닉스', aliases: ['하이닉스'] },
  { code: '373220', name: 'LG에너지솔루션', aliases: ['엔솔', '엘지엔솔'] },
  { code: '207940', name: '삼성바이오로직스', aliases: ['삼바'] },
  { code: '005380', name: '현대차', aliases: ['현대자동차'] },
  { code: '000270', name: '기아' },
  { code: '068270', name: '셀트리온' },
  { code: '005490', name: 'POSCO홀딩스', aliases: ['포스코'] },
  { code: '035420', name: 'NAVER', aliases: ['네이버'] },
  { code: '035720', name: '카카오' },
  { code: '051910', name: 'LG화학' },
  { code: '006400', name: '삼성SDI' },
  { code: '105560', name: 'KB금융' },
  { code: '055550', name: '신한지주' },
  { code: '086790', name: '하나금융지주' },
  { code: '032830', name: '삼성생명' },
  { code: '015760', name: '한국전력', aliases: ['한전'] },
  { code: '017670', name: 'SK텔레콤', aliases: ['skt'] },
  { code: '030200', name: 'KT' },
  { code: '066570', name: 'LG전자' },
  { code: '096770', name: 'SK이노베이션' },
  { code: '010130', name: '고려아연' },
  { code: '009150', name: '삼성전기' },
  { code: '012330', name: '현대모비스' },
  { code: '028260', name: '삼성물산' },
  { code: '010950', name: 'S-Oil', aliases: ['에스오일'] },
  { code: '011200', name: 'HMM' },
  { code: '042700', name: '한미반도체' },
  { code: '247540', name: '에코프로비엠' },
  { code: '086520', name: '에코프로' },
  { code: '293490', name: '카카오게임즈' },
  { code: '259960', name: '크래프톤' },
  { code: '036570', name: '엔씨소프트', aliases: ['엔씨'] },
  { code: '251270', name: '넷마블' },
  { code: '377300', name: '카카오페이' },
  { code: '323410', name: '카카오뱅크', aliases: ['카뱅'] },
  { code: '000810', name: '삼성화재' },
  { code: '329180', name: 'HD현대중공업' },
  { code: '042660', name: '한화오션' },
  { code: '012450', name: '한화에어로스페이스', aliases: ['한화에어로'] },
  { code: '064350', name: '현대로템' },
  { code: '272210', name: '한화시스템' },
  { code: '196170', name: '알테오젠' },
  { code: '328130', name: '루닛' },
  { code: '277810', name: '레인보우로보틱스' },
]

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

/** 이름/별칭/코드로 종목 검색. 정확 일치 > 접두 일치 > 포함 > 별칭 순으로 랭킹. */
export function searchStocks(query: string, limit = 8): StockInfo[] {
  const q = norm(query)
  if (!q) return []

  // 6자리 코드: 사전 우선, 없으면 코드 그대로 통과(열린 탐색)
  if (/^\d{6}$/.test(q)) {
    const hit = STOCKS.find((s) => s.code === q)
    return [hit ?? { code: q, name: `종목 ${q}` }]
  }

  const scored = STOCKS.map((s) => {
    const name = norm(s.name)
    const aliases = (s.aliases ?? []).map(norm)
    let score = 0
    if (name === q) score = 100
    else if (aliases.includes(q)) score = 90
    else if (name.startsWith(q)) score = 80
    else if (name.includes(q)) score = 60
    else if (aliases.some((a) => a.includes(q))) score = 40
    return { s, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((x) => x.s)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/test/stocks.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/stocks.ts src/test/stocks.test.ts
git commit -m "feat(proto): 종목 리졸버 — 이름/별칭/코드 검색, 미지 코드 통과(열린 탐색)"
```

---

### Task 2: 데모 진행 상태 라이브러리 (`lib/demo.ts`)

도슨트 체크리스트의 단일 원본. 프레임 안 컴포넌트가 `markStep()`을 쏘면 CustomEvent로 패널이 갱신된다.

**Files:**
- Create: `src/lib/demo.ts`
- Test: `src/test/demo.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/test/demo.test.ts
import { describe, it, expect } from 'vitest'
import { DEMO_STEPS, nextStep, DemoProgress } from '../lib/demo'

describe('DEMO_STEPS', () => {
  it('6개 스텝, id 중복 없음, 보너스는 마지막 1개', () => {
    expect(DEMO_STEPS).toHaveLength(6)
    expect(new Set(DEMO_STEPS.map((s) => s.id)).size).toBe(6)
    expect(DEMO_STEPS.filter((s) => s.bonus)).toHaveLength(1)
    expect(DEMO_STEPS[DEMO_STEPS.length - 1].bonus).toBe(true)
  })
})

describe('nextStep', () => {
  it('진행 없음 → 첫 스텝(open)', () => {
    expect(nextStep({})?.id).toBe('open')
  })
  it('중간 진행 → 안 한 것 중 첫 번째', () => {
    const p: DemoProgress = { open: true, frame: true }
    expect(nextStep(p)?.id).toBe('compare')
  })
  it('본 스텝 완료 → 보너스', () => {
    const p: DemoProgress = { open: true, frame: true, compare: true, retro: true, wiki: true }
    expect(nextStep(p)?.id).toBe('context')
  })
  it('전부 완료 → null', () => {
    const p: DemoProgress = { open: true, frame: true, compare: true, retro: true, wiki: true, context: true }
    expect(nextStep(p)).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/demo.test.ts`
Expected: FAIL — `Cannot find module '../lib/demo'`

- [ ] **Step 3: 구현**

주의: vitest는 node 환경이므로 localStorage 접근은 전부 `typeof window` 가드 필수.

```ts
// src/lib/demo.ts
// 데모(도슨트) 진행 상태 — 프레임 안 제품이 markStep을 쏘고, 프레임 밖 패널이 구독한다.
import { resetFrame } from './frameStore'
import { clearRecords } from './records'

export type DemoStepId = 'open' | 'frame' | 'compare' | 'retro' | 'wiki' | 'context'

export interface DemoStep {
  id: DemoStepId
  label: string
  narration: string
  bonus?: boolean
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'open',
    label: 'FAB으로 코파일럿 호출',
    narration: '폰 화면 오른쪽 아래 노란 버튼(FAB)을 눌러 코파일럿을 불러보세요. 실서비스에선 페이증권 앱 어느 화면에나 떠 있습니다.',
  },
  {
    id: 'frame',
    label: '대화로 내 매매 원칙 만들기',
    narration: '칩 [내 매매 원칙 만들기]를 누르거나, 평소 매매 습관을 편하게 말해보세요. 대화에서 합의된 원칙은 자동으로 저장됩니다.',
  },
  {
    id: 'compare',
    label: '아무 종목이나 내 원칙에 대조',
    narration: '"삼성전자 지금 사도 될까?"처럼 물어보세요. 어떤 종목이든 실시간 데이터로 내 원칙에 대조하고 반대 근거까지 보여줍니다. 답은 주지 않습니다 — 판단은 당신 몫.',
  },
  {
    id: 'retro',
    label: '회고 — 원칙을 과거에 검증',
    narration: '"이 원칙으로 과거엔 어땠을까?"라고 물어보세요. 실제 과거 데이터에 원칙을 대입해 되먹입니다(정답이 아니라 참고).',
  },
  {
    id: 'wiki',
    label: '위키에서 쌓인 기록 확인',
    narration: '하단 위키 탭을 열어보세요. 원칙과 판단 기록이 쌓입니다 — 판단력이 자라는 물리적 실체입니다.',
  },
  {
    id: 'context',
    label: '⭐ 종목상세에서 다시 불러보기',
    narration: '코파일럿을 닫고, 홈에서 종목을 검색해 상세 화면으로 간 뒤 FAB을 다시 눌러보세요 — 보고 있던 화면의 맥락을 알고 옵니다.',
    bonus: true,
  },
]

export type DemoProgress = Partial<Record<DemoStepId, boolean>>

/** 다음 안내 스텝: 본 스텝 먼저, 다 되면 보너스, 전부 완료면 null */
export function nextStep(progress: DemoProgress): DemoStep | null {
  return DEMO_STEPS.find((s) => !progress[s.id]) ?? null
}

const KEY = 'demo_v1'
export const DEMO_EVENT = 'demo:update'

export function loadProgress(): DemoProgress {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as DemoProgress
  } catch {
    return {}
  }
}

export function markStep(id: DemoStepId): void {
  if (typeof window === 'undefined') return
  const cur = loadProgress()
  if (cur[id]) return
  localStorage.setItem(KEY, JSON.stringify({ ...cur, [id]: true }))
  window.dispatchEvent(new CustomEvent(DEMO_EVENT))
}

/** 데모 초기화 — 원칙·기록·진행 전부 삭제 */
export function resetDemo(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  resetFrame()
  clearRecords()
  window.dispatchEvent(new CustomEvent(DEMO_EVENT))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/test/demo.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/demo.ts src/test/demo.test.ts
git commit -m "feat(proto): 데모 진행 상태 라이브러리 — 체크리스트 스텝·markStep·resetDemo"
```

---

### Task 3: 대화→프레임 저장 검증 함수 (`rulesFromToolInput`)

에이전트의 `update_frame` 도구 입력(LLM 생성 JSON)을 안전한 `Rule[]`로 정제한다.

**Files:**
- Modify: `src/lib/frame.ts` (파일 끝에 추가)
- Test: `src/test/frame.test.ts` (기존 파일 끝에 추가)

- [ ] **Step 1: 실패하는 테스트 추가**

`src/test/frame.test.ts` 파일 끝에 추가 (기존 import에 `rulesFromToolInput` 추가):

```ts
import { rulesFromToolInput } from '../lib/frame'

describe('rulesFromToolInput', () => {
  it('유효한 규칙을 Rule[]로 변환하고 id를 부여한다', () => {
    const rules = rulesFromToolInput({
      rules: [
        { kind: 'buy', text: '정배열에서만 산다', check: { type: 'sma_cross', fast: 5, slow: 20 } },
        { kind: 'sell', text: '근거가 깨지면 판다' },
      ],
    })
    expect(rules).toHaveLength(2)
    expect(rules[0].id).toBeTruthy()
    expect(rules[0].check).toMatchObject({ type: 'sma_cross' })
    expect(rules[1].check).toBeUndefined()
  })
  it('모르는 kind는 버리고, 모르는 check.type은 check만 제거한다', () => {
    const rules = rulesFromToolInput({
      rules: [
        { kind: 'hold', text: '이상한 종류' },
        { kind: 'risk', text: '쏠림 방지', check: { type: 'magic', x: 1 } },
        { kind: 'buy', text: '   ' },
      ],
    })
    expect(rules).toHaveLength(1)
    expect(rules[0].text).toBe('쏠림 방지')
    expect(rules[0].check).toBeUndefined()
  })
  it('입력이 이상하면 빈 배열', () => {
    expect(rulesFromToolInput(null)).toEqual([])
    expect(rulesFromToolInput({ rules: 'x' })).toEqual([])
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/frame.test.ts`
Expected: FAIL — `rulesFromToolInput is not a function` (기존 테스트는 PASS 유지)

- [ ] **Step 3: 구현 — `src/lib/frame.ts` 파일 끝에 추가**

```ts
// ── 대화(update_frame 도구) 입력 → 안전한 Rule[] 정제 ──
const RULE_KINDS: RuleKind[] = ['buy', 'sell', 'risk']
const CHECK_TYPES = ['sma_cross', 'price_vs_high', 'sector_concentration']

export function rulesFromToolInput(input: any): Rule[] {
  const arr = Array.isArray(input?.rules) ? input.rules : []
  return arr
    .filter((r: any) => r && RULE_KINDS.includes(r.kind) && typeof r.text === 'string' && r.text.trim())
    .map((r: any, i: number) => ({
      id: `r${Date.now()}_${i}`,
      kind: r.kind as RuleKind,
      text: r.text.trim(),
      check: r.check && CHECK_TYPES.includes(r.check.type) ? (r.check as MachineCheck) : undefined,
    }))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/test/frame.test.ts`
Expected: PASS (기존 + 신규 3)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/frame.ts src/test/frame.test.ts
git commit -m "feat(proto): update_frame 도구 입력 정제 함수 rulesFromToolInput"
```

---

### Task 4: 에이전트 백엔드 — 도구 2개 추가 + 도구 출력 반환 + 페르소나 갱신

`resolve_stock`(이름→코드), `update_frame`(대화→원칙 저장). `/api/chat`이 도구 **출력**까지 클라이언트에 돌려줘야 인라인 카드를 그릴 수 있다. 프레임 없으면 대조/회고 도구가 정직하게 거절한다. 추가로 ① 토스 실패 시 Yahoo **런타임 자동 폴백**(서버리스 IP 정책 대비 — 스펙 리스크 항목), ② "모르면 모른다" 정직 처리 페르소나 명문화(스펙 §7 가드레일).

**Files:**
- Modify: `src/lib/tools.ts` (전체 교체)
- Modify: `src/lib/persona.ts` (전체 교체)
- Modify: `src/lib/market/index.ts` (전체 교체 — 자동 폴백)
- Modify: `src/app/api/chat/route.ts:39-45` (usedTools에 output 포함)

- [ ] **Step 1: `src/lib/tools.ts` 전체 교체**

```ts
import { getQuote } from './market'
import { getPortfolio, compareToFrame, runBacktest } from './capabilities'
import { Frame } from './frame'
import { searchStocks } from './stocks'

export const TOOLS = [
  {
    name: 'resolve_stock',
    description:
      '종목 이름·별칭으로 6자리 종목코드를 찾는다. 사용자가 종목을 이름으로 말하면 다른 도구보다 먼저 호출해라. matches가 비면 코드를 직접 물어봐라.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: '종목 이름/별칭/코드' } },
      required: ['query'],
    },
  },
  {
    name: 'get_quote',
    description: '종목의 실시간 현재가/등락률 조회',
    input_schema: { type: 'object', properties: { code: { type: 'string', description: '6자리 종목코드' } }, required: ['code'] },
  },
  {
    name: 'get_portfolio',
    description: '사용자의 보유 종목과 섹터별 비중(쏠림 확인용)',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'compare_to_frame',
    description: '특정 종목을 사용자의 거래 프레임(규칙)에 실데이터로 대조. 각 규칙 부합/위반을 돌려준다.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
  },
  {
    name: 'run_backtest',
    description: '사용자 프레임의 이동평균 규칙을 종목 과거 데이터에 대입(회고). 규칙대로 매매 시 성과 vs 바이앤홀드.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
  },
  {
    name: 'update_frame',
    description:
      '대화에서 사용자와 합의된 매매 원칙을 저장한다. 규칙을 새로 만들었거나 다듬었으면 반드시 호출. rules는 기존을 포함한 전체 교체본이다. 이동평균/고점추격/쏠림 규칙엔 check를 붙이면 자동 대조가 가능해진다.',
    input_schema: {
      type: 'object',
      properties: {
        rules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['buy', 'sell', 'risk'] },
              text: { type: 'string', description: '사용자 언어의 규칙 한 문장' },
              check: {
                type: 'object',
                description:
                  '자동체크(선택): {"type":"sma_cross","fast":5,"slow":20} | {"type":"price_vs_high","window":60,"minPctBelowHigh":10} | {"type":"sector_concentration","maxPct":40}',
              },
            },
            required: ['kind', 'text'],
          },
        },
      },
      required: ['rules'],
    },
  },
] as const

export async function runTool(name: string, input: any, ctx: { frame?: Frame }): Promise<any> {
  switch (name) {
    case 'resolve_stock':
      return { matches: searchStocks(input.query, 5) }
    case 'get_quote':
      return await getQuote(input.code)
    case 'get_portfolio':
      return getPortfolio()
    case 'compare_to_frame':
      if (!ctx.frame || ctx.frame.rules.length === 0)
        return { noFrame: true, note: '사용자의 매매 원칙이 아직 없다. 대조 대신 팩트 브리핑(get_quote)을 하고, 원칙부터 만들자고 제안해라.' }
      return await compareToFrame(input.code, ctx.frame)
    case 'run_backtest':
      if (!ctx.frame || ctx.frame.rules.length === 0)
        return { noFrame: true, note: '사용자의 매매 원칙이 아직 없다. 원칙부터 만들자고 제안해라.' }
      return await runBacktest(input.code, ctx.frame)
    case 'update_frame':
      // 저장 자체는 클라이언트가 한다(localStorage). 여기선 입력을 그대로 인정.
      return { saved: true, count: Array.isArray(input?.rules) ? input.rules.length : 0 }
    default:
      throw new Error(`unknown tool ${name}`)
  }
}
```

- [ ] **Step 2: `src/lib/persona.ts` 전체 교체**

```ts
import { Frame } from './frame'

export interface ChatContext {
  code?: string
  name?: string
  frame?: Frame
}

export function buildSystem(ctx: ChatContext): string {
  const lines: string[] = [
    `너는 카카오페이증권의 'AI 투자 코파일럿'이다. 페르소나는 "친근한 투자 선배".`,
    `말투: 반말 섞인 친근·직설. 2030 초보에게 편하게. 한국어로, 간결하게.`,
    ``,
    `[핵심 원칙 — 반드시 지킴]`,
    `1) 절대 "사라/팔아라"로 대신 결정하지 않는다. 사용자의 "거래 프레임(자기 규칙)"을 기준으로 대조하고 되묻고 반대편 근거를 보여준다. 판단 주체는 사용자다.`,
    `2) 사용자가 종목을 이름으로 말하면 resolve_stock으로 코드를 먼저 찾는다. 못 찾으면 6자리 코드를 물어본다(추측 금지).`,
    `3) 종목 얘기가 나오면 compare_to_frame 도구로 실데이터에 대조해 근거를 댄다(추측 금지). 프레임이 없다고 도구가 답하면 get_quote로 팩트만 브리핑하고 원칙 만들기를 제안해라.`,
    `4) 회고/과거 성과를 물으면 run_backtest를 쓴다. 단 "정답이 아니라 참고"이며 미래를 보장하지 않음을 고지한다.`,
    `5) 포트폴리오 맥락이 필요하면 get_portfolio를 쓴다(쏠림 등).`,
    `6) 대화에서 사용자의 매매 원칙이 새로 만들어지거나 바뀌면 update_frame으로 저장한다(기존 규칙 포함 전체 교체본). 규칙은 3~4개면 충분하다. 저장했으면 저장됐다고 알려줘라.`,
    `7) 결정·실행·외부 공유는 사용자 몫임을 상기시킨다. 투자자문이 아니라 참고임을 자연스럽게 고지.`,
    `8) 모르는 것·도구 실패·미지원 종목은 솔직하게 "모른다/안 된다"고 말한다. 추측으로 채우지 않는다.`,
    ``,
    `[행동] (a) 내 맥락 팩트 브리핑 → (b) "왜 지금? 네 규칙엔 부합해?" 되묻기 → (c) 반대편 근거(악마의 변호인).`,
    `프레임이 비어있거나 부실하면, 규칙을 끌어내는 질문을 해라(예: "넌 어떤 종목을 왜 사? 팔 때 기준은?"). 한 번에 하나씩 물어라.`,
  ]
  if (ctx.code) {
    const label = ctx.name ? `${ctx.name}(${ctx.code})` : ctx.code
    lines.push(
      ``,
      `[현재 화면 맥락] 사용자는 페이증권 앱에서 ${label} 화면을 보다가 코파일럿을 불렀다. 첫 응답에서 이 맥락을 자연스럽게 인지하고 있음을 보여줘라.`,
    )
  }
  if (ctx.frame && ctx.frame.rules.length) {
    lines.push(``, `[사용자의 현재 거래 프레임]`)
    for (const r of ctx.frame.rules) lines.push(`- (${r.kind}) ${r.text}${r.check ? ' [자동체크]' : ''}`)
  } else {
    lines.push(``, `[사용자의 거래 프레임] 아직 없음 → 먼저 프레임을 끌어내라.`)
  }
  return lines.join('\n')
}
```

- [ ] **Step 3: `src/lib/market/index.ts` 전체 교체 — 토스 실패 시 Yahoo 런타임 자동 폴백**

```ts
import { MarketData } from './types'
import { tossProvider } from './toss'
import { yahooProvider } from './yahoo'

/** 기본 제공자는 env(MARKET_PROVIDER), name 인자로 요청별 오버라이드 가능(데모/비교용) */
function pick(name?: string): MarketData {
  const p = name ?? process.env.MARKET_PROVIDER
  return p === 'yahoo' ? yahooProvider : tossProvider
}

/** 주 제공자 실패 시 Yahoo로 자동 폴백 — 서버리스 배포에서 토스 IP 정책 등으로 죽지 않게 */
async function withFallback<T>(primary: MarketData, fn: (p: MarketData) => Promise<T>): Promise<T> {
  try {
    return await fn(primary)
  } catch (e) {
    if (primary === yahooProvider) throw e
    return await fn(yahooProvider)
  }
}

export const getQuote = (code: string, provider?: string) =>
  withFallback(pick(provider), (p) => p.getQuote(code))
export const getDailyCandles = (code: string, days?: number, provider?: string) =>
  withFallback(pick(provider), (p) => p.getDailyCandles(code, days))
export const getDailyCloses = async (code: string, days?: number, provider?: string) =>
  (await getDailyCandles(code, days, provider)).map((c) => c.close)

export type { Quote, Candle, MarketData } from './types'
```

- [ ] **Step 4: `src/app/api/chat/route.ts`의 도구 실행 블록(39-45행)을 다음으로 교체**

```ts
      const results = await Promise.all(
        toolUses.map(async (t) => {
          const out = await runTool(t.name, t.input, { frame: ctx.frame }).catch((e) => ({ error: String(e.message) }))
          usedTools.push({ name: t.name, input: t.input, output: out })
          return { type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(out) }
        }),
      )
```

(17행의 `const usedTools: { name: string; input: any }[] = []`는 `const usedTools: { name: string; input: any; output?: any }[] = []`로 변경)

- [ ] **Step 5: 전체 테스트 + 빌드 확인**

Run: `npx vitest run && npm run build`
Expected: 테스트 전부 PASS, 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/lib/tools.ts src/lib/persona.ts src/lib/market/index.ts src/app/api/chat/route.ts
git commit -m "feat(proto): 에이전트 도구 확장 — resolve_stock·update_frame, 도구 출력, 무프레임 가드, Yahoo 자동 폴백"
```

---

### Task 5: 폰 프레임 셸 + 스테이지 골격

흰 배경 스테이지 위에 iPhone 16 Pro 비율 프레임. 이 시점에서 화면은 임시 플레이스홀더(다음 태스크들이 채움).

**Files:**
- Create: `src/app/components/PhoneFrame.tsx`
- Create: `src/app/components/Fab.tsx`
- Create: `src/app/components/DemoStage.tsx`
- Modify: `src/app/page.tsx` (전체 교체)

- [ ] **Step 1: `src/app/components/PhoneFrame.tsx` 생성**

```tsx
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
```

- [ ] **Step 2: `src/app/components/Fab.tsx` 생성**

```tsx
'use client'

export function Fab({ onClick, pulse }: { onClick: () => void; pulse?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="코파일럿 열기"
      className={`absolute right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-[#fae100] shadow-lg text-2xl grid place-items-center hover:scale-105 transition ${
        pulse ? 'animate-pulse ring-4 ring-yellow-300' : ''
      }`}
    >
      🧭
    </button>
  )
}
```

- [ ] **Step 3: `src/app/components/DemoStage.tsx` 생성 (골격 — 화면들은 이후 태스크에서 교체)**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { loadFrame, isExample } from '@/lib/frameStore'
import { markStep } from '@/lib/demo'
import { PhoneFrame } from './PhoneFrame'
import { Fab } from './Fab'

export type Screen = { kind: 'home' } | { kind: 'search' } | { kind: 'stock'; code: string; name: string }
export type AgentCtx = { code?: string; name?: string }

export function DemoStage() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [agentCtx, setAgentCtx] = useState<AgentCtx | null>(null) // null = 코파일럿 닫힘
  const [frame, setFrame] = useState<Frame | null>(null) // null = 내 원칙 아직 없음(예시만 존재)

  // SSR 불일치 방지: 마운트 후 localStorage에서 읽는다
  useEffect(() => {
    if (!isExample()) setFrame(loadFrame())
  }, [])

  function openAgent(ctx: AgentCtx) {
    setAgentCtx(ctx)
    markStep('open')
    if (ctx.code) markStep('context') // 종목상세에서 호출 = 맥락 상속(보너스)
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center gap-8 p-6">
      <PhoneFrame>
        {/* 임시 플레이스홀더 — Task 6~8에서 홈/검색/상세/미니앱으로 교체 */}
        <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">
          화면 준비 중 ({screen.kind})
        </div>
        <Fab onClick={() => openAgent(screen.kind === 'stock' ? { code: screen.code, name: screen.name } : {})} />
      </PhoneFrame>
      {/* 도슨트 패널 자리 — Task 9 */}
    </main>
  )
}
```

- [ ] **Step 4: `src/app/page.tsx` 전체 교체**

```tsx
import { DemoStage } from './components/DemoStage'

export default function Home() {
  return <DemoStage />
}
```

- [ ] **Step 5: 빌드 확인 후 커밋**

Run: `npm run build`
Expected: 성공 (Doorway/AgentApp은 아직 파일로 남아 있지만 import되지 않음 — Task 8에서 삭제)

```bash
git add src/app/components/PhoneFrame.tsx src/app/components/Fab.tsx src/app/components/DemoStage.tsx src/app/page.tsx
git commit -m "feat(proto): 스테이지 골격 — 흰 배경 + iPhone 16 Pro 비율 폰 프레임 + FAB"
```

---

### Task 6: 홈(스크린샷+폴백) · 검색 · 라이브 종목상세 화면

**Files:**
- Create: `src/app/components/HomeScreen.tsx`
- Create: `src/app/components/SearchScreen.tsx`
- Create: `src/app/components/StockScreen.tsx`
- Modify: `src/app/components/DemoStage.tsx` (플레이스홀더 → 화면 라우팅)

- [ ] **Step 1: `src/app/components/HomeScreen.tsx` 생성**

스크린샷(`/screens/home.png`)이 있으면 덮고, 없으면 코드 폴백 홈. 오버레이는 검색 핫스팟 1개뿐(FAB은 DemoStage가 얹는다).

```tsx
'use client'
import { useState } from 'react'

export function HomeScreen({ onSearch, pulseSearch }: { onSearch: () => void; pulseSearch?: boolean }) {
  const [hasShot, setHasShot] = useState(true)
  return (
    <div className="absolute inset-0 bg-[#f7f8fa]">
      {!hasShot && <FallbackHome onSearch={onSearch} pulseSearch={pulseSearch} />}
      {/* 실제 앱 홈 스크린샷 — public/screens/home.png 에 넣으면 이걸로 덮인다 */}
      <img
        src="/screens/home.png"
        alt=""
        onError={() => setHasShot(false)}
        className={hasShot ? 'absolute inset-0 w-full h-full object-cover object-top' : 'hidden'}
      />
      {hasShot && (
        // 투명 핫스팟: 스크린샷 상단 우측(검색 아이콘 위치 가정)에 배치. 스크린샷 확정 후 위치 조정.
        <button
          aria-label="종목 검색"
          onClick={onSearch}
          className={`absolute top-12 right-3 w-12 h-12 z-30 rounded-full ${
            pulseSearch ? 'ring-4 ring-yellow-300 animate-pulse bg-yellow-200/40' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

// 스크린샷이 없을 때의 코드 폴백 홈 — 페이증권 결의 장식(정적)
function FallbackHome({ onSearch, pulseSearch }: { onSearch: () => void; pulseSearch?: boolean }) {
  return (
    <div className="w-full h-full flex flex-col text-[13px]">
      <div className="pt-12 px-4 pb-3 bg-white flex items-center">
        <span className="font-bold text-base">증권</span>
        <button
          onClick={onSearch}
          aria-label="종목 검색"
          className={`ml-auto w-9 h-9 grid place-items-center rounded-full text-lg ${
            pulseSearch ? 'ring-4 ring-yellow-300 animate-pulse' : ''
          }`}
        >
          🔍
        </button>
      </div>
      <div className="px-4 py-3 space-y-3 overflow-y-auto">
        <div className="bg-white rounded-2xl p-4">
          <div className="text-xs text-gray-500">내 투자</div>
          <div className="text-xl font-bold mt-1">3,241,050원</div>
          <div className="text-xs text-red-500">+2.1% (66,721원)</div>
        </div>
        <div className="bg-white rounded-2xl p-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">관심 종목</div>
          {[
            ['삼성전자', '+0.4%', 'text-red-500'],
            ['SK하이닉스', '-1.2%', 'text-blue-500'],
            ['에코프로비엠', '+3.8%', 'text-red-500'],
          ].map(([n, r, c]) => (
            <div key={n} className="flex justify-between py-1.5 border-b last:border-0">
              <span>{n}</span>
              <span className={c}>{r}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 text-xs text-gray-400">
          * 홈은 진입 연출용 목업입니다. public/screens/home.png를 넣으면 실제 앱 화면으로 교체됩니다.
        </div>
      </div>
      <div className="mt-auto flex border-t bg-white text-[11px] text-gray-400 text-center">
        {['홈', '주식', '내 자산', '메뉴'].map((t, i) => (
          <div key={t} className={`flex-1 py-3 ${i === 1 ? 'text-black font-semibold' : ''}`}>{t}</div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `src/app/components/SearchScreen.tsx` 생성**

```tsx
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
```

- [ ] **Step 3: `src/app/components/StockScreen.tsx` 생성 (라이브: quote + history)**

```tsx
'use client'
import { useEffect, useState } from 'react'

interface Candle { date: string; close: number }

export function StockScreen({ code, name, onBack }: { code: string; name: string; onBack: () => void }) {
  const [quote, setQuote] = useState<any>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [failed, setFailed] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    setQuote(null)
    setCandles([])
    setFailed(false)
    Promise.all([
      fetch(`/api/quote?code=${code}`).then((r) => r.json()),
      fetch(`/api/history?code=${code}&days=60`).then((r) => r.json()),
    ])
      .then(([q, h]) => {
        if (q.error) setFailed(true)
        else {
          setQuote(q)
          setCandles(h.candles ?? [])
        }
      })
      .catch(() => setFailed(true))
  }, [code])

  function mock(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  const up = quote && Number(quote.changeRate) >= 0
  return (
    <div className="absolute inset-0 bg-[#f7f8fa] flex flex-col">
      <div className="pt-12 px-3 pb-2 bg-white flex items-center gap-2">
        <button onClick={onBack} aria-label="뒤로" className="w-8 h-8 grid place-items-center text-lg">←</button>
        <div>
          <div className="font-bold text-sm">{name}</div>
          <div className="text-[10px] text-gray-400">{code} · 실시간</div>
        </div>
      </div>

      <div className="bg-white px-4 pb-3">
        {failed ? (
          <div className="text-sm text-gray-400 py-3">시세를 불러오지 못했어요 — 미지원 종목이거나 일시 오류</div>
        ) : !quote ? (
          <div className="text-sm text-gray-300 py-3">실시간 시세 불러오는 중…</div>
        ) : (
          <>
            <div className="text-2xl font-bold">{Number(quote.price).toLocaleString()}원</div>
            <div className={`text-sm ${up ? 'text-red-500' : 'text-blue-500'}`}>
              {up ? '▲' : '▼'} {Number(quote.changeRate).toFixed(2)}%
            </div>
          </>
        )}
        <Sparkline candles={candles} />
      </div>

      <div className="flex gap-4 px-4 py-2.5 text-[13px] text-gray-400 bg-white border-t border-b">
        <span className="text-black font-semibold">차트</span>
        {['호가', '종목정보', '커뮤니티', '뉴스'].map((t) => (
          <button key={t} onClick={() => mock('프로토타입 범위 밖이에요')}>{t}</button>
        ))}
      </div>

      <div className="flex-1 px-4 py-3 text-xs text-gray-400">
        결정하기 전에, 오른쪽 아래 코파일럿에게 내 원칙에 맞는지 물어보세요.
      </div>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-40 z-30 bg-black/80 text-white text-xs px-3 py-2 rounded-full">
          {toast}
        </div>
      )}

      {/* 결정의 순간 — 히어로 장면 */}
      <div className="flex h-14 shrink-0">
        <button onClick={() => mock('주문은 프로토타입 범위 밖 — 코파일럿에게 먼저 물어보세요')} className="flex-1 bg-blue-500 text-white font-semibold">판매</button>
        <button onClick={() => mock('주문은 프로토타입 범위 밖 — 코파일럿에게 먼저 물어보세요')} className="flex-1 bg-red-500 text-white font-semibold">구매</button>
      </div>
    </div>
  )
}

function Sparkline({ candles }: { candles: Candle[] }) {
  if (candles.length < 2) return <div className="h-[90px]" />
  const W = 380, H = 90, pad = 4
  const closes = candles.map((c) => c.close)
  const min = Math.min(...closes), max = Math.max(...closes)
  const x = (i: number) => pad + (i / (candles.length - 1)) * (W - 2 * pad)
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - 2 * pad)
  const pts = candles.map((c, i) => `${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join(' ')
  const up = closes[closes.length - 1] >= closes[0]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
      <polyline points={pts} fill="none" stroke={up ? '#ef4444' : '#3b82f6'} strokeWidth="1.5" />
    </svg>
  )
}
```

- [ ] **Step 4: `DemoStage.tsx`의 플레이스홀더를 화면 라우팅으로 교체**

`PhoneFrame` 내부(임시 플레이스홀더 div + Fab)를 다음으로 교체하고 import 추가(`HomeScreen`, `SearchScreen`, `StockScreen`):

```tsx
      <PhoneFrame>
        {screen.kind === 'home' && <HomeScreen onSearch={() => setScreen({ kind: 'search' })} />}
        {screen.kind === 'search' && (
          <SearchScreen
            onBack={() => setScreen({ kind: 'home' })}
            onPick={(s) => setScreen({ kind: 'stock', code: s.code, name: s.name })}
          />
        )}
        {screen.kind === 'stock' && (
          <StockScreen code={screen.code} name={screen.name} onBack={() => setScreen({ kind: 'search' })} />
        )}
        {screen.kind !== 'search' && (
          <Fab onClick={() => openAgent(screen.kind === 'stock' ? { code: screen.code, name: screen.name } : {})} />
        )}
      </PhoneFrame>
```

- [ ] **Step 5: 수동 검증**

`.claude/launch.json`이 없으면 생성:

```json
{
  "version": "0.0.1",
  "configurations": [{ "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }]
}
```

preview_start(name: "dev") → 확인: ① 흰 배경 + 폰 프레임 + 폴백 홈, ② 🔍 → 검색, ③ "삼전" 검색 → 삼성전자 → 상세에 실시간가·차트, ④ 구매 탭 → 토스트. 콘솔 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/app/components/HomeScreen.tsx src/app/components/SearchScreen.tsx src/app/components/StockScreen.tsx src/app/components/DemoStage.tsx .claude/launch.json
git commit -m "feat(proto): 홈(스크린샷+폴백)·검색·라이브 종목상세 — 맥락을 싣는 화면은 데이터 구동"
```

---

### Task 7: 인라인 카드 + ChatPage 재작성 (대화 = 루프의 축)

오프닝 브리핑(상태 분기), 상태 적응 칩, 도구 출력 → 인라인 카드, compare 자동 기록, update_frame 클라이언트 저장.

**Files:**
- Create: `src/app/components/cards.tsx`
- Modify: `src/app/components/ChatPage.tsx` (전체 교체)

- [ ] **Step 1: `src/app/components/cards.tsx` 생성**

```tsx
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
```

- [ ] **Step 2: `src/app/components/ChatPage.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Frame, rulesFromToolInput } from '@/lib/frame'
import { saveFrame } from '@/lib/frameStore'
import { addRecord } from '@/lib/records'
import { markStep } from '@/lib/demo'
import { CompareCard, BacktestCard, FrameSavedCard, RecordChip } from './cards'

export interface UsedTool { name: string; input: any; output?: any }
interface Msg { role: 'user' | 'assistant'; content: string; tools?: UsedTool[] }

export interface ChatCtx { code?: string; name?: string }

function openingText(hasFrame: boolean, ctx: ChatCtx): string {
  const where = ctx.name ? `지금 ${ctx.name} 화면 보고 있었네? ` : ''
  if (!hasFrame)
    return (
      `${where}반가워! 난 답을 주는 봇이 아니라, 너만의 매매 원칙을 같이 만들고 지키게 돕는 코파일럿이야.\n` +
      `아직 원칙이 없네 — 그것부터 만들어볼까? 5분이면 돼. 평소에 뭘 보고 사고파는지 편하게 말해줘도 좋아.`
    )
  return `${where}네 원칙 기준으로 도와줄게. 종목을 물어보면 실데이터로 원칙에 대조하고, 반대 근거까지 보여줄게.`
}

interface Chip { label: string; text?: string; action?: 'wiki' }

function chipsFor(hasFrame: boolean, ctx: ChatCtx): Chip[] {
  if (!hasFrame)
    return [
      { label: '📋 내 매매 원칙 만들기', text: '내 매매 원칙을 만들고 싶어. 뭐부터 정하면 좋아?' },
      { label: '🎯 종목 대조해보기', text: ctx.name ? `${ctx.name} 지금 사도 될까?` : '삼성전자 지금 사도 될까?' },
      { label: '🗂 위키 보기', action: 'wiki' },
    ]
  return [
    {
      label: ctx.name ? `🎯 ${ctx.name} 내 원칙에 대조` : '🎯 종목 내 원칙에 대조',
      text: ctx.name ? `${ctx.name} 내 원칙에 대조해줘. 지금 사도 될까?` : '삼성전자 내 원칙에 대조해줘. 지금 사도 될까?',
    },
    { label: '🔁 과거 검증(회고)', text: ctx.name ? `내 원칙을 ${ctx.name} 과거 데이터로 검증해줘` : '내 원칙을 삼성전자 과거 데이터로 검증해줘' },
    { label: '📋 원칙 다듬기', text: '내 원칙 중에 다듬거나 추가할 게 있는지 같이 봐줘' },
    { label: '🗂 위키', action: 'wiki' },
  ]
}

export function ChatPage({
  context,
  frame,
  onFrameSaved,
  onOpenDetail,
  onOpenWiki,
  onActivity,
}: {
  context: ChatCtx
  frame: Frame | null // null = 내 원칙 없음
  onFrameSaved: (f: Frame) => void
  onOpenDetail: (d: { kind: 'decision' | 'retro'; code: string }) => void
  onOpenWiki: () => void
  onActivity: () => void
}) {
  const hasFrame = !!frame && frame.rules.length > 0
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: openingText(hasFrame, context) }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const t = text.trim()
    if (!t || loading) return
    onActivity()
    const next: Msg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter((m, i) => !(i === 0 && m.role === 'assistant')).map((m) => ({ role: m.role, content: m.content })),
          context: { code: context.code, name: context.name, frame: hasFrame ? frame : undefined },
        }),
      })
      const j = await res.json()
      const tools: UsedTool[] = j.usedTools ?? []
      handleSideEffects(tools)
      setMsgs([...next, { role: 'assistant', content: j.reply ?? j.error ?? '오류가 났어.', tools }])
    } catch {
      setMsgs([...next, { role: 'assistant', content: '네트워크 오류가 났어. 다시 시도해줘.' }])
    }
    setLoading(false)
  }

  // 도구 사용의 클라이언트 부수효과: 프레임 저장 · 자동 기록 · 데모 스텝 체크
  function handleSideEffects(tools: UsedTool[]) {
    for (const t of tools) {
      if (t.name === 'update_frame') {
        const rules = rulesFromToolInput(t.input)
        if (rules.length) {
          const f: Frame = { rules, updatedAt: new Date().toISOString() }
          saveFrame(f)
          onFrameSaved(f)
          markStep('frame')
        }
      }
      if (t.name === 'compare_to_frame' && t.output?.summary) {
        addRecord({
          code: t.output.code,
          okCount: t.output.summary.ok,
          violateCount: t.output.summary.violate,
          naCount: t.output.summary.na,
          note: '(대화 중 자동 기록)',
        })
        markStep('compare')
      }
      if (t.name === 'run_backtest' && t.output?.supported) markStep('retro')
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [msgs, loading])

  const chips = chipsFor(hasFrame, context)

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap text-left max-w-[88%] ${
                m.role === 'user' ? 'bg-[#fae100]' : 'bg-gray-100'
              }`}
            >
              {m.content}
            </div>
            {m.tools?.map((t, k) => {
              if (t.name === 'compare_to_frame' && t.output?.summary)
                return (
                  <div key={k}>
                    <CompareCard result={t.output} onExpand={() => onOpenDetail({ kind: 'decision', code: t.output.code })} />
                    <RecordChip onOpenWiki={onOpenWiki} />
                  </div>
                )
              if (t.name === 'run_backtest' && t.output?.supported)
                return <BacktestCard key={k} result={t.output} onExpand={() => onOpenDetail({ kind: 'retro', code: t.output.code })} />
              if (t.name === 'update_frame')
                return <FrameSavedCard key={k} rules={rulesFromToolInput(t.input)} onExpand={onOpenWiki} />
              return null
            })}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400">코파일럿이 실데이터로 확인 중…</div>}
      </div>

      {/* 상태 적응 칩 */}
      <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto">
        {chips.map((c) => (
          <button
            key={c.label}
            onClick={() => (c.action === 'wiki' ? onOpenWiki() : send(c.text!))}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-full border bg-white hover:border-yellow-400"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-3 pb-3 pt-1 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          className="flex-1 border rounded-full px-4 py-2 text-sm min-w-0"
          placeholder={hasFrame ? '예: 에코프로비엠 지금 사도 될까?' : '예: 내 매매 원칙 만들래'}
        />
        <button onClick={() => send(input)} className="px-4 rounded-full bg-black text-white text-sm shrink-0">
          전송
        </button>
      </div>
    </div>
  )
}
```

주의: 첫 메시지(클라이언트 오프닝 브리핑)는 API로 보내지 않는다(`filter`로 제외) — assistant 메시지로 대화가 시작되면 Anthropic API가 거부할 수 있다.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 실패 — 기존 `AgentApp.tsx`가 ChatPage를 옛 시그니처(code/frame/seed/onOpenPage)로 사용. **AgentApp은 Task 8에서 삭제되므로, 이 시점에서는 `AgentApp.tsx`의 87행 `<ChatPage ... />`를 임시로 `<div />`로 바꿔 빌드를 통과시킨다** (Task 8에서 파일째 삭제됨).

- [ ] **Step 4: 커밋**

```bash
git add src/app/components/cards.tsx src/app/components/ChatPage.tsx src/app/components/AgentApp.tsx
git commit -m "feat(proto): 대화 = 루프의 축 — 오프닝 분기·상태 적응 칩·인라인 카드·자동 기록·프레임 저장"
```

---

### Task 8: MiniApp(바텀시트→풀프레임) + 위키 재작성 + 구지면 삭제

**Files:**
- Create: `src/app/components/MiniApp.tsx`
- Modify: `src/app/components/WikiPage.tsx` (전체 교체)
- Modify: `src/app/components/DemoStage.tsx` (MiniApp 연결)
- Delete: `src/app/components/AgentApp.tsx`, `src/app/components/Doorway.tsx`, `src/app/components/CommunityPage.tsx`

- [ ] **Step 1: `src/app/components/WikiPage.tsx` 전체 교체**

```tsx
'use client'
import { useState } from 'react'
import { Frame, EXAMPLE_FRAME } from '@/lib/frame'
import { loadRecords, clearRecords, DecisionRecord } from '@/lib/records'

export function WikiPage({ frame, onEditFrame }: { frame: Frame | null; onEditFrame: () => void }) {
  const [records, setRecords] = useState<DecisionRecord[]>(() => loadRecords())
  const [toast, setToast] = useState('')
  const shown = frame ?? EXAMPLE_FRAME
  const isEx = !frame

  function share() {
    setToast('공유 미리보기(목업) — 실서비스에선 근거 카드가 커뮤니티로 발행됩니다')
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <div className="relative p-4 overflow-y-auto h-full text-sm">
      <div className="font-bold">🗂 내 위키 — 원칙 + 판단 기록</div>
      <div className="text-xs text-gray-500 mt-0.5">쓸수록 쌓이는 나의 판단. 결과와 대조하면 운/실력이 갈린다.</div>

      <div className="mt-3 border rounded-xl p-3 bg-neutral-50">
        <div className="flex items-center">
          <div className="text-xs font-semibold text-gray-600">
            내 매매 원칙 ({shown.rules.length}개){isEx && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">예시</span>}
          </div>
          <button onClick={onEditFrame} className="ml-auto text-xs text-blue-600 underline">편집</button>
        </div>
        <ul className="mt-1 text-xs text-gray-600 list-disc ml-4 space-y-0.5">
          {shown.rules.map((r) => (<li key={r.id}>{r.text}</li>))}
        </ul>
        {isEx && <div className="mt-2 text-[11px] text-amber-700">아직 내 원칙이 없어요 — 대화로 만들면 여기 저장됩니다.</div>}
      </div>

      <div className="mt-4 flex items-center">
        <div className="text-xs font-semibold text-gray-600">판단 기록 ({records.length})</div>
        {records.length > 0 && (
          <button
            onClick={() => { clearRecords(); setRecords([]) }}
            className="ml-auto text-xs text-gray-400 underline"
          >
            비우기
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="mt-2 text-xs text-gray-400">아직 기록 없음 — 대화에서 종목을 대조하면 자동으로 쌓여요.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {records.map((r) => (
            <div key={r.id} className="border rounded-xl p-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{r.code}</span>
                <span className="text-gray-400">{new Date(r.at).toLocaleString('ko-KR')}</span>
                <span className="ml-auto text-emerald-600">부합 {r.okCount}</span>
                <span className="text-red-500">위반 {r.violateCount}</span>
              </div>
              {r.note && <div className="mt-1 text-xs text-gray-700">“{r.note}”</div>}
              <button onClick={share} className="mt-1.5 text-[11px] px-2 py-1 rounded-full border text-gray-500">
                👥 커뮤니티에 근거 공유 <span className="text-gray-400">(목업)</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed-toast absolute left-1/2 -translate-x-1/2 bottom-6 bg-black/80 text-white text-xs px-3 py-2 rounded-full whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `src/app/components/MiniApp.tsx` 생성**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Frame, EXAMPLE_FRAME } from '@/lib/frame'
import { loadRecords } from '@/lib/records'
import { markStep } from '@/lib/demo'
import { ChatPage, ChatCtx } from './ChatPage'
import { WikiPage } from './WikiPage'
import { DecisionPage } from './DecisionPage'
import { RetroPage } from './RetroPage'
import { FramePage } from './FramePage'

type Detail = { kind: 'decision' | 'retro'; code: string } | { kind: 'frame' } | null

export function MiniApp({
  context,
  frame,
  onFrameChange,
  onClose,
}: {
  context: ChatCtx
  frame: Frame | null
  onFrameChange: (f: Frame) => void
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'chat' | 'wiki'>('chat')
  const [detail, setDetail] = useState<Detail>(null)

  // 등장 애니메이션: 마운트 직후 바텀시트로 슬라이드 업
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  function openWiki() {
    setDetail(null)
    setTab('wiki')
    setExpanded(true)
    if (loadRecords().length > 0) markStep('wiki')
  }

  return (
    <div className="absolute inset-0 z-30">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className={`absolute inset-x-0 bottom-0 bg-white flex flex-col transition-all duration-300 ${
          expanded ? 'top-0 rounded-none' : 'top-[34%] rounded-t-3xl'
        } ${mounted ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* 헤더 */}
        <div className={`shrink-0 px-3 pb-2 border-b ${expanded ? 'pt-12' : 'pt-2'}`}>
          <button
            aria-label={expanded ? '줄이기' : '펼치기'}
            onClick={() => setExpanded(!expanded)}
            className="block mx-auto w-10 h-1.5 rounded-full bg-gray-300 mb-2"
          />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">🧭 AI 투자 코파일럿</span>
            {context.name && (
              <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">📍 {context.name}</span>
            )}
            <button onClick={onClose} aria-label="닫기" className="ml-auto w-8 h-8 grid place-items-center text-gray-400">✕</button>
          </div>
        </div>

        {/* 본문 — 채팅은 탭 전환에도 언마운트하지 않는다(대화 유지) */}
        <div className="flex-1 min-h-0 relative">
          <div className={`absolute inset-0 ${tab === 'chat' && !detail ? '' : 'hidden'}`}>
            <ChatPage
              context={context}
              frame={frame}
              onFrameSaved={onFrameChange}
              onOpenDetail={(d) => { setExpanded(true); setDetail(d) }}
              onOpenWiki={openWiki}
              onActivity={() => setExpanded(true)}
            />
          </div>
          {tab === 'wiki' && !detail && <WikiPage frame={frame} onEditFrame={() => setDetail({ kind: 'frame' })} />}

          {/* 상세 뷰 오버레이 — 기존 페이지 재활용 */}
          {detail && (
            <div className="absolute inset-0 bg-white flex flex-col">
              <div className="shrink-0 px-3 py-2 border-b flex items-center gap-2">
                <button onClick={() => setDetail(null)} aria-label="뒤로" className="w-8 h-8 grid place-items-center text-lg">←</button>
                <span className="text-sm font-semibold">
                  {detail.kind === 'decision' ? '🎯 대조 상세' : detail.kind === 'retro' ? '🔁 회고 상세' : '📋 원칙 편집'}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {detail.kind === 'decision' && <DecisionPage code={detail.code} frame={frame ?? EXAMPLE_FRAME} />}
                {detail.kind === 'retro' && <RetroPage code={detail.code} frame={frame ?? EXAMPLE_FRAME} setFrame={onFrameChange} />}
                {detail.kind === 'frame' && <FramePage frame={frame ?? EXAMPLE_FRAME} setFrame={(f) => { onFrameChange(f); markStep('frame') }} />}
              </div>
            </div>
          )}
        </div>

        {/* 하단 네비 */}
        {!detail && (
          <div className="shrink-0 flex border-t bg-white">
            <NavBtn active={tab === 'chat'} label="💬 대화" onClick={() => setTab('chat')} />
            <NavBtn active={tab === 'wiki'} label="🗂 위키" onClick={openWiki} />
          </div>
        )}

        <div className="shrink-0 px-3 py-1 border-t text-[9px] text-gray-400 bg-white">
          투자 참고용이며 투자자문이 아닙니다. 최종 결정은 사용자에게 있습니다.
        </div>
      </div>
    </div>
  )
}

function NavBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2.5 text-sm ${active ? 'font-bold' : 'text-gray-400'}`}>
      {label}
    </button>
  )
}
```

- [ ] **Step 3: `DemoStage.tsx`에 MiniApp 연결**

import에 `MiniApp` 추가, `PhoneFrame` 내부 마지막(Fab 아래)에 추가:

```tsx
        {agentCtx !== null && (
          <MiniApp
            context={agentCtx}
            frame={frame}
            onFrameChange={setFrame}
            onClose={() => setAgentCtx(null)}
          />
        )}
```

그리고 Fab 렌더 조건을 `screen.kind !== 'search' && agentCtx === null`로 변경(시트 열리면 FAB 숨김).

- [ ] **Step 4: 구지면 삭제 + 빌드**

```bash
rm src/app/components/AgentApp.tsx src/app/components/Doorway.tsx src/app/components/CommunityPage.tsx
npm run build
```
Expected: 빌드 성공 (참조 없음 확인)

- [ ] **Step 5: 수동 검증 (preview)**

① FAB → 바텀시트 슬라이드 업 + 오프닝 브리핑(원칙 없음 버전) + 칩 3개, ② [내 매매 원칙 만들기] → 대화 → 에이전트가 원칙을 뽑으면 FrameSavedCard + 위키에 반영, ③ "삼성전자 지금 사도 될까?" → CompareCard + 기록 칩, ④ 회고 질문 → BacktestCard → 펼치면 차트, ⑤ 위키 탭 → 원칙 + 자동 기록, ⑥ 닫고 종목상세에서 FAB → 오프닝에 "지금 OO 화면 보고 있었네?" + 📍칩. 콘솔 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(proto): MiniApp — 바텀시트→풀프레임, 대화+위키 2축, 상세 뷰 재활용, 구지면(AgentApp/Doorway/Community) 삭제"
```

---

### Task 9: 도슨트 패널 (체크리스트 · 내레이션 · 투명성 배지 · 초기화)

**Files:**
- Create: `src/app/components/DocentPanel.tsx`
- Modify: `src/app/components/DemoStage.tsx` (패널 배치 + FAB/핫스팟 펄스)

- [ ] **Step 1: `src/app/components/DocentPanel.tsx` 생성**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DEMO_STEPS, DEMO_EVENT, DemoProgress, loadProgress, nextStep, resetDemo } from '@/lib/demo'

export function useDemoProgress(): DemoProgress {
  const [p, setP] = useState<DemoProgress>({})
  useEffect(() => {
    setP(loadProgress())
    const h = () => setP(loadProgress())
    window.addEventListener(DEMO_EVENT, h)
    return () => window.removeEventListener(DEMO_EVENT, h)
  }, [])
  return p
}

const BADGES: { label: string; kind: 'live' | 'mock' }[] = [
  { label: '시세·차트 — 토스 오픈API 실호출(Yahoo 폴백)', kind: 'live' },
  { label: '코파일럿 응답·대조·백테스트 — LLM + 실데이터 라이브', kind: 'live' },
  { label: '원칙·판단 기록 — 브라우저 로컬 저장(실동작)', kind: 'live' },
  { label: '홈 화면·주문·커뮤니티 공유 — 목업(연출)', kind: 'mock' },
]

export function DocentPanel() {
  const progress = useDemoProgress()
  const next = nextStep(progress)
  const done = DEMO_STEPS.filter((s) => progress[s.id]).length

  function onReset() {
    if (!confirm('원칙·판단 기록·진행 상태를 모두 초기화할까요?')) return
    resetDemo()
    location.reload()
  }

  const body = (
    <>
      <div>
        <div className="text-xs font-bold text-gray-400 tracking-wide">데모 가이드 · 프로토타입 밖 안내</div>
        <div className="mt-1 text-lg font-bold">이렇게 경험해보세요</div>
        <div className="text-xs text-gray-500">
          정해진 대본은 없습니다 — 아무 종목, 아무 질문으로 벗어나도 동작합니다. ({done}/{DEMO_STEPS.length})
        </div>
      </div>

      <ol className="space-y-1.5">
        {DEMO_STEPS.map((s, i) => {
          const isDone = !!progress[s.id]
          const isNext = next?.id === s.id
          return (
            <li
              key={s.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : isNext ? 'border-yellow-400 bg-yellow-50' : 'text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs w-4">{isDone ? '✅' : `${i + 1}`}</span>
                <span className={isDone ? 'line-through' : isNext ? 'font-semibold text-gray-800' : ''}>{s.label}</span>
              </div>
              {isNext && <div className="mt-1 ml-6 text-xs text-gray-600">{s.narration}</div>}
            </li>
          )
        })}
      </ol>

      <div>
        <div className="text-xs font-semibold text-gray-500 mb-1.5">무엇이 진짜인가요?</div>
        <div className="space-y-1">
          {BADGES.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className={`shrink-0 px-1.5 py-0.5 rounded font-semibold ${b.kind === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.kind === 'live' ? 'LIVE' : 'MOCK'}
              </span>
              {b.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Link href="/prd" className="text-sm font-semibold bg-[#fee500] px-3 py-1.5 rounded-full">📄 기획서(PRD)</Link>
        <button onClick={onReset} className="text-xs text-gray-400 underline">🔄 데모 초기화</button>
      </div>
    </>
  )

  return (
    <>
      {/* 데스크톱: 사이드 패널 */}
      <aside className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0">{body}</aside>
      {/* 모바일: 접히는 하단 시트 */}
      <MobileSheet>{body}</MobileSheet>
    </>
  )
}

function MobileSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50">
      <button onClick={() => setOpen(!open)} className="w-full bg-black text-white text-sm py-2.5">
        {open ? '▼ 가이드 접기' : '▲ 데모 가이드 보기'}
      </button>
      {open && <div className="bg-white border-t p-4 space-y-4 max-h-[55vh] overflow-y-auto">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 2: `DemoStage.tsx` 최종본 — 패널 배치 + 펄스 연결**

`src/app/components/DemoStage.tsx` 전체를 다음으로 교체:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { loadFrame, isExample } from '@/lib/frameStore'
import { markStep, nextStep } from '@/lib/demo'
import { PhoneFrame } from './PhoneFrame'
import { Fab } from './Fab'
import { HomeScreen } from './HomeScreen'
import { SearchScreen } from './SearchScreen'
import { StockScreen } from './StockScreen'
import { MiniApp } from './MiniApp'
import { DocentPanel, useDemoProgress } from './DocentPanel'

export type Screen = { kind: 'home' } | { kind: 'search' } | { kind: 'stock'; code: string; name: string }
export type AgentCtx = { code?: string; name?: string }

export function DemoStage() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [agentCtx, setAgentCtx] = useState<AgentCtx | null>(null)
  const [frame, setFrame] = useState<Frame | null>(null)
  const progress = useDemoProgress()
  const next = nextStep(progress)

  useEffect(() => {
    if (!isExample()) setFrame(loadFrame())
  }, [])

  function openAgent(ctx: AgentCtx) {
    setAgentCtx(ctx)
    markStep('open')
    if (ctx.code) markStep('context')
  }

  const fabPulse = next?.id === 'open' || (next?.id === 'context' && screen.kind === 'stock')
  const searchPulse = next?.id === 'context' && screen.kind === 'home'

  return (
    <main className="min-h-screen bg-white flex items-center justify-center gap-10 p-6">
      <PhoneFrame>
        {screen.kind === 'home' && <HomeScreen onSearch={() => setScreen({ kind: 'search' })} pulseSearch={searchPulse} />}
        {screen.kind === 'search' && (
          <SearchScreen
            onBack={() => setScreen({ kind: 'home' })}
            onPick={(s) => setScreen({ kind: 'stock', code: s.code, name: s.name })}
          />
        )}
        {screen.kind === 'stock' && (
          <StockScreen code={screen.code} name={screen.name} onBack={() => setScreen({ kind: 'search' })} />
        )}
        {screen.kind !== 'search' && agentCtx === null && (
          <Fab
            onClick={() => openAgent(screen.kind === 'stock' ? { code: screen.code, name: screen.name } : {})}
            pulse={fabPulse}
          />
        )}
        {agentCtx !== null && (
          <MiniApp context={agentCtx} frame={frame} onFrameChange={setFrame} onClose={() => setAgentCtx(null)} />
        )}
      </PhoneFrame>
      <DocentPanel />
    </main>
  )
}
```

- [ ] **Step 3: 전체 테스트 + 빌드**

Run: `npx vitest run && npm run build`
Expected: 전부 PASS + 빌드 성공

- [ ] **Step 4: 수동 검증 (preview)**

① 첫 화면: 체크리스트 1번(FAB) 활성 + FAB 펄스, ② FAB → 체크 ✅ 자동, 다음 스텝으로 내레이션 이동, ③ 원칙 만들기→대조→회고→위키 순서대로 자동 체크되는지, ④ 보너스 안내 시 홈 검색 핫스팟 펄스, 종목상세 FAB → ⭐ 체크, ⑤ 초기화 → confirm → 새로고침 후 원칙 없음 상태(오프닝 브리핑이 "만들기" 버전으로 복귀), ⑥ 창 폭을 줄여 모바일 폴백(하단 가이드 바) 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/app/components/DocentPanel.tsx src/app/components/DemoStage.tsx
git commit -m "feat(proto): 도슨트 패널 — 자동 체크리스트·내레이션·투명성 배지·데모 초기화·펄스 유도"
```

---

### Task 10: 최종 검증 + 마감

**Files:** (수정 없음 — 검증/정리만)

- [ ] **Step 1: 전체 테스트·빌드·grep 정리 확인**

```bash
npx vitest run && npm run build
grep -rn "AgentApp\|Doorway\|CommunityPage" src/ || echo "clean"
```
Expected: PASS + 성공 + "clean"

- [ ] **Step 2: E2E 수동 검증 (preview, 평가자 시나리오 전체)**

주 경로: FAB → 원칙 만들기(대화 3~4턴) → "에코프로비엠 지금 사도 될까?"(이름 해석 확인) → 회고 → 위키. 보너스: 검색 → 종목상세(실시세) → FAB → 맥락 상속 첫마디. 도슨트 6스텝 전부 ✅ 도달. 스크린샷 캡처해 사용자에게 공유.

- [ ] **Step 3: 알려진 한계 확인 및 기록**

`public/screens/home.png`가 아직 없음 → 폴백 홈으로 동작(정상). 사용자가 스크린샷을 넣으면 핫스팟 위치(`HomeScreen.tsx`의 `top-12 right-3`)를 실제 검색 아이콘 위치로 조정해야 함을 사용자에게 보고.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore(proto): 프로토타입 환경 재구축 완료 — 스펙 2026-08-19 구현"
```
