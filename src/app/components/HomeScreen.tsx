'use client'
import { useState } from 'react'

export function HomeScreen({ onSearch, pulseSearch }: { onSearch: () => void; pulseSearch?: boolean }) {
  // 폴백 홈을 기본으로 렌더하고, home.png가 실제로 로드되면(onLoad) 그때 덮는다.
  // (기본 true + onError 방식은 하이드레이션 전에 이미지가 404나면 에러 이벤트를 놓쳐 홈이 빈 화면이 됨)
  const [hasShot, setHasShot] = useState(false)
  return (
    <div className="absolute inset-0 bg-[#f7f8fa]">
      {!hasShot && <FallbackHome onSearch={onSearch} pulseSearch={pulseSearch} />}
      {/* 실제 앱 홈 스크린샷 — public/screens/home.png 에 넣으면 이걸로 덮인다 */}
      <img
        src="/screens/home.png"
        alt=""
        onLoad={() => setHasShot(true)}
        className={hasShot ? 'absolute inset-0 w-full h-full object-cover object-top' : 'hidden'}
      />
      {hasShot && (
        // 투명 핫스팟: 스크린샷 상단 우측(검색 아이콘 위치 가정)에 배치. 스크린샷 확정 후 위치 조정.
        <button
          aria-label="종목 검색"
          onClick={onSearch}
          className={`absolute top-12 right-3 w-12 h-12 z-30 rounded-full ${
            pulseSearch ? 'ring-4 ring-yellow-300 animate-pulse bg-yellow-200/40' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

// 스크린샷이 없을 때의 코드 폴백 홈 — 페이증권 결의 장식(정적)
function FallbackHome({ onSearch, pulseSearch }: { onSearch: () => void; pulseSearch?: boolean }) {
  return (
    <div className="w-full h-full flex flex-col text-[13px]">
      <div className="pt-12 px-4 pb-3 bg-white flex items-center">
        <span className="font-bold text-base">증권</span>
        <button
          onClick={onSearch}
          aria-label="종목 검색"
          className={`ml-auto w-9 h-9 grid place-items-center rounded-full text-lg ${
            pulseSearch ? 'ring-4 ring-yellow-300 animate-pulse' : ''
          }`}
        >
          🔍
        </button>
      </div>
      <div className="px-4 py-3 space-y-3 overflow-y-auto">
        <div className="bg-white rounded-2xl p-4">
          <div className="text-xs text-gray-500">내 투자</div>
          <div className="text-xl font-bold mt-1">3,241,050원</div>
          <div className="text-xs text-red-500">+2.1% (66,721원)</div>
        </div>
        <div className="bg-white rounded-2xl p-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">관심 종목</div>
          {[
            ['삼성전자', '+0.4%', 'text-red-500'],
            ['SK하이닉스', '-1.2%', 'text-blue-500'],
            ['에코프로비엠', '+3.8%', 'text-red-500'],
          ].map(([n, r, c]) => (
            <div key={n} className="flex justify-between py-1.5 border-b last:border-0">
              <span>{n}</span>
              <span className={c}>{r}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 text-xs text-gray-400">
          * 홈은 진입 연출용 목업입니다. public/screens/home.png를 넣으면 실제 앱 화면으로 교체됩니다.
        </div>
      </div>
      <div className="mt-auto flex border-t bg-white text-[11px] text-gray-400 text-center">
        {['홈', '주식', '내 자산', '메뉴'].map((t, i) => (
          <div key={t} className={`flex-1 py-3 ${i === 1 ? 'text-black font-semibold' : ''}`}>{t}</div>
        ))}
      </div>
    </div>
  )
}
