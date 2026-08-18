'use client'
import { useState } from 'react'

// 목업: 이미 활성화된 페이증권 커뮤니티에 에이전트 상호작용을 흘려넣는 그림.
export function CommunityPage({ code }: { code: string }) {
  const [draft, setDraft] = useState(false)
  return (
    <div className="p-5 overflow-y-auto h-full text-sm">
      <div className="font-bold">👥 커뮤니티 다리 <span className="text-[11px] text-gray-400">(목업)</span></div>
      <div className="text-xs text-gray-500 mt-0.5">감정 케어 + 근거 공유. 에이전트가 중간에서 필터한다.</div>

      <div className="mt-3 border rounded-lg p-3 bg-violet-50 text-violet-900">
        <div className="text-xs font-semibold">읽기 — {code} 커뮤니티 심리</div>
        <div className="mt-1">공포·탐욕 지수 <b>71 (공포)</b> · 오늘 급락에 보유자 다수 불안. <b>너만 그런 거 아냐.</b></div>
        <div className="text-xs mt-1 opacity-80">논쟁 요약: “저가매수 기회다” vs “추세 꺾였다” — 오늘 하락은 실적 아니라 수급.</div>
      </div>

      <div className="mt-3 border rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-600">쓰기 — 내 판단 근거 공유 (자랑 아님)</div>
        <button onClick={() => setDraft(true)} className="mt-2 px-3 py-1.5 rounded bg-gray-800 text-white text-xs">
          내 판단 근거로 공유글 초안 보기
        </button>
        {draft && (
          <div className="mt-2 p-2 bg-neutral-50 rounded text-xs text-gray-700">
            “나는 {code}를 <b>내 프레임(정배열 + 고점 대비 여유)</b> 기준으로 봤다. 다만 2차전지 쏠림이 걸려서 비중은 소액으로. 근거가 깨지면 정리 예정.”
            <div className="mt-1 text-[11px] text-gray-400">* 발행은 네가 확인 후 직접. 에이전트는 초안까지만.</div>
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-gray-400">
        MVP에서는 목업입니다. 실제로는 대화에서 정리된 근거가 한 탭으로 커뮤니티에 발행되고, 커뮤니티 심리가 에이전트 대조의 신호로 들어옵니다.
      </div>
    </div>
  )
}
