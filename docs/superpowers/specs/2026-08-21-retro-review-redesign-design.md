# 회고(Retro) 재설계 — "백테스트" → "내 매매를 내 프레임으로 돌아보기"

- 작성일: 2026-08-21
- 상태: 설계 승인 대기

## 1. 배경 / 문제

현재 회고 태스크(③)는 데모 나레이션상 "실제 과거 데이터에 원칙을 대입(백테스트-라이트)해 규칙별 성과를 채점하고 개선안을 제안 … 운과 실력을 분리하는 되먹임 루프"라고 약속한다. 하지만 실제 구현(`RetroPage` + `backtestSmaCross` + `scoreRuleEdges`)은 **이동평균에 편향**돼 있다.

- **전체 기간 백테스트**(`backtestSmaCross`)는 `sma_cross` 규칙이 있을 때만 동작. 없으면 `runBacktest`가 `{ supported:false, note:'…이동평균 규칙이 없어…' }`를 반환하고, 에이전트가 이를 그대로 전해 **"이동평균 규칙 하나 추가하실래요?"** 라고 사용자에게 원칙 변경을 조른다. → 기능이 돌아가게 하려고 사용자 원칙을 바꾸라는 역전.
- **규칙별 엣지 채점**(`scoreRuleEdges`)도 `sma_cross`·`price_vs_high`만 채점 가능. 익절/손절·뉴스 규칙은 채점 불가.
- 제품의 진짜 자산인 **판단 기록(`records`)·보유 내역(`DEMO_PORTFOLIO`)** 이 회고에서 거의 안 쓰인다.

결론: "운/실력 분리 되먹임 루프"라는 목표엔 **내 실제 매매를 돌아보는 회고**가 더 맞다. 전체 기간 백테스트가 아니라 **계정 전체 회고 + (검색 종목) 가상 시나리오**로 전환한다.

## 2. 확정된 방향 (사용자 승인)

1. 회고 기준 = **하이브리드: 보유내역 + 판단기록**.
2. 회고 깊이 = **매매별 카드 + 운/실력 요약 + 진화 제안** (풀 버전).
3. 채움 방식 = **계정 전체 회고 + 검색 종목 가상 시나리오**.
   - 회고는 "지금 본 종목 하나"가 아니라 **계정 전체(내가 한 매매 전체)** 를 돌아본다 → 어떤 종목을 검색하든 데모 보유 3종목이 항상 실데이터로 채워져 **비거나 깨지지 않는다**. 시드 불필요.
   - 회고를 특정 종목 맥락에서 열면(그 종목을 보고 있었거나 방금 대조했으면), 그 종목의 **실제 과거 캔들**로 "N거래일 전 그 자리에서 봤다면 지금까지 ±X%" **가상 시나리오** 카드를 즉석 생성한다. 모든 종목 가능. 반드시 "가상"으로 명시.

## 3. 톤 / 한계

표본이 매우 작다(보유 3 + 소수 기록). 통계적 유의성 주장 금지. 데모 나레이션대로 **"정답이 아니라 참고 · 과최적화 주의"** 를 유지하고, 요약도 방향성만 캐주얼하게 제시하며, 표본 부족 시 "아직 판단하기 이르다"로 폴백한다.

## 4. 아키텍처 / 데이터 흐름

### 4.1 클라이언트/서버 분리 제약
- `records`(판단 기록)는 클라이언트 `localStorage`에만 있다(`records.ts`는 `'use client'`).
- `DEMO_PORTFOLIO`·`getQuote`·`evaluateFrame`은 서버(API 라우트)에서 돈다.
- 따라서 회고 계산을 한 곳에 모으려면 **클라이언트가 자기 records를 서버 엔드포인트로 넘긴다**.

### 4.2 새 공용 능력: `reviewTrades`
`src/lib/capabilities.ts`에 추가.

```ts
reviewTrades(
  frame: Frame,
  opts?: { code?: string; records?: DecisionRecordInput[] }
): Promise<TradeReview>
```

- `DecisionRecordInput`: 클라가 넘기는 최소 형태 `{ code, at, okCount, violateCount, naCount, priceAtDecision? , note? }`.
- 반환:

