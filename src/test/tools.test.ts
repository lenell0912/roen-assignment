import { describe, it, expect, vi } from 'vitest'
import { runTool } from '../lib/tools'
import { Frame } from '../lib/frame'

describe('runTool · 무프레임 가드', () => {
  it('compare_to_frame: 프레임이 없으면 noFrame', async () => {
    const out = await runTool('compare_to_frame', { code: '005930' }, {})
    expect(out).toMatchObject({ noFrame: true })
  })
  it('run_backtest: 프레임이 없으면 noFrame', async () => {
    const out = await runTool('run_backtest', { code: '005930' }, {})
    expect(out).toMatchObject({ noFrame: true })
  })
  it('프레임이 있어도 rules가 비어있으면 noFrame', async () => {
    const empty: Frame = { rules: [], updatedAt: 'x' }
    const out = await runTool('compare_to_frame', { code: '005930' }, { frame: empty })
    expect(out).toMatchObject({ noFrame: true })
  })
})

describe('runTool · update_frame 정직 보고', () => {
  it('유효 규칙 3개(자동체크 1개) → count:3, checksApplied:1, setFrame 호출', async () => {
    const setFrame = vi.fn()
    const input = {
      rules: [
        { kind: 'buy', text: '정배열에서만 산다', check: { type: 'sma_cross', fast: 5, slow: 20 } },
        { kind: 'sell', text: '근거가 깨지면 판다' },
        { kind: 'risk', text: '고점 추격 안 함', check: { type: 'price_vs_high' } }, // 필드 누락 → check 제거되지만 규칙 자체는 유효
      ],
    }
    const out = await runTool('update_frame', input, { setFrame })
    expect(out).toEqual({ saved: true, count: 3, checksApplied: 1, dropped: 0 })
    expect(setFrame).toHaveBeenCalledTimes(1)
    const savedFrame: Frame = setFrame.mock.calls[0][0]
    expect(savedFrame.rules).toHaveLength(3)
  })

  it('모두 잘못된 kind면 저장되지 않고 setFrame도 호출되지 않는다', async () => {
    const setFrame = vi.fn()
    const out = await runTool('update_frame', { rules: [{ kind: 'hold', text: '이상한 종류' }] }, { setFrame })
    expect(out).toEqual({ saved: false, count: 0, checksApplied: 0, dropped: 1 })
    expect(setFrame).not.toHaveBeenCalled()
  })
})

describe('runTool · resolve_stock 입력 코어션', () => {
  it('query가 없어도 던지지 않고 빈 matches를 반환', async () => {
    const out = await runTool('resolve_stock', {}, {})
    expect(out).toEqual({ matches: [] })
  })
})
