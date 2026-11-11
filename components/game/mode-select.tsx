'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/game/format'
import { MODES, MODE_LIST } from '@/lib/game/modes'
import { type StoreMeta, gameStore } from '@/lib/game/store'
import type { GameMode } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { SettingsDialog } from './settings-dialog'

export function ModeSelect({ meta }: { meta: StoreMeta }) {
  const [selected, setSelected] = useState<GameMode>('country')
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const def = MODES[selected]

  const start = () => {
    if (meta.hasSave && !confirmOverwrite) {
      setConfirmOverwrite(true)
      return
    }
    gameStore.newGame(selected)
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="font-pixel text-sm uppercase tracking-[0.3em] text-accent">Dairy Farm Tycoon</p>
          <h1 className="font-pixel text-6xl font-bold leading-none text-foreground md:text-8xl">
            Moo<span className="text-primary">Works</span>
          </h1>
          <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
            Start with one cow named Daisy and a tin milk can. End with pipes, pasteurizers, cheese vats and a truck that
            never stops.
          </p>
        </header>

        {meta.hasSave && meta.savedMode && (
          <div className="flex flex-col items-center gap-3 rounded-md border-2 border-primary bg-card p-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="font-pixel text-lg text-foreground">Continue your farm</p>
              <p className="text-sm text-muted-foreground">{MODES[meta.savedMode].name} — saved on this device</p>
            </div>
            <Button size="lg" className="min-h-11 font-pixel text-base" onClick={() => gameStore.continueGame()}>
              Continue
            </Button>
          </div>
        )}

        <section aria-labelledby="mode-heading" className="flex flex-col gap-3">
          <h2 id="mode-heading" className="font-pixel text-lg text-accent">
            Choose a mode
          </h2>
          <div role="radiogroup" aria-labelledby="mode-heading" className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {MODE_LIST.map((id) => {
              const m = MODES[id]
              const best = (meta.records.bestTimes as Partial<Record<string, number>>)[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected === id}
                  onClick={() => {
                    setSelected(id)
                    setConfirmOverwrite(false)
                  }}
                  className={cn(
                    'flex min-h-11 flex-col items-start gap-1 rounded-md border-2 bg-card p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                    selected === id ? 'border-accent' : 'border-border hover:border-muted-foreground',
                  )}
                >
                  <span className="font-pixel text-base leading-tight text-foreground">{m.name}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{m.tagline}</span>
                  {best !== undefined && <span className="text-xs text-accent">Best {formatDuration(best)}</span>}
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-4 rounded-md border-2 border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
            <ul className="flex flex-col gap-1 text-sm leading-relaxed text-card-foreground">
              {def.rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden className="text-primary">
                    ■
                  </span>
                  {r}
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {confirmOverwrite && (
                <p role="alert" className="text-sm text-destructive">
                  This replaces your saved farm. Press again to confirm.
                </p>
              )}
              <Button
                size="lg"
                variant={confirmOverwrite ? 'destructive' : 'default'}
                className="min-h-11 font-pixel text-base"
                onClick={start}
              >
                {confirmOverwrite ? 'Yes, start over' : `Start ${def.name}`}
              </Button>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {meta.records.retiredRuns > 0 ? `${meta.records.retiredRuns} farm${meta.records.retiredRuns > 1 ? 's' : ''} retired` : 'Saves locally in your browser'}
          </span>
          <SettingsDialog />
        </footer>
      </div>
    </main>
  )
}
