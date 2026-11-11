'use client'

import type { StoreMeta } from '@/lib/game/store'
import type { GameState } from '@/lib/game/types'
import { EndDialog } from './end-dialog'
import { GameCanvas } from './game-canvas'
import { GameHud } from './game-hud'
import { OfflineDialog } from './offline-dialog'
import { SidePanel } from './side-panel'
import { ToastStack } from './toast-stack'
import { TutorialCard, tutorialHighlight } from './tutorial-card'
import { WorldActions } from './world-actions'

export function GameShell({ state, meta }: { state: GameState; meta: StoreMeta }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh">
      <GameHud state={state} />
      <main className="flex flex-1 flex-col gap-2 p-2 lg:min-h-0 lg:flex-row">
        <section aria-label="Farm" className="flex flex-col gap-2 lg:min-h-0 lg:flex-1">
          <div className="relative aspect-[5/3] w-full overflow-hidden rounded-md border-2 border-border bg-secondary lg:aspect-auto lg:min-h-0 lg:flex-1">
            <GameCanvas highlight={tutorialHighlight(state)} />
            <TutorialCard state={state} />
          </div>
          <WorldActions state={state} />
        </section>
        <SidePanel state={state} />
      </main>
      <ToastStack />
      <OfflineDialog summary={meta.offlineSummary} />
      <EndDialog state={state} />
    </div>
  )
}
