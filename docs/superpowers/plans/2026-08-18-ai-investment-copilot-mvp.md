# AI 투자 코파일럿 MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오페이증권 앱 화면(스크린샷) 위에 뜨는 플로팅 코파일럿 — "이거 사도 돼?" 대화 + "유튜브 영상 → 내 전략" 실동작을, 실제 시장 데이터(토스증권 오픈 API 주 제공자, Yahoo 폴백)와 Claude로 구현한다.

**Architecture:** Next.js(App Router, TS) 단일 앱. **MarketData provider 추상화**(토스증권=주, Yahoo=무계좌 폴백) 위에서 서버 route handler가 (a) 시세·일봉, (b) 유튜브 자막, (c) Claude(페르소나 대화 + 기법 추출)를 감싼다. **LLM은 "이해/추출"만, 신호 계산은 결정론적 코드**로 분리해 신뢰성을 확보한다. 지원하지 않는 기법은 신호를 지어내지 않고 요약·한계만 제공(정직 처리). 클라이언트는 스크린샷 배경 위 FAB + 바텀시트 챗.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind, Vitest, `@anthropic-ai/sdk`, `youtube-transcript`, `yahoo-finance2`, 토스증권 Open API (REST).

**보안:** 토스증권 client_id/secret, ANTHROPIC_API_KEY는 사용자가 `.env.local`에 직접 입력. 코드/문서/커밋에 키를 하드코딩하지 않는다.

