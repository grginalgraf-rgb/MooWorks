'use client'

import { Button } from '@/components/ui/button'
import type { WorldRenderer } from '@/lib/game/canvas-renderer'
import { gameStore } from '@/lib/game/store'
import type { GameState } from '@/lib/game/types'

const STEPS: { title: string; body: string; next?: string }[] = [
  { title: 'Welcome to MooWorks', body: 'This is Daisy, your first cow. Let\u2019s turn her milk into a dairy empire.', next: 'Let\u2019s go' },
  { title: 'Milk Daisy', body: 'Click Daisy when her milk bar is full to fill your milk can.' },
  { title: 'Sell your milk', body: 'Drag the milk can onto the market stall at the bottom-left to sell it.' },
  { title: 'Grow the herd', body: 'Save up and buy a second cow in the Shop. More cows, more milk.' },
  { title: 'Keep them happy', body: 'Cows eat from the troughs. Click a trough to refill it from your silo and water tower.', next: 'Got it' },
  { title: 'Your first machine', body: 'Buy the Milking Machine in Shop › Milking so the barn collects milk for you.', next: 'Finish tutorial' },
]

export function tutorialHighlight(s: GameState): WorldRenderer['highlight'] {
  const t = s.tutorial
  if (t.skipped || t.completed) return null
  if (t.step === 1) return 'cow'
  if (t.step === 2) return 'market'
  if (t.step === 4) return 'troughs'
  return null
}

export function TutorialCard({ state: s }: { state: GameState }) {
  const t = s.tutorial
  if (t.skipped || t.completed || s.mode === 'dash' || s.mode === 'milkrun') return null
  const step = STEPS[t.step]
  if (!step) return null

  return (
    <div
      role="region"
      aria-label="Tutorial"
      aria-live="polite"
      className="absolute right-2 top-2 flex max-w-72 flex-col gap-2 rounded-md border-2 border-accent bg-card/95 p-3 shadow-lg"
    >
      <p className="font-pixel text-xs text-muted-foreground">
        Step {t.step + 1} of {STEPS.length}
      </p>
      <h2 className="font-pixel text-lg leading-tight text-accent">{step.title}</h2>
      <p className="text-sm leading-relaxed text-card-foreground">{step.body}</p>
      <div className="flex items-center gap-2">
        {step.next && (
          <Button size="sm" className="min-h-9 font-pixel" onClick={() => gameStore.dispatch({ type: 'tutorialNext' })}>
            {step.next}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="min-h-9 text-muted-foreground" onClick={() => gameStore.dispatch({ type: 'tutorialSkip' })}>
          Skip tutorial
        </Button>
      </div>
    </div>
  )
}
