'use client'
import { useEffect, useRef, useState } from 'react'

export function HomeScreen({ onSearch, pulseSearch }: { onSearch: () => void; pulseSearch?: boolean }) {
  // 폴백 홈을 기본으로 렌더하고, home.png가 실제로 로드되면 그때 덮는다.
  // 캐시된 이미지는 마운트 시점에 이미 complete라 onLoad가 안 뜰 수 있어, 마운트 시 완료 여부를 직접 확인한다.
  const [hasShot, setHasShot] = useState(false)
  const [atTop, setAtTop] = useState(true) // 헤더(돋보기)가 보이는 최상단인지 — 스크롤 내리면 검색 핫스팟 숨김
  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setHasShot(true)
  }, [])
  return (
    <div className="absolute inset-0 bg-[#f7f8fa]">
      {!hasShot && <FallbackHome onSearch={onSearch} pulseSearch={pulseSearch} />}
      {/* 실제 앱 홈(긴 스크린샷) — public/home.png. 세로 스크롤, 하단 플로팅 탭바는 뒤로 흐른다 */}
      <div
        className={hasShot ? 'absolute inset-0 ios-scroll bg-white' : 'hidden'}
        onScroll={(e) => setAtTop(e.currentTarget.scrollTop < 40)}
      >
        <div className="relative">
          <img ref={imgRef} src="/home.png" alt="" onLoad={() => setHasShot(true)} className="w-full block select-none" />
          {/* 투명 검색 핫스팟: 헤더 우측 돋보기(🔍) 위 — home.png 실측 글리프 중심(x71.14% y2.60%)에 정중앙 정렬. 최상단에서만 노출(스크롤 내리면 숨김) */}
          {atTop && (
            <button
              aria-label="종목 검색"
              onClick={onSearch}
              className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                pulseSearch ? 'ring-4 ring-yellow-300 animate-pulse bg-yellow-200/40' : 'opacity-0'
              }`}
              style={{ top: '2.60%', left: '71.14%', width: '6.4%', height: '1.0%' }}
            />
          )}
        </div>
      </div>
      {hasShot && <FloatingTabBar />}
    </div>
  )
}

// 실제 앱 하단 플로팅 탭바 — 뒤로가기(별도 원형)와 4탭(증권홈·관심·발견·소식)이 구분된 형태.
// 바닥 고정, 콘텐츠는 뒤로 스크롤. 탭은 눌리되 프로토타입 범위 밖 안내 토스트.
function FloatingTabBar() {
  const [toast, setToast] = useState('')
  function outOfScope() {
    setToast('과제 프로토타입 범위 밖이에요')
    setTimeout(() => setToast(''), 1800)
  }
  const tabs = [
    { src: '/icon_home.png', label: '증권홈', active: true },
    { src: '/icon_관심.png', label: '관심', active: false },
    { src: '/icon_발견.png', label: '발견', active: false },
    { src: '/icon_소식.png', label: '소식', active: false },
  ]
  return (
    <>
      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-28 z-40 bg-black/80 text-white text-xs px-3 py-2 rounded-full whitespace-nowrap">
          {toast}
        </div>
      )}
      <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2">
        {/* 뒤로가기 — 4탭과 구분된 별도 원형 버튼 */}
        <button
          onClick={outOfScope}
          aria-label="뒤로가기"
          className="shrink-0 w-[52px] h-[52px] grid place-items-center rounded-full bg-white/95 backdrop-blur border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.16)] active:scale-95 transition"
        >
          <img src="/icon_back.png" alt="뒤로가기" className="w-[22px] h-[22px] object-contain" />
        </button>
        {/* 메인 4탭 바 */}
        <div className="flex-1 flex items-center justify-around rounded-full bg-white/95 backdrop-blur border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.16)] px-1.5 py-2">
          {tabs.map(({ src, label, active }) => (
            <button
              key={label}
              onClick={outOfScope}
              className="flex flex-col items-center gap-0.5 px-2 py-0.5 active:scale-95 transition"
            >
              <img src={src} alt="" className="w-[22px] h-[22px] object-contain" />
              <span className={`text-[9px] leading-none ${active ? 'text-[#191919] font-bold' : 'text-[#8b95a1]'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
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
      <TabBar />
    </div>
  )
}

// 실제 카카오페이증권 홈 하단 탭바: 증권홈 · 관심 · 발견 · 소식 (증권홈 활성)
function TabBar() {
  const tabs = [
    { label: '증권홈', icon: IconHome, active: true },
    { label: '관심', icon: IconBookmark, active: false },
    { label: '발견', icon: IconDiscover, active: false },
    { label: '소식', icon: IconChat, active: false },
  ]
  return (
    <div className="mt-auto bg-white border-t border-gray-100">
      <div className="flex pt-1.5">
        {tabs.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] ${
              active ? 'text-[#191919] font-bold' : 'text-[#8b95a1]'
            }`}
          >
            <Icon active={active} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      {/* iOS 홈 인디케이터 */}
      <div className="flex justify-center pt-1.5 pb-2">
        <div className="w-[120px] h-[5px] rounded-full bg-[#191919]" />
      </div>
    </div>
  )
}

function IconHome({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 6.5C10.4 5.4 8.3 4.8 6 4.8c-.9 0-1.8.1-2.6.3v12.6c.8-.2 1.7-.3 2.6-.3 2.3 0 4.4.6 6 1.7 1.6-1.1 3.7-1.7 6-1.7.9 0 1.8.1 2.6.3V5.1c-.8-.2-1.7-.3-2.6-.3-2.3 0-4.4.6-6 1.7z" strokeLinejoin="round" />
      {!active && <path d="M12 6.5v12" strokeLinecap="round" />}
    </svg>
  )
}

function IconBookmark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6.5 4.5h11a1 1 0 0 1 1 1v14l-6.5-4-6.5 4v-14a1 1 0 0 1 1-1z" strokeLinejoin="round" />
    </svg>
  )
}

function IconDiscover() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8 14l2.5-2.5 2 2L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M5 5h14v10H9.5L5 18.5z" strokeLinejoin="round" />
    </svg>
  )
}
