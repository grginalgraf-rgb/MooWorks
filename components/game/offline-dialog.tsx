'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDuration, formatNumber } from '@/lib/game/format'
import type { OfflineSummary } from '@/lib/game/offline'
import { gameStore } from '@/lib/game/store'

export function OfflineDialog({ summary }: { summary: OfflineSummary | null }) {
  return (
    <Dialog open={!!summary} onOpenChange={(open) => !open && gameStore.dismissOfflineSummary()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-pixel text-xl">Welcome back!</DialogTitle>
          <DialogDescription>Your farm kept working for {summary ? formatDuration(summary.seconds) : ''} while you were away.</DialogDescription>
        </DialogHeader>
        {summary && (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Milk produced</dt>
            <dd className="text-right font-pixel text-foreground">{formatNumber(summary.milkProduced, true, 1)} L</dd>
            <dt className="text-muted-foreground">Coins earned</dt>
            <dd className="text-right font-pixel text-accent">{formatNumber(summary.coinsEarned, true)}c</dd>
            <dt className="text-muted-foreground">Products made</dt>
            <dd className="text-right font-pixel text-foreground">{formatNumber(summary.productsMade, true)}</dd>
          </dl>
        )}
        <DialogFooter>
          <Button className="min-h-11 font-pixel" onClick={() => gameStore.dismissOfflineSummary()}>
            Back to work
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
