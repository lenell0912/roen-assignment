'use client'
// 채팅 대화 영속화 — 새로고침·닫기에도 유지, '입력 정보 초기화' 때만 삭제.

export interface StoredMsg {
  role: 'user' | 'assistant'
  content: string
  tools?: unknown[]
}

const KEY = 'chat_v1'

export function loadChat(): StoredMsg[] {
  if (typeof window === 'undefined') return []
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? (v as StoredMsg[]) : []
  } catch {
    return []
  }
}

export function saveChat(msgs: StoredMsg[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(msgs))
}

export function clearChat(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