```ts
interface ReviewItem {
  source: 'holding' | 'record'
  code: string
  name: string                 // stockName(code) 사용
  entryPrice: number           // holding=avgPrice, record=priceAtDecision
  currentPrice: number
  returnPct: number            // (current-entry)/entry*100
  fit: { ok: number; violate: number; na: number }
  fitScore: number | null      // ok/(ok+violate); 자동판정 규칙이 하나도 없으면 null
  aged: boolean                // 성과가 유의미할 만큼 경과했나(요약 집계 포함 여부)
  at?: string                  // record만
  note?: string
}

interface ScenarioCard {       // opts.code 있을 때만
  code: string; name: string
  lookbackDays: number         // 20 (거래일)
  entryDate: string; entryPrice: number
  currentPrice: number; returnPct: number
  fit: { ok: number; violate: number; na: number }  // '그때' 프레임 부합도
}

interface ReviewSummary {
  followedAvg: number | null   // fitScore>=0.5 & aged 매매의 평균 성과
  brokeAvg: number | null      // fitScore<0.5 & aged 매매의 평균 성과
  edge: number | null          // followedAvg - brokeAvg (%p)
  verdict: string              // 캐주얼 한 줄 or '표본 부족 — 아직 판단하기 이르다'
  nFollowed: number; nBroke: number
}

interface TradeReview {
  items: ReviewItem[]
  summary: ReviewSummary
  scenario?: ScenarioCard
  smaBonus?: BacktestResult     // 프레임에 sma_cross 규칙이 있을 때만 (기존 runBacktest 재사용)
}
```

**계산 규칙**
- holdings: `DEMO_PORTFOLIO` 각 종목 → `getQuote`로 현재가, entry=avgPrice, `evaluateFrame(frame, { …, entryPrice })`로 fit. `aged=true`.
- records: `priceAtDecision`이 있는 기록만 성과 계산(`getQuote` 현재가 대비). `aged = (now - at) > 1일`. `priceAtDecision` 없는 옛 기록은 `entryPrice`/성과 생략하고 fit만 표시(리스트엔 남기되 집계 제외).
- fitScore: `ok+violate>0`이면 `ok/(ok+violate)`, 아니면 null(미지원-only → 요약 버킷 제외).
- summary: `aged && fitScore!=null` 항목만 버킷팅. 한쪽 버킷이 비면 `verdict='표본 부족 …'`.
- scenario: `getDailyCandles(code, ≥30)`에서 20거래일 전 인덱스를 entry로. 캔들이 모자라면 가장 오래된 지점. fit은 그 시점까지 자른 캔들로 `evaluateFrame`. (가상, 집계 제외)
- smaBonus: 프레임에 `sma_cross` 규칙이 있으면 기존 `runBacktest` 호출 결과를 그대로. 없으면 `undefined`(아무 안내도 안 함 — nag 제거).

### 4.3 새 엔드포인트: `POST /api/review`
- body: `{ frame, code?, records? }` → `reviewTrades` 호출 → `TradeReview`.
- `RetroPage`(클라)가 localStorage의 records를 실어 호출한다.

### 4.4 진화 제안(evolve) 입력 교체
- `proposeEvolution`의 입력을 `RuleEdge[]` → **TradeReview 요약**(매매별 fit·성과 + summary + 규칙 목록)으로 교체.
- 프롬프트: "이건 사용자의 실제 매매를 프레임으로 돌아본 결과다(표본 적음). 성과가 프레임 부합과 어떻게 갈리는지 보고, 규칙 1개 개정을 근거와 함께 제안. 과최적화 경고 포함." 반환 shape(`{ suggestion, proposal }`)·`applyProposal` 클라 로직은 유지.
- `/api/evolve` body도 `{ frame, review }`로 변경.
- `scoreRuleEdges`/`edges.ts`는 더 이상 회고 경로에서 쓰지 않는다(파일은 남기되 evolve 연결 제거). 관련 테스트(`edges.test.ts`)는 유지(순수 함수 회귀 방지).

### 4.5 records 보강
- `DecisionRecord`에 `priceAtDecision?: number` 추가.
- 저장 두 곳에서 대조 시점 시세를 넣는다:
  - `DecisionPage` 저장 버튼: `data.quote.price`.
  - `ChatPage.handleSideEffects`의 자동 기록: `t.output.quote?.price`.
- 하위호환: 필드 없는 옛 기록은 성과 없이 fit만 표시.

### 4.6 에이전트 도구 / 카피
- `run_backtest` 도구 → **`review_trades`** 로 개명(설명: "사용자의 실제 매매(보유·판단기록)를 프레임으로 회고. 운/실력 분리 관점의 참고 요약."). input: `{ code? }`(선택 — 맥락 종목이면 가상 시나리오용).
  - `runTool`의 `review_trades`는 `reviewTrades(frame, { code })`(records 없이, 서버엔 없음)로 **홀딩 기반 요약**을 만들어 LLM이 말할 재료로 반환. 상세 병합(records 포함)은 `RetroPage`가 `/api/review`로 수행.
  - `supported:false` 게이팅·nag 제거.
