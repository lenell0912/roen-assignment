'use client'
import { Frame, EXAMPLE_FRAME } from './frame'

const KEY = 'frame_v1'

export function loadFrame(): Frame {
  if (typeof window === 'undefined') return EXAMPLE_FRAME
  try {
    const s = localStorage.getItem(KEY)
    return s ? (JSON.parse(s) as Frame) : EXAMPLE_FRAME
  } catch {
    return EXAMPLE_FRAME
  }
}

export function isExample(): boolean {
  if (typeof window === 'undefined') return true
  return !localStorage.getItem(KEY)
}

export function saveFrame(f: Frame): void {
  localStorage.setItem(KEY, JSON.stringify({ ...f, updatedAt: new Date().toISOString() }))
}

export function resetFrame(): void {
  localStorage.removeItem(KEY)
}
