# 매매법 등록(프레임 형성) 보완 — "유저 인풋 우선, 막히면 같이"

- 작성일: 2026-08-21
- 상태: 설계 승인됨(대화) → 구현 예정

## 1. 배경 / 문제
현재 프레임 형성 경로는 (1) 대화 소크라테스식 Q&A(백지에서 하나씩), (2) 편집 화면 수동 타이핑 — 둘 다 "백지에서 시작"이라 진입 장벽이 크다. PRD의 "프레임=노동" 리스크와 어긋난다.

## 2. 방향(승인)
- **시작은 유저 인풋**. 저압으로 사용자의 말부터 끌어낸다.
- **필요하면 같이 고민**(온디맨드). 막히거나 요청하면 어시스트가 등장.
- 어시스트 = **C(가벼운 질문) + B(규칙 라이브러리)** 조합, **LLM 도구로** 띄운다.
- 스타일 프리셋 "카드"(A)는 이번 범위 제외 — 라이브러리 제안이 대체.

## 3. 흐름 (프레임 없음, 첫 대화)
1. **오프닝(유저 인풋 유도)**: "평소 어떻게 사고파세요? 기준이든 파는 타이밍이든 편하게 한두 줄로요 — 딱 안 떠오르면 같이 골라드릴게요." 칩: **[막막해요 · 같이 골라줘]**, [위키 보기].
2. **경로 A(메인)**: 사용자가 자기 말로 한 줄이라도 주면 → AI가 **곧바로 3~4개 초안 규칙**을 `update_frame`으로 만들고 "이렇게 정리해봤어요 — 맞아요? 고칠 것?"으로 확인·수정. (긴 Q&A 대신 씨앗→초안→다듬기)
3. **경로 B(온디맨드)**: 막히거나 "같이 골라줘" → AI가 (필요시) 가벼운 질문 1개를 텍스트로 던지고(예: "주로 뭘 보세요? 추세/가치/뉴스·테마"), **`suggest_rules` 도구**를 호출 → 클라가 **규칙 제안 칩**을 대화 안에 렌더. 사용자가 탭하면 그 규칙이 프레임에 즉시 담김(토글). 여러 개 담고, 대화로 계속 다듬기.

## 4. 규칙 라이브러리 (신규 `src/lib/ruleLibrary.ts`)
```ts
export interface LibRule { key: string; kind: 'buy'|'sell'|'risk'; text: string; check?: MachineCheck }
export const RULE_LIBRARY: LibRule[] = [ /* ~12개, 아래 */ ]
export type Focus = 'trend'|'value'|'news'
export function suggestRules(focus?: Focus, limit=5): LibRule[]
```
큐레이션(자동체크 가능한 건 check 부여 → 바로 실데이터 대조):
- buy `trend-golden` "상승 추세에서만 산다 (5일선>20일선 정배열)" check sma_cross{5,20}
- buy `no-chase` "고점 추격 안 함 (최근 60일 고점 대비 10%+ 아래에서만)" check price_vs_high{60,10}
- buy `fundamentals` "실적·근거 없으면 안 산다"
- buy `scale-in` "분할 매수로 들어간다"
- sell `take-profit` "수익 +10% 도달 시 익절 검토"
- sell `stop-loss` "손실 -7% 도달 시 손절"
- sell `thesis-broken` "살 때의 근거가 깨지면 판다"
- sell `no-fomo` "뉴스·테마 급등은 추격 대신 관망"
- risk `sector-cap` "한 섹터에 계좌의 40%를 넘기지 않는다" check sector_concentration{40}
- risk `position-cap` "한 종목에 계좌의 20%를 넘기지 않는다"
- risk `no-leverage` "빚(신용·미수)으로 사지 않는다"
- risk `contrarian` "다들 사라 할 때 한 번 의심한다"

