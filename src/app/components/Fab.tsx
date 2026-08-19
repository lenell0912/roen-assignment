'use client'

export function Fab({ onClick, pulse }: { onClick: () => void; pulse?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="코파일럿 열기"
      className={`absolute right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-[#fae100] shadow-lg text-2xl grid place-items-center hover:scale-105 transition ${
        pulse ? 'animate-pulse ring-4 ring-yellow-300' : ''
      }`}
    >
      🧭
    </button>
  )
}
