'use client'

import { useEffect } from 'react'
import { gameStore, useGameState, useStoreMeta } from '@/lib/game/store'
import { GameShell } from './game-shell'
import { ModeSelect } from './mode-select'

export function GameRoot() {
  const state = useGameState()
  const meta = useStoreMeta()

  useEffect(() => {
    gameStore.hydrate()
  }, [])

  if (!meta.hydrated) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background">
        <p className="font-pixel text-2xl text-muted-foreground">Loading the farm…</p>
      </main>
    )
  }

  if (!state) return <ModeSelect meta={meta} />
  return <GameShell state={state} meta={meta} />
}