`suggestRules(focus)`:
- trend → [trend-golden, no-chase, no-fomo, stop-loss, sector-cap]
- value → [fundamentals, no-chase, thesis-broken, scale-in, position-cap]
- news → [no-fomo, contrarian, stop-loss, take-profit, sector-cap]
- 기본(focus 없음) → [trend-golden, no-chase, sector-cap, stop-loss, fundamentals]
순수 함수, 단위 테스트 대상.

## 5. LLM 도구 `suggest_rules` (`src/lib/tools.ts`)
- 정의: `{ name:'suggest_rules', description:'사용자가 원칙 만들기를 막막해하거나 도움을 요청하면, 참고용 규칙 후보를 제시한다. focus로 성향 반영.', input_schema:{ focus?: 'trend'|'value'|'news' } }`
- runTool: `return { rules: suggestRules(input?.focus) }` (네트워크 없음, 결정적)
- 프레임 유무 무관 호출 가능(주로 프레임 없을 때/부실할 때).

## 6. persona 변경 (`src/lib/persona.ts`)
- 형성 행동 규칙 교체: "프레임이 없거나 부실하면 **유저 인풋을 먼저 청한다**. 한 줄이라도 나오면 **되도록 빨리 3~4개 초안**을 update_frame으로 만들고 확인·수정한다. 사용자가 막막해하거나 도움을 요청하면(예: '모르겠어', '같이 골라줘') **`suggest_rules`** 를 호출해 후보를 제시하고, 필요하면 그 전에 가벼운 질문 1개(추세/가치/뉴스·테마)를 던진다. 한 번에 하나씩, 짧게." (현 8번/38줄의 '하나씩 되묻기'를 이 톤으로)
- 도구 목록 인식: review_trades처럼 suggest_rules 사용 규칙 1줄 추가.

## 7. ChatPage 변경 (`src/app/components/ChatPage.tsx`)
- 오프닝(openingText, no-frame·no-stock) 문구 교체.
- no-frame 칩: "내 매매 원칙 만들기" → **"막막해요 · 같이 골라줘"**(text: "원칙 만들기 막막해 — 같이 골라줘"). 나머지(종목 대조/위키) 유지.
- **규칙 제안 칩 렌더**: 메시지의 tool이 `suggest_rules`면 `t.output.rules`를 탭 칩 목록으로 렌더(picks 패턴 재사용). 각 칩: 종류 배지 + 규칙 텍스트 + 담김 상태(✓). 탭 → `toggleLibRule(rule)`.
- `toggleLibRule(rule)`: 현재 frame에 `id === 'lib:'+key` 있으면 제거, 없으면 추가(Rule{ id:'lib:'+key, kind, text, check }). `saveFrame` + `onFrameSaved` + 첫 추가 시 `markStep('frame')`. 담긴 개수 안내(선택).
- 담김 여부는 `frame` prop 기준으로 계산(실시간 반영).

## 8. 영향 파일
- 신규: `src/lib/ruleLibrary.ts`, `src/test/ruleLibrary.test.ts`, 스펙 문서.
- 수정: `src/lib/tools.ts`(도구), `src/lib/persona.ts`(행동), `src/app/components/ChatPage.tsx`(오프닝·칩·제안칩·toggle).
- 재사용: `update_frame`/`saveFrame`/`frameStore`/`markStep` 그대로.

## 9. 정직성 / 범위
- 라이브러리는 "참고용 예시 규칙(투자자문 아님)" 톤 유지, 칩 하단에 한 줄 고지.
- 편집 화면(FramePage)·EXAMPLE_FRAME은 그대로(예시 초기화 유지).
- 스타일 프리셋 카드(A)·풀 3문항 위저드는 범위 밖(추후).

## 10. 테스트
- `ruleLibrary`: suggestRules(focus별 순서/개수, 기본) + 라이브러리 무결성(중복 key 없음, check 타입 유효) 단위 테스트.
- 수동: 프레임 없음 → "같이 골라줘" → 제안 칩 탭 → 프레임 담김/토글 → hasFrame 전환 → 대조 동작. persona 초안 경로(자기 말 입력 → 초안) 확인.