> **API 검증 주의:** 토스증권의 정확한 엔드포인트 파라미터·응답 필드명은 실행 시 [개발자센터](https://developers.tossinvest.com/docs)의 OpenAPI JSON 스펙으로 대조 확인한다. 아래 값(토큰 `POST /oauth2/token`, 현재가 `/v1/market/price`, 캔들 `/v1/market/candles`)은 가이드 기준값이며 첫 실호출 테스트(Task 4)에서 검증한다.

---

## File Structure

```
src/
  lib/
    market/
      types.ts         # MarketData 인터페이스, Quote 타입
      toss.ts          # 토스증권 제공자 (OAuth 토큰 캐시, 현재가, 캔들)
      yahoo.ts         # Yahoo 제공자 (yahoo-finance2, 무계좌 폴백)
      index.ts         # env 기반 제공자 선택 + getQuote/getDailyCloses 재노출
    indicators.ts      # SMA, RSI (순수 함수)
    signal.ts          # 전략 신호 평가 (sma_cross 등, 순수 함수)
    strategy/
      schema.ts        # 추출 전략 스키마(zod) + 지원 전략 타입
      extract.ts       # 자막 → 전략 규칙 (Claude)
    transcript.ts      # 유튜브 자막 추출
    persona.ts         # 코파일럿 시스템 프롬프트 + 원칙
    tools.ts           # Claude tool 정의 + 실행 매핑
    portfolio.ts       # 데모용 가상 포트폴리오 + 비중 계산
  app/
    api/
      quote/route.ts       # GET 현재가
      history/route.ts     # GET 일봉
      transcript/route.ts  # GET 자막
      strategy/route.ts    # POST 영상URL+종목 → 규칙+신호+한계
      chat/route.ts        # POST 대화(tool-use 루프)
    page.tsx               # 앱 셸 (스크린샷 배경 + 화면 전환)
    components/
      AppShell.tsx         # 스크린샷 배경 + 하단 탭
      Fab.tsx              # 플로팅 버튼
      CopilotSheet.tsx     # 바텀시트 컨테이너
      Chat.tsx             # 메시지 리스트 + 입력
      StrategyResult.tsx   # 영상→전략 결과 카드
      WikiCards.tsx        # 기법/종목 카드 저장·목록 (localStorage)
      CommunityCard.tsx    # 커뮤니티 심리/근거 목업 카드
  test/
    indicators.test.ts
    signal.test.ts
    strategy-schema.test.ts
public/screens/            # home.png, stock-detail.png, community.png, account.png
```

---

## Task 1: 프로젝트 스캐폴드 + 테스트 셋업

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `tailwind.config.ts`, `postcss.config.js`, `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Next.js + TS + Tailwind + Vitest 초기화**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --use-npm --yes
npm i @anthropic-ai/sdk youtube-transcript zod yahoo-finance2
npm i -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: `vitest.config.ts` 작성**

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', include: ['src/test/**/*.test.ts'] },
})
```

- [ ] **Step 3: `.env.example` 작성 (키는 비워둠)**

```
# 시장 데이터 제공자: toss(주) | yahoo(무계좌 폴백)
MARKET_PROVIDER=toss
# 토스증권 Open API (앱 설정에서 즉시 발급, https://developers.tossinvest.com)
TOSS_CLIENT_ID=
TOSS_CLIENT_SECRET=
# Anthropic
ANTHROPIC_API_KEY=
```
> 계좌 준비 전에는 `MARKET_PROVIDER=yahoo`로 두면 키 없이 개발·데모 가능.

- [ ] **Step 4: `package.json`에 test script 추가**

```json
"scripts": { "dev": "next dev", "build": "next build", "start": "next start", "test": "vitest run" }
```

- [ ] **Step 5: 커밋**

```bash
git add -A && git commit -m "chore: Next.js + TS + Tailwind + Vitest 스캐폴드"
```

---

## Task 2: 지표 계산 (SMA, RSI) — TDD

**Files:**
- Create: `src/lib/indicators.ts`, `src/test/indicators.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/test/indicators.test.ts
import { describe, it, expect } from 'vitest'
import { sma, rsi } from '../lib/indicators'

describe('sma', () => {
  it('마지막 N개의 단순이동평균', () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3)
    expect(sma([2, 4, 6], 2)).toBe(5) // (4+6)/2
  })
  it('데이터가 기간보다 적으면 null', () => {
    expect(sma([1, 2], 5)).toBeNull()
  })
})

describe('rsi', () => {
  it('상승만 있으면 100에 근접', () => {
    const r = rsi([1, 2, 3, 4, 5, 6, 7, 8], 5)!
    expect(r).toBeGreaterThan(99)
  })
  it('데이터 부족 시 null', () => {
    expect(rsi([1, 2], 14)).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- indicators`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

```ts
// src/lib/indicators.ts
/** 마지막 period개의 단순이동평균. 데이터 부족 시 null */
export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  const slice = values.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

/** Wilder RSI. 데이터 부족 시 null */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null
  let gain = 0, loss = 0
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1]
    if (d >= 0) gain += d; else loss -= d
  }
  let avgGain = gain / period, avgLoss = loss / period
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- indicators`
Expected: PASS

- [ ] **Step 5: 커밋** — `git add -A && git commit -m "feat: SMA/RSI 지표 함수 (TDD)"`

---

## Task 3: 전략 신호 평가 (sma_cross) — TDD

**Files:**
- Create: `src/lib/signal.ts`, `src/test/signal.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/test/signal.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateSmaCross } from '../lib/signal'

const upTrend = [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]

describe('evaluateSmaCross', () => {
  it('골든크로스(직전 fast<=slow, 현재 fast>slow) → BUY', () => {
    // 하락 후 반등: 초반 하락으로 fast<slow였다가 상승 전환
    const closes = [20,19,18,17,16,15,14,13,12,11,10,12,14,16,18,20,22,24,26,28,30]
    const r = evaluateSmaCross(closes, 5, 20)
    expect(['BUY','HOLD_LONG']).toContain(r.signal)
    expect(r.fast).not.toBeNull()
  })
  it('지속 상승 → HOLD_LONG (fast>slow 유지)', () => {
    const r = evaluateSmaCross(upTrend, 5, 20)
    expect(r.signal).toBe('HOLD_LONG')
  })
  it('데이터 부족 → INSUFFICIENT', () => {
    expect(evaluateSmaCross([1,2,3], 5, 20).signal).toBe('INSUFFICIENT')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- signal` → FAIL

- [ ] **Step 3: 구현**

```ts
// src/lib/signal.ts
import { sma } from './indicators'

export type Signal = 'BUY' | 'SELL' | 'HOLD_LONG' | 'HOLD_FLAT' | 'INSUFFICIENT'
export interface SignalResult {
  signal: Signal
  fast: number | null
  slow: number | null
  reason: string
}

/** 5/20 이동평균 교차 전략 평가 (레퍼런스 영상 기준) */
export function evaluateSmaCross(closes: number[], fastP = 5, slowP = 20): SignalResult {
  if (closes.length < slowP + 1) {
    return { signal: 'INSUFFICIENT', fast: null, slow: null, reason: `데이터 ${slowP + 1}개 이상 필요` }
  }
  const fastNow = sma(closes, fastP)!
  const slowNow = sma(closes, slowP)!
  const prev = closes.slice(0, -1)
  const fastPrev = sma(prev, fastP)!
  const slowPrev = sma(prev, slowP)!

  if (fastPrev <= slowPrev && fastNow > slowNow)
    return { signal: 'BUY', fast: fastNow, slow: slowNow, reason: '골든크로스: 단기선이 장기선을 상향 돌파' }
  if (fastPrev >= slowPrev && fastNow < slowNow)
    return { signal: 'SELL', fast: fastNow, slow: slowNow, reason: '데드크로스: 단기선이 장기선을 하향 이탈' }
  if (fastNow > slowNow)
    return { signal: 'HOLD_LONG', fast: fastNow, slow: slowNow, reason: '정배열 유지(단기선 > 장기선)' }
  return { signal: 'HOLD_FLAT', fast: fastNow, slow: slowNow, reason: '역배열(단기선 < 장기선)' }
}
```

- [ ] **Step 4: 통과 확인** — Run: `npm test -- signal` → PASS
- [ ] **Step 5: 커밋** — `git commit -am "feat: 5/20 SMA 교차 신호 평가 (TDD)"`

---

## Task 4: MarketData 제공자 추상화 (토스증권 주 + Yahoo 폴백)

**Files:**
- Create: `src/lib/market/types.ts`, `src/lib/market/toss.ts`, `src/lib/market/yahoo.ts`, `src/lib/market/index.ts`

- [ ] **Step 1: 인터페이스 + 제공자 선택 (`types.ts`, `index.ts`)**

```ts
// src/lib/market/types.ts
export interface Quote { code: string; name?: string; price: number; changeRate: number }
export interface MarketData {
  getQuote(code: string): Promise<Quote>
  /** 일봉 종가 배열, 오래된→최신 순 */
  getDailyCloses(code: string, days?: number): Promise<number[]>
}
```

```ts
// src/lib/market/index.ts
import { MarketData } from './types'
import { tossProvider } from './toss'
import { yahooProvider } from './yahoo'

function provider(): MarketData {
  return process.env.MARKET_PROVIDER === 'yahoo' ? yahooProvider : tossProvider
}
export const getQuote = (code: string) => provider().getQuote(code)
export const getDailyCloses = (code: string, days?: number) => provider().getDailyCloses(code, days)
export type { Quote, MarketData } from './types'
```

- [ ] **Step 2: 토스증권 제공자 (`toss.ts`) — 토큰 캐시 + 현재가 + 캔들**

```ts
// src/lib/market/toss.ts
import { MarketData, Quote } from './types'

const BASE = 'https://openapi.tossinvest.com'
let cached: { token: string; exp: number } | null = null

async function token(): Promise<string> {
  if (cached && Date.now() < cached.exp) return cached.token
  const basic = Buffer.from(`${process.env.TOSS_CLIENT_ID}:${process.env.TOSS_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${BASE}/oauth2/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Toss token failed: ${res.status} ${await res.text()}`)
  const j = await res.json()
  cached = { token: j.access_token, exp: Date.now() + (Number(j.expires_in ?? 3600) - 60) * 1000 }
  return cached.token
}

async function authGet(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${await token()}` } })
  if (!res.ok) throw new Error(`Toss GET ${path} failed: ${res.status}`)
  return res.json()
}

