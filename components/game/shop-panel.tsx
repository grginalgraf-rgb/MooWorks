'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BREEDS } from '@/lib/game/balance'
import { barnCapacity, cowPrice, mode, purchaseBlocker, unlockedBreeds, upgradePrice } from '@/lib/game/economy'
import { formatNumber } from '@/lib/game/format'
import { useSettings } from '@/lib/game/settings'
import { gameStore } from '@/lib/game/store'
import type { GameState, UpgradeCategory } from '@/lib/game/types'
import { CATEGORIES, UPGRADES, UPGRADE_MAP, type UpgradeDef, level, prereqMet } from '@/lib/game/upgrades'
import { cn } from '@/lib/utils'

export function ShopPanel({ state: s }: { state: GameState }) {
  const [cat, setCat] = useState<UpgradeCategory>('herd')
  const defs = UPGRADES.filter((u) => u.category === cat && u.kind !== 'cow')
  const owned = defs.filter((u) => u.kind === 'level' && level(s, u.id) >= u.maxLevel)
  const visible = defs.filter((u) => !owned.includes(u))
  const available = visible.filter((u) => u.prereqs.every((p) => prereqMet(s, p)))
  const locked = visible.filter((u) => !available.includes(u))

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Upgrade category" className="flex flex-wrap gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              'min-h-9 rounded-sm border px-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              cat === c.id ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {cat === 'herd' && <BreedShop state={s} />}

      <ul className="flex flex-col gap-2">
        {available.map((u) => (
          <li key={u.id}>
            <UpgradeCard state={s} def={u} />
          </li>
        ))}
        {locked.slice(0, 4).map((u) => (
          <li key={u.id}>
            <UpgradeCard state={s} def={u} />
          </li>
        ))}
      </ul>
      {locked.length > 4 && <p className="text-xs text-muted-foreground">{locked.length - 4} more upgrades unlock as your farm grows.</p>}
      {owned.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Owned: <span className="text-foreground">{owned.map((u) => u.name).join(', ')}</span>
        </p>
      )}
    </div>
  )
}

function BreedShop({ state: s }: { state: GameState }) {
  const { compactNumbers } = useSettings()
  const def = UPGRADE_MAP['buy-cow']
  const calf = mode(s).buyAsCalf
  const full = s.cows.length >= barnCapacity(s)
  return (
    <div className="flex flex-col gap-2 rounded-md border-2 border-primary/60 bg-secondary p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-pixel text-base text-foreground">{calf ? 'Buy a calf' : 'Buy a cow'}</h3>
        <span className="text-xs text-muted-foreground">
          Barn {s.cows.length}/{barnCapacity(s)}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {unlockedBreeds(s).map((b) => {
          const price = cowPrice(s, b)
          const blocker = purchaseBlocker(s, def, price)
          return (
            <li key={b} className="flex items-center gap-3">
              <span aria-hidden className="size-5 shrink-0 rounded-sm border border-border" style={{ background: BREEDS[b].coat.base }} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm text-foreground">{BREEDS[b].name}</span>
                <span className="truncate text-xs text-muted-foreground">{BREEDS[b].blurb}</span>
              </div>
              <Button
                size="sm"
                className="min-h-9 min-w-24 font-pixel"
                disabled={!!blocker}
                title={blocker ?? undefined}
                onClick={() => gameStore.dispatch({ type: 'buyCow', breed: b })}
              >
                {full ? 'Barn full' : `${formatNumber(price, compactNumbers)}c`}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function UpgradeCard({ state: s, def }: { state: GameState; def: UpgradeDef }) {
  const { compactNumbers } = useSettings()
  const lv = level(s, def.id)
  const price = upgradePrice(s, def)
  const blocker = purchaseBlocker(s, def, price)
  const locked = !def.prereqs.every((p) => prereqMet(s, p))
  const affordable = !blocker

  return (
    <article className={cn('flex flex-col gap-2 rounded-md border-2 p-3', locked ? 'border-border/60 opacity-60' : affordable ? 'border-primary' : 'border-border')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="font-pixel text-base leading-tight text-foreground">{def.name}</h3>
          {def.kind === 'level' && def.maxLevel > 1 && (
            <span className="text-xs text-muted-foreground">
              Level {lv}/{def.maxLevel}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={affordable ? 'default' : 'secondary'}
          className="min-h-9 min-w-24 shrink-0 font-pixel"
          disabled={!affordable}
          onClick={() => gameStore.dispatch({ type: 'buyUpgrade', id: def.id })}
        >
          {formatNumber(price, compactNumbers)}c
        </Button>
      </div>
      <p className="text-sm leading-relaxed text-card-foreground">{def.description}</p>
      <p className="text-xs text-accent">{def.next(lv)}</p>
      {blocker && <p className="text-xs text-muted-foreground">{blocker}</p>}
    </article>
  )
}
