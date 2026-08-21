# 회고 재설계(Retro → Trade Review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회고를 "이동평균 전체기간 백테스트"에서 "내가 한 매매(보유내역+판단기록)를 내 프레임으로 돌아보고 운/실력을 갈라 보는 계정 전체 회고 + 검색종목 가상 시나리오"로 바꾼다.

**Architecture:** 순수 계산부(`src/lib/review.ts`)를 새로 만들어 단위테스트하고, 서버 능력 `reviewTrades`(capabilities)가 시세/캔들을 받아 조립한다. 클라의 `records`는 `POST /api/review` 바디로 서버에 넘긴다. 에이전트 도구 `run_backtest`는 `review_trades`로 개명(SMA nag 제거). RetroPage는 계정 전체 회고 화면으로 재작성.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Vitest, Tailwind, Anthropic SDK, yahoo-finance2.

---

## 파일 구조

- **신규** `src/lib/review.ts` — 순수 계산(타입 + `countStatuses`/`fitScoreOf`/`isAged`/`summarizeReview`/`buildScenario`). frame.ts·stocks.ts(순수)만 import. 서버/네트워크 import 금지(클라도 타입 import 가능).
- **신규** `src/app/api/review/route.ts` — `POST {frame,code?,records?}` → `reviewTrades`.
- **신규** `src/test/review.test.ts` — review.ts 순수 함수 테스트.
- **수정** `src/lib/capabilities.ts` — `reviewTrades` 추가.
- **수정** `src/lib/records.ts` — `priceAtDecision?` 필드.
- **수정** `src/lib/evolve.ts` + `src/app/api/evolve/route.ts` — 입력을 edges → `TradeReview`로 교체.
- **수정** `src/lib/tools.ts` — `run_backtest`→`review_trades`.
- **수정** `src/lib/persona.ts`, `src/lib/demo.ts` — 카피.
- **수정** `src/app/components/cards.tsx` — `BacktestCard`→`ReviewCard`.
- **수정** `src/app/components/ChatPage.tsx` — side-effect 키·priceAtDecision·onOpenDetail code 옵션.
- **수정** `src/app/components/DecisionPage.tsx` — 저장 시 priceAtDecision.
- **수정** `src/app/components/RetroPage.tsx` — 재작성.
- **수정** `src/app/components/MiniApp.tsx` — detail.code 옵션.
- **유지** `src/lib/backtest.ts`(smaBonus 재사용), `src/lib/edges.ts`(회고 경로에서 분리, `edges.test.ts` 유지).

---

## Task 1: 순수 계산부 `review.ts` + 테스트