// ⚠️ 응답 필드명(가격/종가/등락률)은 OpenAPI 스펙으로 Step 5에서 검증·수정
export const tossProvider: MarketData = {
  async getQuote(code: string): Promise<Quote> {
    const j = await authGet(`/v1/market/price?stockCode=${code}`)
    const d = j.result ?? j.data ?? j
    return { code, name: d.stockName ?? d.name, price: Number(d.price ?? d.close), changeRate: Number(d.changeRate ?? d.fluctuationRate) }
  },
  async getDailyCloses(code: string, days = 60): Promise<number[]> {
    const j = await authGet(`/v1/market/candles?stockCode=${code}&interval=day&count=${days}`)
    const rows: any[] = j.result ?? j.candles ?? j.data ?? []
    return rows.map(r => Number(r.close ?? r.closePrice)).filter(n => !isNaN(n)).reverse()
  },
}
```

- [ ] **Step 3: Yahoo 폴백 제공자 (`yahoo.ts`) — 무계좌**

```ts
// src/lib/market/yahoo.ts
import yahooFinance from 'yahoo-finance2'
import { MarketData, Quote } from './types'

/** KRX 6자리 코드 → Yahoo 심볼. 기본 .KS(코스피), 코스닥은 .KQ 로 매핑 확장 */
function sym(code: string) { return code.includes('.') ? code : `${code}.KS` }

export const yahooProvider: MarketData = {
  async getQuote(code: string): Promise<Quote> {
    const q = await yahooFinance.quote(sym(code))
    return { code, name: q.shortName, price: Number(q.regularMarketPrice), changeRate: Number(q.regularMarketChangePercent) }
  },
  async getDailyCloses(code: string, days = 60): Promise<number[]> {
    const period1 = new Date(Date.now() - days * 2 * 864e5)
    const c = await yahooFinance.chart(sym(code), { period1, interval: '1d' })
    return c.quotes.map((r: any) => Number(r.close)).filter((n: number) => !isNaN(n))
  },
}
```

- [ ] **Step 4: route handler `src/app/api/quote/route.ts` + `history/route.ts`**

```ts
// src/app/api/quote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/market'
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '005930'
  try { return NextResponse.json(await getQuote(code)) }
  catch (e: any) { return NextResponse.json({ error: String(e.message) }, { status: 502 }) }
}
```

```ts
// src/app/api/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDailyCloses } from '@/lib/market'
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '005930'
  try { return NextResponse.json({ code, closes: await getDailyCloses(code) }) }
  catch (e: any) { return NextResponse.json({ error: String(e.message) }, { status: 502 }) }
}
```

- [ ] **Step 5: 실호출 검증** — 먼저 무계좌로 `.env.local`에 `MARKET_PROVIDER=yahoo` → `npm run dev` → `http://localhost:3000/api/quote?code=005930` → 삼성전자 시세 JSON 확인. 이어서 토스 키 넣고 `MARKET_PROVIDER=toss`로 전환해 동일 확인. **이때 토스 응답 필드명을 OpenAPI 스펙과 대조**해 `toss.ts` 매핑(가격/종가/등락률) 수정.
- [ ] **Step 6: 커밋** — `git commit -am "feat: MarketData 추상화(토스 주 + Yahoo 폴백) + 시세/일봉 API"`

---

## Task 5: 유튜브 자막 추출

**Files:** Create: `src/lib/transcript.ts`, `src/app/api/transcript/route.ts`