- `persona.ts`: `run_backtest` 언급 → `review_trades`, "백테스트" 표현을 "회고(돌아보기)"로 정리. "이동평균 아니면 안 됨" 뉘앙스 제거.
- `demo.ts` ③번 `retro` 나레이션: "백테스트-라이트" → "내가 한 매매를 내 프레임으로 돌아보고(보유·판단기록), 원칙을 지킨 매매가 더 나았는지 운/실력을 갈라 봅니다. (정답 아니라 참고)".
- 클라 side-effect: `run_backtest` → `review_trades`로 키 변경, `markStep('retro')` 유지.

## 5. UI (RetroPage 재작성)

`code`는 이제 **선택적 맥락**(가상 시나리오용)일 뿐, 회고 자체는 계정 전체다.

1. 헤더: "🔁 회고 — 내 매매를 내 프레임으로 돌아보기"
2. **운/실력 요약 배너**(상단): `summary.verdict` 한 줄. 예: "원칙을 지킨 매매가 평균 +A%p 나았어요 — 규칙이 도움된 신호 (표본 적음, 참고만)" / 폴백 "아직 판단하기 이르다".
3. **매매별 카드 리스트**: 각 `ReviewItem`
   - 좌: source 배지(보유/기록) + 종목명 + "매입가 N원" 또는 "대조 결정 · 날짜"
   - 우: 성과(`+X%`) 또는 `aged=false`면 "관찰 중(경과 짧음)"; 그 아래 fit 요약(부합/위반/미지원) — 기존 대조 카드 배지 어휘 재사용.
4. **가상 시나리오 카드**(scenario 있을 때): "🔮 가상 — {종목} 20거래일 전 ₩{entry}에서 봤다면: 지금 {±X%}. 그때 내 프레임 부합도 …" + "실제 매매가 아니라 참고용 가상 시나리오" 캡션.
5. **진화 제안**(evolve): 기존 카드 유지(입력만 교체).
6. **보너스: 전체기간 시뮬**(smaBonus 있을 때만): 기존 차트+3스탯을 하단 접이식/보너스 카드로. 없으면 렌더 안 함.
7. amber 한계 배너 유지.

로딩/에러: `/api/review` 실패 시 "회고를 불러오지 못했어요" 폴백. holdings 조회는 부분 실패 허용(가능한 것만 표시).

## 6. 영향 파일

- 신규: `src/app/api/review/route.ts`, 스펙/플랜 문서.
- 수정: `src/lib/capabilities.ts`(reviewTrades), `src/lib/frame.ts`(필요 시 fit 요약 헬퍼), `src/lib/records.ts`(priceAtDecision), `src/lib/evolve.ts`+`src/app/api/evolve/route.ts`(입력 교체), `src/lib/tools.ts`(review_trades), `src/lib/persona.ts`, `src/lib/demo.ts`, `src/app/components/RetroPage.tsx`(재작성), `src/app/components/DecisionPage.tsx`·`src/app/components/ChatPage.tsx`(priceAtDecision 저장 + side-effect 키), `src/app/components/cards.tsx`(BacktestCard → ReviewCard 성격 조정).
- 유지: `src/lib/backtest.ts`(smaBonus로 재사용), `src/lib/edges.ts`(회고 경로에서 분리, 테스트만 유지).

## 7. 테스트

- `reviewTrades`: 보유 성과·fitScore·aged 분류·summary 버킷(양쪽/한쪽 빈 경우)·scenario 계산 단위 테스트(캔들·quote는 목).
- `records`: priceAtDecision 하위호환(없는 기록은 성과 생략).
- 기존 41개 테스트 회귀 없음(edges/backtest 순수함수 유지).
- 수동: 데모에서 보유 3종목 회고 + 임의 종목 검색→회고→가상 시나리오, nag 사라짐 확인.

## 8. YAGNI / 범위 밖

- 실계좌 연동·실제 체결 이력·뉴스 감성 분석은 범위 밖(회고는 데모 포트폴리오+기록 한정).
- 판단기록에 "실제 행동(매수/매도/관망)" 캡처는 이번 범위 밖(부합도 + 시점가로 충분). 추후 확장 여지로만 남김.
