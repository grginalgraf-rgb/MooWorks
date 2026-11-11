'use client'

import { ACHIEVEMENTS } from '@/lib/game/achievements'
import { BREEDS } from '@/lib/game/balance'
import { cowRate, feedCapacity, qualityGrade, waterCapacity } from '@/lib/game/economy'
import { formatDuration, formatNumber } from '@/lib/game/format'
import { useSettings } from '@/lib/game/settings'
import type { GameState } from '@/lib/game/types'
import { cn } from '@/lib/utils'

export function FarmPanel({ state: s }: { state: GameState }) {
  const { compactNumbers: c } = useSettings()
  const grade = qualityGrade(s)
  const feedCap = feedCapacity(s)
  const waterCap = waterCapacity(s)

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="supplies-heading" className="flex flex-col gap-2">
        <h3 id="supplies-heading" className="font-pixel text-base text-accent">
          Supplies
        </h3>
        <Meter label="Feed silo" value={s.resources.feedStock} max={feedCap} />
        <Meter label="Water tower" value={s.resources.waterStock} max={waterCap} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Milk grade: <span className="text-foreground">{grade.label}</span> (x{grade.multiplier.toFixed(2)}) — {grade.reason}
        </p>
      </section>

      <section aria-labelledby="herd-heading" className="flex flex-col gap-2">
        <h3 id="herd-heading" className="font-pixel text-base text-accent">
          Herd
        </h3>
        <ul className="flex flex-col divide-y divide-border rounded-md border-2 border-border">
          {s.cows.map((cow) => (
            <li key={cow.id} className="flex items-center gap-3 px-3 py-2">
              <span aria-hidden className="size-4 shrink-0 rounded-sm border border-border" style={{ background: BREEDS[cow.breed].coat.base }} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm text-foreground">
                  {cow.name} <span className="text-xs text-muted-foreground">{BREEDS[cow.breed].name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {cow.isAdult
                    ? `${cow.milkReadyLitres.toFixed(1)} L ready · ${(cowRate(s, cow) * 60).toFixed(1)} L/min`
                    : `Calf · ${Math.round(cow.growth * 100)}% grown`}
                </span>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground" title="Happiness / Health">
                {Math.round(cow.happiness)}♥ {Math.round(cow.health)}+
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stats-heading" className="flex flex-col gap-2">
        <h3 id="stats-heading" className="font-pixel text-base text-accent">
          Lifetime
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <Row k="Revenue" v={`${formatNumber(s.lifetime.revenue, c)}c`} />
          <Row k="Milk produced" v={`${formatNumber(s.lifetime.milkProducedLitres, c)} L`} />
          <Row k="Milk sold" v={`${formatNumber(s.lifetime.milkSoldLitres, c)} L`} />
          <Row k="Products sold" v={formatNumber(s.lifetime.productsSold, c)} />
          <Row k="Orders" v={formatNumber(s.lifetime.ordersCompleted, c)} />
          <Row k="Truck runs" v={formatNumber(s.lifetime.truckDeliveries, c)} />
          <Row k="Play time" v={formatDuration(s.lifetime.playTimeSeconds)} />
        </dl>
      </section>

      <section aria-labelledby="ach-heading" className="flex flex-col gap-2">
        <h3 id="ach-heading" className="font-pixel text-base text-accent">
          Achievements {s.achievements.length}/{ACHIEVEMENTS.length}
        </h3>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const got = s.achievements.includes(a.id)
            return (
              <li key={a.id} className={cn('rounded-sm border px-2 py-1.5', got ? 'border-accent' : 'border-border opacity-60')}>
                <p className={cn('font-pixel text-sm', got ? 'text-accent' : 'text-foreground')}>
                  {a.name}
                  <span className="sr-only">{got ? ' (unlocked)' : ' (locked)'}</span>
                </p>
                <p className="text-xs leading-snug text-muted-foreground">{a.description}</p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const frac = Math.max(0, Math.min(1, value / max))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(value)}/{max}
        </span>
      </div>
      <div role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} className="h-2 overflow-hidden rounded-sm bg-muted">
        <div className={cn('h-full', frac < 0.15 ? 'bg-destructive' : 'bg-primary')} style={{ width: `${frac * 100}%` }} />
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right tabular-nums text-foreground">{v}</dd>
    </>
  )
}