**Files:**
- Create: `src/lib/review.ts`
- Test: `src/test/review.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/review.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fitScoreOf, isAged, summarizeReview, buildScenario, countStatuses, ReviewItem } from '../lib/review'
import { Frame } from '../lib/frame'
import { Candle } from '../lib/market/types'

const item = (p: Partial<ReviewItem>): ReviewItem => ({
  source: 'record', code: '005930', name: '삼성전자', entryPrice: 100, currentPrice: 110,
  returnPct: 10, fit: { ok: 1, violate: 0, na: 0 }, fitScore: 1, aged: true, ...p,
})

describe('fitScoreOf', () => {
  it('ok/(ok+violate), 미지원만이면 null', () => {
    expect(fitScoreOf({ ok: 3, violate: 1, na: 2 })).toBeCloseTo(0.75)
    expect(fitScoreOf({ ok: 0, violate: 0, na: 4 })).toBeNull()
  })
})

describe('isAged', () => {
  const now = Date.parse('2026-08-21T00:00:00Z')
  it('하루 넘게 지난 기록은 aged, 방금 건 아님', () => {
    expect(isAged('2026-08-01T00:00:00Z', now)).toBe(true)
    expect(isAged('2026-08-20T18:00:00Z', now)).toBe(false)
    expect(isAged(undefined, now)).toBe(false)
  })
})

describe('summarizeReview', () => {
  it('부합 우세 매매가 더 나으면 양의 edge와 긍정 verdict', () => {
    const s = summarizeReview([
      item({ fitScore: 1, returnPct: 20, aged: true }),
      item({ fitScore: 0.2, returnPct: 4, aged: true }),
    ])
    expect(s.edge).toBeCloseTo(16)
    expect(s.nFollowed).toBe(1)
    expect(s.nBroke).toBe(1)
    expect(s.verdict).toContain('나았어요')
  })
  it('한쪽 버킷이 비면 표본 부족 폴백', () => {
    const s = summarizeReview([item({ fitScore: 1, returnPct: 20, aged: true })])
    expect(s.edge).toBeNull()
    expect(s.verdict).toContain('표본 부족')
  })
  it('aged=false나 fitScore=null은 집계 제외', () => {
    const s = summarizeReview([
      item({ fitScore: 1, returnPct: 20, aged: false }),
      item({ fitScore: null, returnPct: 5, aged: true }),
    ])
    expect(s.edge).toBeNull()
  })
})

describe('buildScenario', () => {
  const frame: Frame = { updatedAt: '', rules: [{ id: 'r1', kind: 'buy', text: 't', check: { type: 'price_vs_high', window: 60, minPctBelowHigh: 10 } }] }
  const candles: Candle[] = Array.from({ length: 40 }, (_, i) => ({ date: `d${i}`, close: 100 + i }))
  it('lookback 시점을 진입으로 잡고 수익률·fit 계산', () => {
    const sc = buildScenario(candles, frame, '005930', 20)!
    expect(sc.entryPrice).toBe(candles[19].close)
    expect(sc.currentPrice).toBe(candles[39].close)
    expect(sc.returnPct).toBeCloseTo(((139 - 119) / 119) * 100)
    expect(sc.fit.ok + sc.fit.violate + sc.fit.na).toBe(1)
  })
  it('캔들이 2개 미만이면 undefined', () => {
    expect(buildScenario([{ date: 'd', close: 1 }], frame, 'x', 20)).toBeUndefined()
  })
})

describe('countStatuses', () => {
  it('상태별 카운트', () => {
    expect(countStatuses([
      { rule: { id: 'a', kind: 'buy', text: 'x' }, verdict: { status: 'ok', detail: '' } },
      { rule: { id: 'b', kind: 'buy', text: 'y' }, verdict: { status: 'na', detail: '' } },
    ])).toEqual({ ok: 1, violate: 0, na: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- review`
Expected: FAIL — `Cannot find module '../lib/review'`.

- [ ] **Step 3: Write `src/lib/review.ts`**