- [ ] **Step 1: `transcript.ts`**

```ts
// src/lib/transcript.ts
import { YoutubeTranscript } from 'youtube-transcript'

export async function fetchTranscript(url: string): Promise<string> {
  const items = await YoutubeTranscript.fetchTranscript(url, { lang: 'ko' })
  return items.map(i => i.text).join(' ')
}
```

- [ ] **Step 2: route `src/app/api/transcript/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchTranscript } from '@/lib/transcript'
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  try { return NextResponse.json({ text: await fetchTranscript(url) }) }
  catch (e: any) { return NextResponse.json({ error: '자막을 가져오지 못했습니다', detail: String(e.message) }, { status: 502 }) }
}
```

- [ ] **Step 3: 검증** — `http://localhost:3000/api/transcript?url=https://www.youtube.com/watch?v=bARF75QgOtM` → 자막 텍스트 확인. **자막 없으면** 폴백 결정: (a) 영상 설명 사용 또는 (b) 규칙 프리셋(5/20 SMA)로 진행. 폴백을 `transcript.ts`에 주석으로 명시.
- [ ] **Step 4: 커밋** — `git commit -am "feat: 유튜브 자막 추출 + 라우트"`

---

## Task 6: 전략 스키마 + 추출 (Claude) — TDD(스키마)

**Files:** Create: `src/lib/strategy/schema.ts`, `src/lib/strategy/extract.ts`, `src/test/strategy-schema.test.ts`

- [ ] **Step 1: 스키마 실패 테스트**

```ts
// src/test/strategy-schema.test.ts
import { describe, it, expect } from 'vitest'
import { StrategySchema } from '../lib/strategy/schema'

it('유효한 sma_cross 전략 파싱', () => {
  const r = StrategySchema.safeParse({
    name: '5/20 이동평균 매매법', type: 'sma_cross', params: { fast: 5, slow: 20 },
    entryRules: ['단기선이 장기선 상향 돌파 시 매수'], exitRules: ['단기선 하향 이탈 시 매도'],
    assumptions: ['횡보장에서는 잦은 손절로 성과가 나빠짐'],
  })
  expect(r.success).toBe(true)
})
it('지원하지 않는 type 거부', () => {
  const r = StrategySchema.safeParse({ name:'x', type:'unknown', params:{}, entryRules:[], exitRules:[], assumptions:[] })
  expect(r.success).toBe(false)
})
```

- [ ] **Step 2: 실패 확인** — `npm test -- strategy-schema` → FAIL

- [ ] **Step 3: `schema.ts` 구현**

```ts
// src/lib/strategy/schema.ts
import { z } from 'zod'
export const StrategySchema = z.object({
  name: z.string(),
  type: z.enum(['sma_cross', 'unsupported']), // MVP는 sma_cross만 신호 계산; 그 외 기법은 unsupported로 정직 처리
  params: z.object({ fast: z.number(), slow: z.number() }).partial().passthrough(),
  entryRules: z.array(z.string()),
  exitRules: z.array(z.string()),
  assumptions: z.array(z.string()), // 이 기법이 안 통하는 상황(한계)
})
export type Strategy = z.infer<typeof StrategySchema>
```

- [ ] **Step 4: 통과 확인** — `npm test -- strategy-schema` → PASS

- [ ] **Step 5: `extract.ts` — 자막 → 전략(Claude, structured)**

```ts
// src/lib/strategy/extract.ts
import Anthropic from '@anthropic-ai/sdk'
import { StrategySchema, Strategy } from './schema'

const client = new Anthropic()

export async function extractStrategy(transcript: string): Promise<Strategy> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    tools: [{
      name: 'record_strategy',
      description: '영상에서 추출한 매매 기법을 구조화해 기록',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['sma_cross', 'unsupported'] },
          params: { type: 'object', properties: { fast: { type: 'number' }, slow: { type: 'number' } } },
          entryRules: { type: 'array', items: { type: 'string' } },
          exitRules: { type: 'array', items: { type: 'string' } },
          assumptions: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'type', 'params', 'entryRules', 'exitRules', 'assumptions'],
      },
    }],
    tool_choice: { type: 'tool', name: 'record_strategy' },
    messages: [{
      role: 'user',
      content: `다음은 주식 매매기법 유튜브 영상 자막이다. 여기서 매매 기법을 추출해 record_strategy로 기록하라.\n` +
        `- 영상이 '단기/장기 이동평균 교차' 계열이면 type='sma_cross'로 하고 fast/slow 기간을 채워라(불명확하면 5/20).\n` +
        `- 그 외 기법(RSI·볼린저·눌림목·캔들·재무 등)이면 type='unsupported'로 하되, name·entryRules·exitRules·assumptions는 정확히 채워라(신호 계산은 하지 않는다).\n` +
        `- 억지로 sma_cross로 분류하지 마라. 확신이 없으면 unsupported.\n` +
        `- assumptions에는 "이 기법이 안 통하는 상황"(예: 횡보장 휩쏘, 후행성)을 반드시 2개 이상 넣어라.\n\n자막:\n${transcript.slice(0, 6000)}`,
    }],
  })
  const tool = msg.content.find(c => c.type === 'tool_use') as any
  return StrategySchema.parse(tool.input)
}
```

