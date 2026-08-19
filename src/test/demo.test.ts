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