```ts
import { Frame, RuleVerdict, EvalContext, evaluateFrame } from './frame'
import { stockName } from './stocks'
import type { Candle } from './market/types'

export interface FitCount { ok: number; violate: number; na: number }

export interface ReviewItem {
  source: 'holding' | 'record'
  code: string
  name: string
  entryPrice: number | null
  currentPrice: number | null
  returnPct: number | null
  fit: FitCount
  fitScore: number | null // ok/(ok+violate); 자동판정 규칙이 없으면 null
  aged: boolean // 성과가 유의미할 만큼 경과했나(요약 집계 포함 여부)
  at?: string
  note?: string
}

export interface ScenarioCard {
  code: string
  name: string
  lookbackDays: number
  entryDate: string
  entryPrice: number
  currentPrice: number
  returnPct: number
  fit: FitCount // '그때' 프레임 부합도
}

export interface ReviewSummary {
  followedAvg: number | null
  brokeAvg: number | null
  edge: number | null
  verdict: string
  nFollowed: number
  nBroke: number
}

export interface TradeReview {
  items: ReviewItem[]
  summary: ReviewSummary
  scenario?: ScenarioCard
  smaBonus?: { params: { fast: number; slow: number }; result: { strategyReturnPct: number | null; buyHoldReturnPct: number | null; trades: number } }
}

/** 클라가 /api/review로 넘기는 판단기록 최소 형태 */
export interface DecisionRecordInput {
  code: string
  at: string
  okCount: number
  violateCount: number
  naCount: number
  priceAtDecision?: number
  note?: string
}

export function countStatuses(verdicts: RuleVerdict[]): FitCount {
  const c: FitCount = { ok: 0, violate: 0, na: 0 }
  for (const v of verdicts) c[v.verdict.status]++
  return c
}

export function fitScoreOf(fit: FitCount): number | null {
  const denom = fit.ok + fit.violate
  return denom > 0 ? fit.ok / denom : null
}

export function isAged(at: string | undefined, nowMs: number, thresholdMs = 86_400_000): boolean {
  if (!at) return false
  const t = Date.parse(at)
  return Number.isFinite(t) ? nowMs - t > thresholdMs : false
}

export function summarizeReview(items: ReviewItem[]): ReviewSummary {
  const usable = items.filter((i) => i.aged && i.fitScore != null && i.returnPct != null)
  const followed = usable.filter((i) => (i.fitScore as number) >= 0.5).map((i) => i.returnPct as number)
  const broke = usable.filter((i) => (i.fitScore as number) < 0.5).map((i) => i.returnPct as number)
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
  const followedAvg = avg(followed)
  const brokeAvg = avg(broke)
  const edge = followedAvg != null && brokeAvg != null ? followedAvg - brokeAvg : null
  let verdict: string
  if (edge == null) verdict = '아직 판단하기 일러요 — 원칙을 지킨 매매와 어긴 매매가 둘 다 쌓여야 비교돼요. (표본 부족)'
  else if (edge >= 0) verdict = `원칙을 지킨 매매가 평균 +${edge.toFixed(1)}%p 나았어요 — 규칙이 도움이 된 신호예요. (표본 적음, 참고만)`
  else verdict = `원칙을 지킨 매매가 평균 ${edge.toFixed(1)}%p 낮았어요 — 규칙을 의심해볼 신호예요. (표본 적음, 참고만)`
  return { followedAvg, brokeAvg, edge, verdict, nFollowed: followed.length, nBroke: broke.length }
}

/** 가상 시나리오: lookbackDays 거래일 전을 진입으로 잡아, 실제 캔들로 수익률·그때 부합도를 계산 */
export function buildScenario(candles: Candle[], frame: Frame, code: string, lookbackDays = 20): ScenarioCard | undefined {
  if (candles.length < 2) return undefined
  const lastIdx = candles.length - 1
  const entryIdx = Math.max(0, lastIdx - lookbackDays)
  if (entryIdx >= lastIdx) return undefined
  const entry = candles[entryIdx]
  const last = candles[lastIdx]
  const ctx: EvalContext = { code, candles: candles.slice(0, entryIdx + 1) }
  const fit = countStatuses(evaluateFrame(frame, ctx))
  return {
    code,
    name: stockName(code),
    lookbackDays,
    entryDate: entry.date,
    entryPrice: entry.close,
    currentPrice: last.close,
    returnPct: ((last.close - entry.close) / entry.close) * 100,
    fit,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- review`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/review.ts src/test/review.test.ts
git commit -m "feat(review): 회고 순수 계산부(review.ts) + 테스트"
```

---

## Task 2: `records.ts`에 `priceAtDecision` 필드

**Files:**
- Modify: `src/lib/records.ts:3-11`

- [ ] **Step 1: Add field**

`src/lib/records.ts`의 `DecisionRecord` 인터페이스를 다음으로 교체:

```ts
export interface DecisionRecord {
  id: string
  at: string
  code: string
  okCount: number
  violateCount: number
  naCount: number
  priceAtDecision?: number // 대조 시점 시세(회고 성과 계산용). 옛 기록엔 없을 수 있음
  note: string
}
```

(`addRecord`는 `Omit<DecisionRecord,'id'|'at'>`을 받으므로 선택 필드는 자동으로 흘러간다. 변경 불필요.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (통과).

- [ ] **Step 3: Commit**

```bash
git add src/lib/records.ts
git commit -m "feat(records): priceAtDecision 필드 추가(하위호환)"
```

---

## Task 3: `reviewTrades` 능력 (capabilities.ts)

**Files:**
- Modify: `src/lib/capabilities.ts`

- [ ] **Step 1: import 추가**

`src/lib/capabilities.ts` 상단 import 블록을 다음으로 교체(기존 5줄 대체):

```ts
// 공유 능력 코어 — 페이지(버튼)와 에이전트(도구)가 같은 함수를 호출한다.
import { getQuote, getDailyCandles, Quote } from './market'
import { Frame, EXAMPLE_FRAME, evaluateFrame, RuleVerdict } from './frame'
import { backtestSmaCross, BtResult } from './backtest'
import { DEMO_PORTFOLIO, sectorWeights, sectorOf } from './portfolio'
import { stockName } from './stocks'
import {
  countStatuses, fitScoreOf, isAged, summarizeReview, buildScenario,
  ReviewItem, TradeReview, DecisionRecordInput,
} from './review'
```

- [ ] **Step 2: `reviewTrades` 추가**

`src/lib/capabilities.ts` 맨 끝(`getPortfolio` 아래)에 추가:

```ts
/** 계정 전체 회고 — 보유내역 + 판단기록을 내 프레임으로 돌아보고 운/실력을 요약.
 *  records는 클라(localStorage)에서 넘겨받는다. opts.code가 있으면 가상 시나리오도 만든다. */