- [ ] **Step 6: 커밋** — `git commit -am "feat: 전략 스키마(zod) + Claude 추출"`

---

## Task 7: 전략 분석 파이프라인 `/api/strategy`

**Files:** Create: `src/app/api/strategy/route.ts`

- [ ] **Step 1: 파이프라인 route (자막→추출→일봉→신호→한계)**

```ts
// src/app/api/strategy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchTranscript } from '@/lib/transcript'
import { extractStrategy } from '@/lib/strategy/extract'
import { getDailyCloses } from '@/lib/market'
import { evaluateSmaCross } from '@/lib/signal'

export async function POST(req: NextRequest) {
  const { url, code = '005930' } = await req.json()
  try {
    const transcript = await fetchTranscript(url)
    const strategy = await extractStrategy(transcript)
    // 미지원 기법: 신호를 지어내지 않고 요약·한계만 반환 (정직 처리)
    if (strategy.type !== 'sma_cross') {
      return NextResponse.json({ strategy, signal: null, supported: false, code })
    }
    const closes = await getDailyCloses(code)
    const signal = evaluateSmaCross(closes, strategy.params.fast ?? 5, strategy.params.slow ?? 20)
    return NextResponse.json({ strategy, signal, supported: true, code })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
```

- [ ] **Step 2: 검증** — 지원 영상(레퍼런스): `curl -s localhost:3000/api/strategy -XPOST -H 'content-type: application/json' -d '{"url":"https://www.youtube.com/watch?v=bARF75QgOtM","code":"005930"}'` → `supported:true` + signal 확인. 이어서 RSI/볼린저 등 다른 영상 URL로 호출 → `supported:false` + signal:null(요약·한계만) 확인.
- [ ] **Step 3: 커밋** — `git commit -am "feat: 영상→내 전략 분석 파이프라인 API"`

---

## Task 8: 데모 포트폴리오 + 페르소나 + 챗 도구

**Files:** Create: `src/lib/portfolio.ts`, `src/lib/persona.ts`, `src/lib/tools.ts`

- [ ] **Step 1: `portfolio.ts` (실계좌 0주식 → 데모용 가상 보유)**

```ts
// src/lib/portfolio.ts
export interface Holding { code: string; name: string; sector: string; qty: number; avgPrice: number }
export const DEMO_PORTFOLIO: Holding[] = [
  { code: '005930', name: '삼성전자', sector: '반도체', qty: 30, avgPrice: 71000 },
  { code: '373220', name: 'LG에너지솔루션', sector: '2차전지', qty: 3, avgPrice: 420000 },
  { code: '247540', name: '에코프로비엠', sector: '2차전지', qty: 8, avgPrice: 180000 },
]
export function sectorWeights(hs = DEMO_PORTFOLIO) {
  const val = (h: Holding) => h.qty * h.avgPrice
  const total = hs.reduce((s, h) => s + val(h), 0)
  const by: Record<string, number> = {}
  for (const h of hs) by[h.sector] = (by[h.sector] ?? 0) + val(h)
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round((v / total) * 100)]))
}
```

- [ ] **Step 2: `persona.ts` (시스템 프롬프트 = 원칙 + 톤)**

```ts
// src/lib/persona.ts
export const SYSTEM_PROMPT = `너는 카카오페이증권의 AI 투자 코파일럿이다. 페르소나는 "친근한 투자 선배".
말투: 반말 섞인 친근·직설. 2030 초보에게 편하게.
반드시 지킬 원칙:
1) 절대 "사라/팔아라"로 대신 결정하지 않는다. 사용자의 판단을 보완한다.
2) 항상 사용자의 포트폴리오 맥락(섹터 비중·보유)을 근거로 말한다. 필요하면 get_portfolio/get_quote 도구를 쓴다.
3) 결정과 실행은 사용자 몫임을 상기시킨다.
행동: (a) 팩트 브리핑 → (b) "왜 지금 사려고?" 되묻기 → (c) 반대편 근거도 제시(악마의 변호인).
실패 패턴(쏠림·추격매수·뇌동매매)이 보이면 결정 전에 짚어준다.
투자 조언이 아니며 참고용임을 자연스럽게 고지한다.`
```

- [ ] **Step 3: `tools.ts` (Claude tool 정의 + 실행)**

```ts
// src/lib/tools.ts
import { getQuote } from './market'
import { DEMO_PORTFOLIO, sectorWeights } from './portfolio'

export const TOOLS = [
  { name: 'get_quote', description: '종목 현재가 조회', input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } },
  { name: 'get_portfolio', description: '사용자 보유 종목과 섹터 비중', input_schema: { type: 'object', properties: {} } },
] as const

export async function runTool(name: string, input: any) {
  if (name === 'get_quote') return await getQuote(input.code)
  if (name === 'get_portfolio') return { holdings: DEMO_PORTFOLIO, sectorWeights: sectorWeights() }
  throw new Error(`unknown tool ${name}`)
}
```

