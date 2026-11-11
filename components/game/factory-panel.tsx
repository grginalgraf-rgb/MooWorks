'use client'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { MACHINES, MACHINE_ORDER } from '@/lib/game/balance'
import { machineCycleSeconds, machineUnlocked, productAvailable, rawCapacity, unitPrice } from '@/lib/game/economy'
import { formatNumber } from '@/lib/game/format'
import { PRODUCT_LABELS } from '@/lib/game/orders'
import { gameStore } from '@/lib/game/store'
import type { GameState, MachineStatus, SellableKey } from '@/lib/game/types'
import { has } from '@/lib/game/upgrades'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<MachineStatus, string> = {
  running: 'bg-primary text-primary-foreground',
  idle: 'bg-muted text-muted-foreground',
  blocked: 'bg-destructive text-foreground',
  paused: 'bg-secondary text-muted-foreground',
  locked: 'bg-secondary text-muted-foreground',
}

const SELLABLES: SellableKey[] = ['raw', 'pasteurized', 'packs', 'crates', 'cream', 'skim', 'cheese', 'yogurt']

export function FactoryPanel({ state: s }: { state: GameState }) {
  const machines = MACHINE_ORDER.filter((id) => machineUnlocked(s, id))
  const cart = has(s, 'cart')

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="stock-heading" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 id="stock-heading" className="font-pixel text-base text-accent">
            Stock & selling
          </h3>
          <span className="text-xs text-muted-foreground">
            Tank {formatNumber(s.inventory.raw + s.inventory.chilled, false, 1)}/{rawCapacity(s)} L
          </span>
        </div>
        <ul className="flex flex-col divide-y divide-border rounded-md border-2 border-border">
          {SELLABLES.filter((k) => k === 'raw' || productAvailable(s, k) > 0.01 || machines.some((m) => MACHINES[m].outputs.some((o) => o.key === k))).map((k) => {
            const have = k === 'raw' ? s.inventory.raw + s.inventory.chilled : s.inventory[k]
            const fresh = k === 'raw' ? (s.inventory.chilled > 0 ? s.freshness.chilled : s.freshness.raw) : 100
            return (
              <li key={k} className="flex items-center gap-2 px-3 py-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm text-foreground">{PRODUCT_LABELS[k].name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(have, false, PRODUCT_LABELS[k].unit === 'L' ? 1 : 0)} {PRODUCT_LABELS[k].unit} · {unitPrice(s, k, fresh).toFixed(2)}c each
                    {k === 'raw' && have > 0 ? ` · ${Math.round(fresh)}% fresh` : ''}
                  </span>
                </div>
                <Button size="sm" variant="secondary" className="min-h-9" disabled={have < 0.01} onClick={() => gameStore.dispatch({ type: 'sellProduct', key: k, amount: 'one' })}>
                  Sell
                </Button>
                {cart && (
                  <Button size="sm" variant="outline" className="min-h-9" disabled={have < 0.01} onClick={() => gameStore.dispatch({ type: 'sellProduct', key: k, amount: 'all' })}>
                    All
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        {has(s, 'auto-collector') && (
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span className="flex flex-col">
              <span className="text-foreground">Auto-sell raw milk</span>
              <span className="text-xs text-muted-foreground">Turn off to feed your machines instead.</span>
            </span>
            <Switch checked={s.autoSellRaw} onCheckedChange={() => gameStore.dispatch({ type: 'toggleAutoSell' })} />
          </label>
        )}
      </section>

      <section aria-labelledby="machines-heading" className="flex flex-col gap-2">
        <h3 id="machines-heading" className="font-pixel text-base text-accent">
          Machines
        </h3>
        {machines.length === 0 && (
          <p className="text-sm leading-relaxed text-muted-foreground">Buy a Cooling Tank in the Processing shop to start your factory line.</p>
        )}
        <ul className="flex flex-col gap-2">
          {machines.map((id) => {
            const def = MACHINES[id]
            const m = s.machines[id]
            const cycle = def.kind === 'batch' ? machineCycleSeconds(s, id) : 0
            return (
              <li key={id} className="flex flex-col gap-2 rounded-md border-2 border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-base text-foreground">{def.name}</span>
                  <span className={cn('rounded-sm px-1.5 py-0.5 font-pixel text-xs uppercase', STATUS_STYLE[m.status])}>{m.status}</span>
                  <Switch
                    className="ml-auto"
                    aria-label={`${m.enabled ? 'Pause' : 'Resume'} ${def.name}`}
                    checked={m.enabled}
                    onCheckedChange={() => gameStore.dispatch({ type: 'toggleMachine', id })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {def.recipe}
                  {cycle ? ` · ${cycle.toFixed(1)}s cycle` : ''}
                </p>
                {def.kind === 'batch' && (
                  <div className="h-2 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-label={`${def.name} progress`} aria-valuenow={Math.round(m.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${m.progress * 100}%` }} />
                  </div>
                )}
                {m.status === 'blocked' && m.blockedReason && <p className="text-xs text-destructive">{m.blockedReason}</p>}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
