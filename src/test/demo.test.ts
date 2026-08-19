import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DEMO_STEPS, nextStep, DemoProgress, markStep, loadProgress } from '../lib/demo'

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

describe('markStep/loadProgress (stubbed browser)', () => {
  let store: Record<string, string>
  let dispatched: number
  beforeEach(() => {
    store = {}
    dispatched = 0
    ;(globalThis as any).window = { dispatchEvent: () => { dispatched++ } }
    ;(globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
    }
  })
  afterEach(() => {
    delete (globalThis as any).window
    delete (globalThis as any).localStorage
  })
  it('markStep은 새 스텝에 1번만 이벤트를 쏘고, 중복 호출은 무시한다', () => {
    markStep('open'); markStep('open')
    expect(dispatched).toBe(1)
    expect(loadProgress()).toEqual({ open: true })
  })
  it('저장소에 "null"이 있어도 빈 진행으로 복구한다', () => {
    store['demo_v1'] = 'null'
    expect(loadProgress()).toEqual({})
    expect(() => markStep('open')).not.toThrow()
  })
})