- [ ] **Step 4: 커밋** — `git commit -am "feat: 데모 포트폴리오 + 페르소나 프롬프트 + 챗 도구"`

---

## Task 9: 코파일럿 대화 `/api/chat` (tool-use 루프)

**Files:** Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: tool-use 루프 구현**

```ts
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/persona'
import { TOOLS, runTool } from '@/lib/tools'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json() // messages: {role,content}[], context: {code?}
  const sys = context?.code ? `${SYSTEM_PROMPT}\n\n[현재 화면 맥락] 사용자가 보고 있는 종목 코드: ${context.code}` : SYSTEM_PROMPT
  const convo: any[] = [...messages]
  for (let i = 0; i < 5; i++) {
    const res = await client.messages.create({
      model: 'claude-sonnet-5', max_tokens: 1024, system: sys, tools: TOOLS as any, messages: convo,
    })
    const toolUses = res.content.filter((c: any) => c.type === 'tool_use')
    convo.push({ role: 'assistant', content: res.content })
    if (toolUses.length === 0) {
      const text = res.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
      return NextResponse.json({ reply: text })
    }
    const results = await Promise.all(toolUses.map(async (t: any) => ({
      type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(await runTool(t.name, t.input).catch(e => ({ error: String(e.message) }))),
    })))
    convo.push({ role: 'user', content: results })
  }
  return NextResponse.json({ reply: '(응답 생성에 실패했어요. 다시 시도해줘.)' })
}
```

- [ ] **Step 2: 검증** — curl로 `{"messages":[{"role":"user","content":"삼성전자 지금 사도 돼?"}],"context":{"code":"005930"}}` → 페르소나 답변 + 도구 사용 확인
- [ ] **Step 3: 커밋** — `git commit -am "feat: 코파일럿 대화 API (tool-use 루프 + 화면 맥락)"`

---

## Task 10: 앱 셸 (스크린샷 배경 + 화면 전환)

**Files:** Create: `src/app/page.tsx`, `src/app/components/AppShell.tsx`

- [ ] **Step 1: `AppShell.tsx` — 스크린샷 배경 + 화면 선택**

```tsx
// src/app/components/AppShell.tsx
'use client'
type Screen = 'home' | 'stock' | 'community' | 'account'
const SRC: Record<Screen, string> = {
  home: '/screens/home.png', stock: '/screens/stock-detail.png',
  community: '/screens/community.png', account: '/screens/account.png',
}
export function AppShell({ screen, onSwitch }: { screen: Screen; onSwitch: (s: Screen) => void }) {
  return (
    <div className="relative mx-auto w-[390px] h-[844px] bg-white overflow-hidden shadow-xl">
      <img src={SRC[screen]} alt={screen} className="w-full h-full object-cover object-top select-none" />
      <div className="absolute top-2 left-2 flex gap-1 text-xs">
        {(['home','stock','community','account'] as Screen[]).map(s => (
          <button key={s} onClick={() => onSwitch(s)}
            className={`px-2 py-1 rounded ${screen===s?'bg-black text-white':'bg-white/80'}`}>{s}</button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `page.tsx` — 상태(화면/시트) 조립 (컴포넌트는 Task 11에서 채움)**

```tsx
// src/app/page.tsx
'use client'
import { useState } from 'react'
import { AppShell } from './components/AppShell'
import { Fab } from './components/Fab'
import { CopilotSheet } from './components/CopilotSheet'