export async function reviewTrades(
  frame: Frame = EXAMPLE_FRAME,
  opts: { code?: string; records?: DecisionRecordInput[]; now?: number } = {},
): Promise<TradeReview> {
  const nowMs = opts.now ?? Date.now()
  const sw = sectorWeights()

  const holdingItems = (
    await Promise.all(
      DEMO_PORTFOLIO.map(async (h): Promise<ReviewItem | null> => {
        try {
          const [quote, candles] = await Promise.all([getQuote(h.code), getDailyCandles(h.code, 120)])
          const fit = countStatuses(
            evaluateFrame(frame, { code: h.code, candles, quote, sector: sectorOf(h.code), sectorWeights: sw, entryPrice: h.avgPrice }),
          )
          return {
            source: 'holding', code: h.code, name: h.name, entryPrice: h.avgPrice, currentPrice: quote.price,
            returnPct: ((quote.price - h.avgPrice) / h.avgPrice) * 100, fit, fitScore: fitScoreOf(fit), aged: true,
          }
        } catch {
          return null
        }
      }),
    )
  ).filter((x): x is ReviewItem => x != null)

  const recordItems = (
    await Promise.all(
      (opts.records ?? []).map(async (r): Promise<ReviewItem> => {
        const fit = { ok: r.okCount, violate: r.violateCount, na: r.naCount }
        let currentPrice: number | null = null
        let returnPct: number | null = null
        if (r.priceAtDecision) {
          try {
            const q = await getQuote(r.code)
            currentPrice = q.price
            returnPct = ((q.price - r.priceAtDecision) / r.priceAtDecision) * 100
          } catch {}
        }
        return {
          source: 'record', code: r.code, name: stockName(r.code), entryPrice: r.priceAtDecision ?? null,
          currentPrice, returnPct, fit, fitScore: fitScoreOf(fit), aged: isAged(r.at, nowMs), at: r.at, note: r.note,
        }
      }),
    )
  )

  const items = [...holdingItems, ...recordItems]
  const summary = summarizeReview(items)

  let scenario
  if (opts.code) {
    try {
      scenario = buildScenario(await getDailyCandles(opts.code, 40), frame, opts.code)
    } catch {}
  }

  let smaBonus: TradeReview['smaBonus']
  if (opts.code && frame.rules.some((r) => r.check?.type === 'sma_cross')) {
    const bt = await runBacktest(opts.code, frame)
    if (bt.supported) smaBonus = { params: bt.params, result: { strategyReturnPct: bt.result.strategyReturnPct, buyHoldReturnPct: bt.result.buyHoldReturnPct, trades: bt.result.trades } }
  }

  return { items, summary, scenario, smaBonus }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/capabilities.ts
git commit -m "feat(capabilities): reviewTrades — 계정 전체 회고 조립"
```

---

## Task 4: `POST /api/review` 라우트

**Files:**
- Create: `src/app/api/review/route.ts`

- [ ] **Step 1: Write route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { reviewTrades } from '@/lib/capabilities'
import { EXAMPLE_FRAME } from '@/lib/frame'

export async function POST(req: NextRequest) {
  const { frame, code, records } = await req.json().catch(() => ({}))
  try {
    return NextResponse.json(await reviewTrades(frame ?? EXAMPLE_FRAME, { code, records }))
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
```

- [ ] **Step 2: 수동 확인(서버 켜져 있으면)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/review -H 'content-type: application/json' -d '{"frame":{"rules":[{"id":"r1","kind":"buy","text":"고점대비","check":{"type":"price_vs_high","window":60,"minPctBelowHigh":10}}],"updatedAt":""},"records":[]}'
```
Expected: `{"items":[...보유 3종목...],"summary":{...},...}` (에러 없음).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review/route.ts
git commit -m "feat(api): POST /api/review"
```

---

## Task 5: evolve 입력을 TradeReview로 교체

**Files:**
- Modify: `src/lib/evolve.ts:22-30` (함수 시그니처·edgeLines), `src/app/api/evolve/route.ts`

- [ ] **Step 1: `proposeEvolution` 시그니처·입력 교체**

`src/lib/evolve.ts`에서 import에 review 타입 추가(최상단 import 블록 아래에 한 줄):

```ts
import { TradeReview } from './review'
```

그리고 `proposeEvolution` 함수 시작부(현재 `export async function proposeEvolution(code, frame, edges)`부터 `const ruleLines = ...`까지)를 다음으로 교체:

```ts
export async function proposeEvolution(frame: Frame, review: TradeReview): Promise<Evolution> {
  const edgeLines = review.items
    .map((it) => {
      const perf = it.returnPct == null ? '관찰 중(경과 짧음)' : `${it.returnPct >= 0 ? '+' : ''}${it.returnPct.toFixed(1)}%`
      return `- (${it.source}) ${it.name}: 부합 ${it.fit.ok}·위반 ${it.fit.violate}·미지원 ${it.fit.na}, 이후 성과 ${perf}`
    })
    .join('\n') || '- (아직 회고할 매매가 없음)'
  const summaryLine = review.summary.verdict
  const ruleLines = frame.rules
    .map((r) => `- [${r.id}] (${r.kind}) "${r.text}"${r.check ? ` check=${JSON.stringify(r.check)}` : ''}`)
    .join('\n')
```

- [ ] **Step 2: 프롬프트의 user content 교체**

`src/lib/evolve.ts`의 `messages: [{ role: 'user', content: ... }]` 안 content 문자열을 다음으로 교체:

```ts
        content:
          `사용자의 실제 매매(보유내역·판단기록)를 그의 거래 프레임으로 "돌아본" 결과다. 표본이 적으니 단정 말고 방향만. ` +
          `성과가 프레임 부합과 어떻게 갈리는지 보고, 규칙 1개 개정(tighten/loosen/keep/drop)을 근거와 함께 제안하라. ` +
          `머신체크 숫자 파라미터는 paramPatch로 구체 값을. 과최적화 위험을 한 줄 경고에 포함하라.\n\n` +
          `[운/실력 요약]\n${summaryLine}\n\n[프레임]\n${ruleLines}\n\n[매매별 회고]\n${edgeLines}`,
```

- [ ] **Step 3: `/api/evolve` 라우트 교체**

`src/app/api/evolve/route.ts` 전체를 다음으로 교체:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { proposeEvolution } from '@/lib/evolve'
import { EXAMPLE_FRAME } from '@/lib/frame'
import type { TradeReview } from '@/lib/review'

export async function POST(req: NextRequest) {
  const { frame, review } = (await req.json().catch(() => ({}))) as { frame?: any; review?: TradeReview }
  try {
    if (!review) return NextResponse.json({ error: 'review 없음' }, { status: 400 })
    return NextResponse.json(await proposeEvolution(frame ?? EXAMPLE_FRAME, review))
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output. (`edges.ts`/`scoreRuleEdges`는 이제 evolve에서 안 쓰이지만 파일·테스트는 유지.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/evolve.ts src/app/api/evolve/route.ts
git commit -m "refactor(evolve): 입력을 edges → TradeReview로 교체"
```

---

## Task 6: 에이전트 도구 `review_trades` + 카피

**Files:**
- Modify: `src/lib/tools.ts:34-38` (도구 정의), `src/lib/tools.ts:84-87` (dispatch), import; `src/lib/persona.ts:13,26`; `src/lib/demo.ts:37-40`

- [ ] **Step 1: 도구 정의 교체**

`src/lib/tools.ts`의 `run_backtest` 도구 객체(현재 `name: 'run_backtest'` 블록)를 다음으로 교체:

```ts
  {
    name: 'review_trades',
    description:
      '사용자의 실제 매매(보유내역·판단기록)를 그의 프레임으로 회고한다. 운/실력 분리 관점의 참고 요약. code를 주면 그 종목의 가상 시나리오도 만든다.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } } },
  },
```

- [ ] **Step 2: import + dispatch 교체**

`src/lib/tools.ts` 상단에서 `runBacktest` import를 `reviewTrades`로 바꾼다. (import 라인 찾기: `capabilities`에서 가져오는 줄)

기존:
```ts
import { compareToFrame, runBacktest, getPortfolio } from './capabilities'
```
→
```ts
import { compareToFrame, reviewTrades, getPortfolio } from './capabilities'
```

그리고 `runTool`의 `case 'run_backtest':` 블록을 다음으로 교체:

```ts
    case 'review_trades':
      if (!hasFrame(ctx.frame))
        return { noFrame: true, note: '사용자의 매매 원칙이 아직 없다. 원칙부터 만들자고 제안해라.' }
      return await reviewTrades(ctx.frame, { code: input?.code })
```

(참고: 서버에는 records가 없으므로 도구는 보유내역 기반 요약만 만든다. 상세 병합은 RetroPage가 /api/review로 수행.)

- [ ] **Step 3: persona 카피 교체**

`src/lib/persona.ts`:
- 13번째 줄의 `백테스트` → `회고`로:
  ```ts
  `  (1) 사용자의 매매 원칙(프레임) 형성·대조·회고  (2) 특정 종목 판단(시세·프레임 대조·회고·포트폴리오 맥락)  (3) Frame 자체(무엇을 하는 서비스인지)에 대한 설명.`,
  ```
- `4)`번 줄을 다음으로:
  ```ts
    `4) 회고/과거 성과를 물으면 review_trades를 쓴다(보유내역·판단기록을 프레임으로 돌아봄). "정답이 아니라 참고"이며 미래를 보장하지 않음을 고지한다.`,
  ```

- [ ] **Step 4: demo 나레이션 교체**

`src/lib/demo.ts`의 `id: 'retro'` 스텝의 `narration` 문자열을 다음으로 교체:

```ts
    narration:
      '"내 원칙으로 과거엔 어땠을까?"라고 물어보세요. 내가 한 매매(보유내역·판단기록)를 내 프레임으로 돌아보고, 원칙을 지킨 매매가 더 나았는지 운과 실력을 갈라 봅니다. 이동평균 규칙이 있으면 전체기간 시뮬도 보너스로 붙어요. (정답이 아니라 참고)',
```

- [ ] **Step 5: 기존 tools 테스트 회귀 확인**

Run: `npm test -- tools`
Expected: PASS. (만약 `run_backtest` 이름을 검증하는 케이스가 있으면 `review_trades`로 갱신. 없으면 그대로 통과.)

- [ ] **Step 6: Typecheck + Commit**

Run: `npx tsc --noEmit` → no output.
```bash
git add src/lib/tools.ts src/lib/persona.ts src/lib/demo.ts
git commit -m "refactor(agent): run_backtest → review_trades + 카피 정리"
```

---

## Task 7: 채팅 `ReviewCard` (cards.tsx)

**Files:**
- Modify: `src/app/components/cards.tsx` (`BacktestCard` 교체, import)

- [ ] **Step 1: import에 stockName 유무 확인 후 ReviewCard 작성**

`src/app/components/cards.tsx`의 `BacktestCard` 함수 전체(현재 `export function BacktestCard(...) { ... }`)를 다음 `ReviewCard`로 교체:

```ts
export function ReviewCard({ result, onExpand }: { result: any; onExpand: () => void }) {
  if (!result?.summary) return null
  const n = (result.items ?? []).length
  const verdict: string = result.summary.verdict ?? ''
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 px-4 py-3 bg-[#3478F6] text-white">
        <span className="text-base">🔁</span>
        <span className="font-extrabold text-sm">회고 · 내 매매 {n}건 돌아보기</span>
      </div>
      <div className="px-4 py-3 text-xs text-gray-700 leading-relaxed">{verdict}</div>
      <button onClick={onExpand} className={`${FOOT} text-[#3478F6]`}>
        전체 회고 결과 보기 <span className="ml-auto">→</span>
      </button>
    </div>
  )
}
```

(`Stat` 헬퍼는 이제 이 파일에서 안 쓰이면 제거한다. `Pill`은 `CompareCard`가 계속 쓰므로 유지.)

- [ ] **Step 2: 안 쓰는 헬퍼 정리**

`cards.tsx`에서 `BacktestCard`가 쓰던 `Stat` 함수가 다른 곳에서 안 쓰이면 삭제(정의만 있고 참조 0이면 lint noise). `grep -n "Stat" src/app/components/cards.tsx`로 참조가 `Stat(` 정의 1곳뿐이면 그 정의 삭제.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: `ChatPage.tsx`가 아직 `BacktestCard`를 import하므로 여기서 에러가 날 수 있다 — Task 8에서 함께 해소. 지금은 다음 태스크와 묶어 커밋한다.

- [ ] **Step 4: (커밋은 Task 8과 함께)**

---

## Task 8: ChatPage — side-effect 키·priceAtDecision·onOpenDetail

**Files:**
- Modify: `src/app/components/ChatPage.tsx` (import, `onOpenDetail` 타입, side-effect, 렌더, 자동기록)

- [ ] **Step 1: import 교체**

`src/app/components/ChatPage.tsx`의 cards import를 교체:

기존:
```ts
import { CompareCard, BacktestCard, FrameSavedCard, RecordChip } from './cards'
```
→
```ts
import { CompareCard, ReviewCard, FrameSavedCard, RecordChip } from './cards'
```

- [ ] **Step 2: `onOpenDetail` 타입에서 code 옵션화**

`ChatPage` props 타입의 해당 줄을 교체:

기존:
```ts
  onOpenDetail: (d: { kind: 'decision' | 'retro'; code: string }) => void
```
→
```ts
  onOpenDetail: (d: { kind: 'decision' | 'retro'; code?: string }) => void
```

- [ ] **Step 3: 자동 기록에 priceAtDecision 추가**

`handleSideEffects`의 `compare_to_frame` 블록 안 `addRecord({...})`를 교체:

기존:
```ts
        addRecord({
          code: t.output.code,
          okCount: t.output.summary.ok,
          violateCount: t.output.summary.violate,
          naCount: t.output.summary.na,
          note: '(대화 중 자동 기록)',
        })
```
→
```ts
        addRecord({
          code: t.output.code,
          okCount: t.output.summary.ok,
          violateCount: t.output.summary.violate,
          naCount: t.output.summary.na,
          priceAtDecision: t.output.quote?.price,
          note: '(대화 중 자동 기록)',
        })
```

- [ ] **Step 4: side-effect의 backtest 키 교체**

`handleSideEffects`의 마지막 줄을 교체:

기존:
```ts
      if (t.name === 'run_backtest' && t.output?.supported) markStep('retro')
```
→
```ts
      if (t.name === 'review_trades' && t.output?.summary) markStep('retro')
```

- [ ] **Step 5: 렌더의 BacktestCard 교체**

메시지 렌더 안 `t.tools?.map` 블록에서 BacktestCard 분기를 교체:

기존:
```ts
              if (t.name === 'run_backtest' && t.output?.supported)
                return <BacktestCard key={k} result={t.output} onExpand={() => onOpenDetail({ kind: 'retro', code: t.output.code })} />
```
→
```ts
              if (t.name === 'review_trades' && t.output?.summary)
                return <ReviewCard key={k} result={t.output} onExpand={() => onOpenDetail({ kind: 'retro', code: t.input?.code })} />
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (Task 7 + 8 합쳐 BacktestCard 참조 제거됨).

- [ ] **Step 7: Commit (Task 7 포함)**

```bash
git add src/app/components/cards.tsx src/app/components/ChatPage.tsx
git commit -m "feat(chat): ReviewCard + review_trades side-effect + priceAtDecision 기록"
```

---

## Task 9: DecisionPage 저장 시 priceAtDecision

**Files:**
- Modify: `src/app/components/DecisionPage.tsx` (저장 버튼 onClick)

- [ ] **Step 1: addRecord에 priceAtDecision 추가**

저장 버튼 `onClick`의 `addRecord({...})`를 교체:

기존:
```ts
            addRecord({ code, okCount: data.summary.ok, violateCount: data.summary.violate, naCount: data.summary.na, note })
```
→
```ts
            addRecord({ code, okCount: data.summary.ok, violateCount: data.summary.violate, naCount: data.summary.na, priceAtDecision: Number(data.quote?.price) || undefined, note })
```

- [ ] **Step 2: Typecheck + Commit**

Run: `npx tsc --noEmit` → no output.
```bash
git add src/app/components/DecisionPage.tsx
git commit -m "feat(decision): 판단 기록에 priceAtDecision 저장"
```

---

## Task 10: RetroPage 재작성 (계정 전체 회고)

**Files:**
- Modify: `src/app/components/RetroPage.tsx` (전체 재작성)

- [ ] **Step 1: RetroPage 전체 교체**

`src/app/components/RetroPage.tsx` 전체를 다음으로 교체:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: `MiniApp.tsx`가 `RetroPage`에 `code={detail.code}`를 넘기는데 detail.code 타입이 아직 `string`이라 통과할 수 있으나, retro의 code가 옵셔널이 되며 MiniApp detail 타입 조정이 필요할 수 있음 → Task 11에서 해소. 여기서 에러가 나면 Task 11과 함께 커밋.

- [ ] **Step 3: (커밋은 Task 11과 함께)**

---

## Task 11: MiniApp detail 타입 + 최종 검증

**Files:**
- Modify: `src/app/components/MiniApp.tsx` (detail state 타입, RetroPage 호출)

- [ ] **Step 1: detail 타입에서 retro code 옵션화**

`src/app/components/MiniApp.tsx`에서 `detail` 상태 타입 정의를 찾는다(`useState<... detail ...>` 또는 `type Detail`). retro의 code를 옵셔널로 만든다. 예: 유니온이 `{ kind: 'decision'; code: string } | { kind: 'retro'; code?: string } | { kind: 'frame' } | { kind: 'wiki' }` 형태가 되도록 조정.

구체적으로, 현재 detail 타입에 `code: string`이 retro/decision 공용으로 쓰이면, retro만 `code?`가 되도록 분리하거나 공용 타입을 `code?: string`으로 바꾼다. RetroPage 호출부(`<DecisionPage code={detail.code} .../>`는 decision이라 code 보장됨; retro는 `<RetroPage code={detail.code} ... />`로 옵셔널 허용).

가장 단순한 방법: detail 타입을 `{ kind: 'decision' | 'retro' | 'frame' | 'wiki'; code?: string }`로 두고, DecisionPage 호출에서 `code={detail.code!}`로 non-null 단언.

`{detail.kind === 'decision' && <DecisionPage code={detail.code!} frame={frame ?? EXAMPLE_FRAME} />}`
`{detail.kind === 'retro' && <RetroPage code={detail.code} frame={frame ?? EXAMPLE_FRAME} setFrame={onFrameChange} />}`

- [ ] **Step 2: 전체 Typecheck + 테스트**

Run: `npx tsc --noEmit` → no output.
Run: `npm test` → 모든 테스트 PASS(신규 review 포함, 기존 회귀 없음).

- [ ] **Step 3: 수동 브라우저 검증**

1. 예시 프레임 주입(브라우저 콘솔) 후 새로고침 → Frame 열기 → "과거 검증(회고)" 칩 클릭.
2. 확인:
   - 계정 전체 회고가 보유 3종목으로 채워짐(검색/맥락 종목과 무관하게).
   - 운/실력 요약 배너 한 줄.
   - 각 매매 카드: 보유/기록 배지 왼쪽, 성과·부합도 오른쪽.
   - 채팅에서 특정 종목 대조 후 회고를 그 맥락에서 열면 🔮 가상 시나리오 카드 노출.
   - "이동평균 없어서 안 돼요/추가하실래요?" nag가 더는 안 나옴.
   - sma_cross 규칙 + code 있을 때만 보너스 시뮬 카드.
3. 콘솔 에러 없음 확인.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/RetroPage.tsx src/app/components/MiniApp.tsx
git commit -m "feat(retro): 계정 전체 회고 화면 재작성(매매별 카드·운실력 요약·가상 시나리오)"
```

---

## Self-Review 결과 (작성자 체크)

- **스펙 커버리지**: 하이브리드 데이터(Task 3), 매매별 카드+요약+진화(Task 5,10), 계정전체+가상시나리오(Task 1,3,10), records 보강(Task 2,8,9), 도구/카피(Task 6), SMA 강등·nag 제거(Task 3,6,10), 클라→서버 records 전달(Task 4,10). 모두 태스크 존재.
- **플레이스홀더**: 없음(코드 전량 기재). Task 11만 MiniApp detail 타입이 코드베이스 현 형태에 의존 → non-null 단언 방식으로 명시.
- **타입 일관성**: `TradeReview`/`ReviewItem`/`ScenarioCard`/`ReviewSummary`/`DecisionRecordInput`는 review.ts에서 정의하고 capabilities·route·evolve·RetroPage가 동일 이름으로 import. `reviewTrades(frame, opts)`·`proposeEvolution(frame, review)` 시그니처가 호출부와 일치.
- **주의**: `smaBonus`는 `TradeReview`에서 축약형(`{params, result:{...}}`)으로 정의했고 RetroPage·capabilities가 그 형태만 사용(전체 `BtResult` 아님) — 일치 확인.
