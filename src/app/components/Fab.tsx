'use client'

export function Fab({ onClick, pulse }: { onClick: () => void; pulse?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="Frame 열기"
      className={`absolute right-4 bottom-[84px] z-30 flex items-center gap-1.5 h-12 pl-3.5 pr-4 rounded-full bg-[#FFEC47] text-[#191919] font-bold text-sm shadow-[0_6px_16px_rgba(0,0,0,0.18)] hover:scale-105 active:scale-95 transition ${
        pulse ? 'animate-pulse ring-4 ring-yellow-300' : ''
      }`}
    >
      <Sparkle />
      Frame
    </button>
  )
}

function Sparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c.4 3.9 2.1 5.6 6 6-3.9.4-5.6 2.1-6 6-.4-3.9-2.1-5.6-6-6 3.9-.4 5.6-2.1 6-6z" />
      <path d="M18.5 13.5c.2 1.9 1 2.7 2.9 2.9-1.9.2-2.7 1-2.9 2.9-.2-1.9-1-2.7-2.9-2.9 1.9-.2 2.7-1 2.9-2.9z" />
    </svg>
  )
}