const CTX: Record<string, string | undefined> = { stock: '005930', community: '005930', home: undefined, account: undefined }
export default function Page() {
  const [screen, setScreen] = useState<'home'|'stock'|'community'|'account'>('stock')
  const [open, setOpen] = useState(false)
  return (
    <main className="min-h-screen bg-neutral-200 py-6">
      <AppShell screen={screen} onSwitch={setScreen} />
      <Fab onClick={() => setOpen(true)} />
      {open && <CopilotSheet code={CTX[screen]} onClose={() => setOpen(false)} />}
    </main>
  )
}
```

- [ ] **Step 3: 검증** — `public/screens/`에 4장 저장 후 `npm run dev` → 화면 전환 확인 (스크린샷 없으면 회색 박스로 임시 진행)
- [ ] **Step 4: 커밋** — `git commit -am "feat: 앱 셸(스크린샷 배경 + 화면 전환)"`

---

## Task 11: 플로팅 버튼 + 바텀시트 + 챗 UI

**Files:** Create: `src/app/components/Fab.tsx`, `CopilotSheet.tsx`, `Chat.tsx`

- [ ] **Step 1: `Fab.tsx`**

```tsx
// src/app/components/Fab.tsx
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-20 w-14 h-14 rounded-full bg-[#fae100] shadow-lg text-2xl"
      style={{ marginLeft: 150 }} aria-label="코파일럿 열기">🧭</button>
  )
}
```

- [ ] **Step 2: `CopilotSheet.tsx` (탭: 대화 / 영상→전략)**

```tsx
// src/app/components/CopilotSheet.tsx
'use client'
import { useState } from 'react'
import { Chat } from './Chat'
import { StrategyResult } from './StrategyResult'
export function CopilotSheet({ code, onClose }: { code?: string; onClose: () => void }) {
  const [tab, setTab] = useState<'chat'|'strategy'>('chat')
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-[390px] h-[70%] bg-white rounded-t-2xl shadow-2xl flex flex-col">
      <div className="p-2 flex items-center gap-2 border-b">
        <div className="w-9 h-1 bg-gray-300 rounded absolute left-1/2 -translate-x-1/2 top-1" />
        {code && <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded">📍 종목 {code} 인지됨</span>}
        <button onClick={()=>setTab('chat')} className={tab==='chat'?'font-bold':''}>대화</button>
        <button onClick={()=>setTab('strategy')} className={tab==='strategy'?'font-bold':''}>영상→전략</button>
        <button onClick={onClose} className="ml-auto text-gray-400">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab==='chat' ? <Chat code={code} /> : <StrategyResult code={code ?? '005930'} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `Chat.tsx` (메시지 + `/api/chat` 호출)**

```tsx
// src/app/components/Chat.tsx
'use client'
import { useState } from 'react'
export function Chat({ code }: { code?: string }) {
  const [msgs, setMsgs] = useState<{role:string;content:string}[]>([])
  const [input, setInput] = useState(''); const [loading, setLoading] = useState(false)
  async function send() {
    if (!input.trim()) return
    const next = [...msgs, { role: 'user', content: input }]
    setMsgs(next); setInput(''); setLoading(true)
    const res = await fetch('/api/chat', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ messages: next, context: { code } }) })
    const j = await res.json()
    setMsgs([...next, { role: 'assistant', content: j.reply ?? j.error }]); setLoading(false)
  }
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-3 space-y-2 text-sm">
        {msgs.map((m,i)=>(<div key={i} className={m.role==='user'?'text-right':''}>
          <span className={`inline-block px-3 py-2 rounded-2xl ${m.role==='user'?'bg-[#fae100]':'bg-gray-100'}`}>{m.content}</span></div>))}
        {loading && <div className="text-gray-400 text-xs">코파일럿이 생각 중…</div>}
      </div>
      <div className="p-2 border-t flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          className="flex-1 border rounded-full px-3 py-2 text-sm" placeholder="이거 사도 돼?" />
        <button onClick={send} className="px-3 rounded-full bg-black text-white text-sm">전송</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 검증** — 시트 열고 "삼성전자 지금 사도 돼?" → 페르소나 답변(포트폴리오 비중 언급) 확인
- [ ] **Step 5: 커밋** — `git commit -am "feat: FAB + 바텀시트 + 코파일럿 챗 UI"`

---

## Task 12: "영상→내 전략" UI + 위키 카드 + 커뮤니티 목업

**Files:** Create: `src/app/components/StrategyResult.tsx`, `WikiCards.tsx`, `CommunityCard.tsx`

- [ ] **Step 1: `StrategyResult.tsx` (링크 입력 → `/api/strategy` → 규칙·신호·한계 + 저장)**

```tsx
// src/app/components/StrategyResult.tsx
'use client'
import { useState } from 'react'
import { saveCard } from './WikiCards'
const REF = 'https://www.youtube.com/watch?v=bARF75QgOtM'
export function StrategyResult({ code }: { code: string }) {
  const [url, setUrl] = useState(REF); const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(false)
  async function run() {
    setLoading(true); setData(null)
    const res = await fetch('/api/strategy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ url, code }) })
    setData(await res.json()); setLoading(false)
  }
  return (
    <div className="p-3 text-sm space-y-3">
      <input value={url} onChange={e=>setUrl(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" />
      <button onClick={run} className="w-full bg-black text-white rounded py-2">이 영상 기법, 내 종목에 적용</button>
      {loading && <p className="text-gray-400">자막 분석 → 기법 추출 → 신호 계산 중…</p>}
      {data?.strategy && (<div className="space-y-2">
        <div className="font-bold">📌 {data.strategy.name}</div>
        <div><b>진입:</b> {data.strategy.entryRules.join(' · ')}</div>
        <div><b>청산:</b> {data.strategy.exitRules.join(' · ')}</div>
        {data.supported
          ? <div className="bg-blue-50 p-2 rounded"><b>지금 {data.code} 신호:</b> {data.signal.signal} — {data.signal.reason}</div>
          : <div className="bg-gray-100 p-2 rounded text-gray-600">이 기법은 아직 <b>자동 신호 계산 미지원</b>이야(지원: 이동평균 교차 계열). 요약·한계만 제공할게 — 신호를 지어내지 않아.</div>}
        <div className="bg-amber-50 p-2 rounded"><b>⚠️ 이 기법의 한계:</b><ul className="list-disc ml-4">{data.strategy.assumptions.map((a:string,i:number)=><li key={i}>{a}</li>)}</ul></div>
        <button onClick={()=>saveCard({ title: data.strategy.name, body: JSON.stringify(data.strategy) })} className="text-blue-600 underline">📓 기법 카드로 내 위키에 저장</button>
      </div>)}
      {data?.error && <p className="text-red-500">{data.error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: `WikiCards.tsx` (localStorage 저장/목록)**

```tsx
// src/app/components/WikiCards.tsx
'use client'
export function saveCard(card: { title: string; body: string }) {
  const key = 'wiki_cards'
  const cur = JSON.parse(localStorage.getItem(key) ?? '[]')
  localStorage.setItem(key, JSON.stringify([{ ...card, at: new Date().toISOString() }, ...cur]))
  alert('내 위키에 저장했어!')
}
export function WikiCards() {
  const cards = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wiki_cards') ?? '[]') : []
  return <div className="p-3 space-y-2">{cards.map((c:any,i:number)=>(<div key={i} className="border rounded p-2 text-xs"><b>{c.title}</b></div>))}</div>
}
```

- [ ] **Step 3: `CommunityCard.tsx` (심리·근거 공유 목업)**

```tsx
// src/app/components/CommunityCard.tsx
export function CommunityCard() {
  return (
    <div className="p-3 text-sm space-y-2">
      <div className="bg-purple-50 p-2 rounded">👥 삼성전자 커뮤니티 심리: <b>공포 71%</b> · 오늘 급등은 실적 아닌 수급</div>
      <button className="w-full border rounded py-2">📤 내 판단 근거 커뮤니티에 공유 (초안 보기)</button>
      <p className="text-[11px] text-gray-400">* 발행은 사용자가 확인 후 직접. 에이전트는 초안까지만.</p>
    </div>
  )
}
```

- [ ] **Step 4: `CopilotSheet.tsx`에 '커뮤니티' 탭 추가 후 검증** — 레퍼런스 영상으로 전체 플로우 데모(추출→신호→한계→저장) 확인
- [ ] **Step 5: 커밋** — `git commit -am "feat: 영상→전략 UI + 위키 카드 + 커뮤니티 목업"`

---

## Task 13: 면책·마무리·배포 + 산출물 문서

**Files:** Create: `src/app/components/Disclaimer.tsx`, `README.md`, `docs/PRD.md`, `docs/AI-활용.md`

- [ ] **Step 1: 면책 고지** — 시트 하단에 "본 서비스는 투자 참고용이며 투자 자문이 아닙니다. 최종 결정은 사용자에게 있습니다." 상시 노출(`Disclaimer.tsx`)
- [ ] **Step 2: `README.md`** — 실행법(.env.local: 토스증권 client_id/secret 발급법 또는 무계좌 `MARKET_PROVIDER=yahoo`, Anthropic 키), `npm i && npm run dev`, 아키텍처 요약, 스크린샷.
- [ ] **Step 3: `docs/PRD.md`** — 스펙 기반 1~2p PRD (해결 문제/타겟/가설/검증지표 필수 + 차별화: 기존 증권봇·AI인사이트 대비 + 로드맵). 설계문서에서 축약.
- [ ] **Step 4: `docs/AI-활용.md`** — Prototype 제작에 AI를 어떻게 썼는지(브레인스토밍→스펙→플랜→구현, Claude 도구사용 에이전트 설계).
- [ ] **Step 5: 배포** — Vercel 연결, 환경변수(토스 또는 yahoo, Anthropic 키) 설정, 배포 URL 확보. **주의:** 토스 API의 호출 IP 화이트리스트/요청 제한 정책 확인(서버리스 IP 이슈 시 `MARKET_PROVIDER=yahoo`로 데모). 배포 후 `/api/quote` 동작 검증.
- [ ] **Step 6: 커밋 + 푸시(사용자 승인 후)** — `git commit -am "feat: 면책/문서/배포"` 후 사용자 확인하에 `git push origin main`

---

## Self-Review 결과

- **Spec 커버리지:** 코파일럿 대화(Task 9,11) · 영상→내 전략(Task 5~7,12) · 실시세(토스 주+Yahoo 폴백, Task 4) · 개인위키 라이트(Task 12) · 커뮤니티 목업(Task 12) · 플로팅 진입점/화면맥락(Task 10,11) · 페르소나·원칙(Task 8) · 데모 포트폴리오(Task 8) · 면책/PRD/AI활용(Task 13) 모두 매핑됨. 로드맵 항목(백테스트·자동주문·코치·카톡 실연동)은 의도적으로 구현 제외(PRD 기술만).
- **타입 일관성:** `evaluateSmaCross`/`Strategy`/`Holding`/`runTool`/`MarketData`/`getQuote`/`getDailyCloses` 명칭이 태스크 간 일치. 시세는 전부 `@/lib/market`에서 import(kis 잔재 없음). 전략 `type`은 `sma_cross`(신호 계산) | `unsupported`(요약·한계만) 2종을 스키마·추출·파이프라인·UI 4곳에서 일관 처리.
- **정직 처리 확인:** 미지원 기법은 `/api/strategy`가 `signal:null, supported:false` 반환 → `StrategyResult`가 신호 대신 "미지원" 안내 렌더(신호 조작 없음).
- **미검증 리스크(실행 중 확인):** ① 토스 엔드포인트 응답 필드명(Task 4 Step5, OpenAPI 스펙 대조) ② 유튜브 자막 존재(Task 5 Step3 폴백) ③ Yahoo 코스닥 심볼 `.KQ` 매핑 ④ Claude 모델 id는 실행 시점 최신으로 확인(`claude-api` 스킬 참고).
