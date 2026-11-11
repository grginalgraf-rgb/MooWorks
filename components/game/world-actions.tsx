'use client'

import { Button } from '@/components/ui/button'
import { canCapacity, qualityGrade, truckInterval, unitPrice } from '@/lib/game/economy'
import { truckCargoAvailable } from '@/lib/game/production'
import { gameStore } from '@/lib/game/store'
import type { GameState } from '@/lib/game/types'
import { has } from '@/lib/game/upgrades'

export function WorldActions({ state: s }: { state: GameState }) {
  const dispatch = gameStore.dispatch
  const anyReady = s.cows.some((c) => c.isAdult && c.milkReadyLitres >= 0.1)
  const canValue = s.inventory.can * unitPrice(s, 'raw', 100)
  const full = s.inventory.can >= canCapacity(s) - 0.01
  const truckReady = has(s, 'truck') && truckCargoAvailable(s) > 0

  return (
    <div role="toolbar" aria-label="Farm actions" className="flex flex-wrap items-center gap-2 rounded-md border-2 border-border bg-card p-2">
      <Button className="min-h-11 font-pixel" onClick={() => dispatch({ type: 'collectBest' })} disabled={!anyReady || full}>
        Milk fullest cow
      </Button>
      {has(s, 'milking-machine') && (
        <Button variant="secondary" className="min-h-11 font-pixel" onClick={() => dispatch({ type: 'collectStation' })} disabled={s.inventory.barnBuffer < 0.05}>
          Empty station ({s.inventory.barnBuffer.toFixed(1)} L)
        </Button>
      )}
      <Button
        variant="secondary"
        className="min-h-11 font-pixel"
        onClick={() => dispatch({ type: 'sellCan' })}
        disabled={s.inventory.can < 0.05}
      >
        Sell can · {Math.floor(canValue)}c
      </Button>
      {has(s, 'pipeline') && (
        <Button variant="secondary" className="min-h-11 font-pixel" onClick={() => dispatch({ type: 'pourCanToTank' })} disabled={s.inventory.can < 0.05}>
          Pour into tank
        </Button>
      )}
      <Button variant="outline" className="min-h-11" onClick={() => dispatch({ type: 'fillTrough', resource: 'feed' })}>
        Fill feed trough
      </Button>
      <Button variant="outline" className="min-h-11" onClick={() => dispatch({ type: 'fillTrough', resource: 'water' })}>
        Fill water trough
      </Button>
      {has(s, 'truck') && (
        <Button variant="outline" className="min-h-11" disabled={!truckReady} onClick={() => dispatch({ type: 'dispatchTruck' })}>
          Send truck now
          <span className="text-xs text-muted-foreground">auto in {Math.max(0, Math.ceil(truckInterval(s) - s.truckTimer))}s</span>
        </Button>
      )}
      <span className="ml-auto text-xs text-muted-foreground">
        Raw milk {unitPrice(s, 'raw', 100).toFixed(2)}c/L · {qualityGrade(s).label} grade
      </span>
    </div>
  )
}
