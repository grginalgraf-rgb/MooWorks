'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { mode } from '@/lib/game/economy'
import { formatDuration, formatNumber } from '@/lib/game/format'
import { gameStore } from '@/lib/game/store'
import type { GameState } from '@/lib/game/types'

export function EndDialog({ state: s }: { state: GameState }) {
  const legacy = !!s.flags.legacyPending
  const ended = s.ended && s.ended.outcome !== 'retired' ? s.ended : null
  const open = legacy || !!ended

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        {legacy ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-pixel text-2xl text-accent">Dairy Legacy</DialogTitle>
              <DialogDescription className="leading-relaxed">
                {formatNumber(s.lifetime.revenue, true)} coins of lifetime revenue. From one cow to a dairy brand. You can retire this farm into the records, or keep
                expanding forever.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => gameStore.dispatch({ type: 'legacyChoice', choice: 'continue' })}>
                Keep farming
              </Button>
              <Button
                className="min-h-11 font-pixel"
                onClick={() => {
                  gameStore.dispatch({ type: 'legacyChoice', choice: 'retire' })
                  gameStore.quitToTitle()
                }}
              >
                Retire the farm
              </Button>
            </DialogFooter>
          </>
        ) : ended ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-pixel text-2xl text-accent">{ended.outcome === 'won' ? 'Route complete!' : 'Time\u2019s up'}</DialogTitle>
              <DialogDescription className="leading-relaxed">
                {mode(s).name}: {ended.outcome === 'won' ? `finished in ${formatDuration(ended.seconds)}.` : `you earned ${formatNumber(s.lifetime.revenue, true)} coins.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => gameStore.quitToTitle()}>
                Title screen
              </Button>
              <Button className="min-h-11 font-pixel" onClick={() => gameStore.newGame(s.mode)}>
                Play again
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
