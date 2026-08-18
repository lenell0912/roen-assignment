'use client'
import { useState } from 'react'
import { Doorway } from './components/Doorway'
import { AgentApp } from './components/AgentApp'

export default function Home() {
  const [entered, setEntered] = useState(false)
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-200">
      {entered ? <AgentApp onExit={() => setEntered(false)} /> : <Doorway onEnter={() => setEntered(true)} />}
    </main>
  )
}
