'use client'
import { useState } from 'react'
import Link from 'next/link'

// 진입 창구: 페이증권 앱 화면(스크린샷) + 플로팅 버튼. 스크린샷 없으면 폴백 UI.
export function Doorway({ onEnter }: { onEnter: () => void }) {
  const [imgOk, setImgOk] = useState(true)
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">카카오페이증권 앱 (프로토타입 배경) — 구매 직전, 코파일럿을 부른다</p>
      <div className="relative w-[320px] h-[640px] rounded-[28px] border-8 border-neutral-800 bg-white overflow-hidden shadow-2xl">
        {/* 폴백을 베이스로 깔고, 스크린샷이 로드되면 그 위에 덮는다 */}
        <FakeStockDetail />
        <img
          src="/screens/stock-detail.png"
          alt=""
          onLoad={() => setImgOk(true)}
          className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity ${imgOk ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* 플로팅 버튼 */}
        <button
          onClick={onEnter}
          className="absolute right-4 bottom-24 w-14 h-14 rounded-full bg-[#fae100] shadow-lg text-2xl grid place-items-center hover:scale-105 transition"
          aria-label="코파일럿 열기"
        >
          🧭
        </button>

        {/* 하단 판매/구매 = 결정의 순간 */}
        <div className="absolute inset-x-0 bottom-0 h-16 flex">
          <div className="flex-1 bg-blue-500 text-white grid place-items-center font-semibold">판매</div>
          <div className="flex-1 bg-red-500 text-white grid place-items-center font-semibold">구매</div>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <button onClick={onEnter} className="text-sm text-blue-600 underline">
          🧭 코파일럿 열기 (플로팅 버튼)
        </button>
        <Link href="/prd" className="text-sm font-semibold bg-[#fee500] px-3 py-1 rounded-full">
          📄 기획서(PRD)
        </Link>
      </div>
    </div>
  )
}

function FakeStockDetail() {
  return (
    <div className="w-full h-full bg-[#f7f8fa] text-[13px]">
      <div className="bg-white px-4 py-3 border-b">
        <div className="text-center font-bold">삼성전자 ▾</div>
        <div className="text-center text-lg font-bold">
          272,500원 <span className="text-blue-500 text-sm">▼0.73%</span>
        </div>
      </div>
      <div className="flex gap-3 px-4 py-2 text-gray-500 border-b">
        <span className="text-black font-semibold">정보</span>
        <span>차트</span><span>호가</span><span>보유</span><span>토론</span>
      </div>
      {[
        ['호가 현황', '사려는 수량 26.63% 많음'],
        ['내 보유', '—'],
        ['커뮤니티', '🔥 지금 뜨거움'],
        ['투자자별 거래', '외국인 3.0조'],
        ['뉴스·공시', '개미 계좌 녹는 동안…'],
      ].map(([a, b], i) => (
        <div key={i} className="flex justify-between px-4 py-3 bg-white border-b">
          <span>{a}</span>
          <span className="text-gray-500">{b}</span>
        </div>
      ))}
      <p className="px-4 py-2 text-[11px] text-gray-400">* public/screens/stock-detail.png 넣으면 실제 화면으로 교체됨</p>
    </div>
  )
}
