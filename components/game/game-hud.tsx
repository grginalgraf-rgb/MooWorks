'use client'

import { Coins, Droplets, Home, Milk, Wheat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { averageHappiness, barnCapacity, canCapacity, farmLevel, feedCapacity, herdLitresPerMinute, mode, qualityGrade, waterCapacity } from '@/lib/game/economy'
import { formatDuration, formatLitres, formatNumber } from '@/lib/game/format'
import { useSettings } from '@/lib/game/settings'
import { gameStore } from '@/lib/game/store'
import type { GameState } from '@/lib/game/types'
import { SettingsDialog } from './settings-dialog'

export function GameHud({ state: s }: { state: GameState }) {
  const { compactNumbers: c } = useSettings()
  const lvl = farmLevel(s)
  const m = mode(s)
  const grade = qualityGrade(s)
  const timeLeft = m.timeLimitSeconds ? m.timeLimitSeconds - s.modeClock : null

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-border bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="font-pixel text-xl font-bold leading-none text-foreground">
          Moo<span className="text-primary">Works</span>
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-pixel text-xs leading-none text-accent">
            Lv {lvl.level} · {lvl.name}
          </span>
          <div
            role="progressbar"
            aria-label="Farm level progress"
            aria-valuenow={Math.round(lvl.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-28 overflow-hidden rounded-sm bg-muted"
          >
            <div className="h-full bg-accent" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
        </div>
      </div>

      <dl className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Stat icon={<Coins className="size-4 text-accent" aria-hidden />} label="Coins" value={formatNumber(Math.floor(s.coins), c)} strong />
        <Stat
          icon={<Milk className="size-4 text-foreground" aria-hidden />}
          label="Milk can"
          value={`${formatNumber(s.inventory.can, false, 1)}/${canCapacity(s)} L`}
        />
        <Stat label="Herd" value={`${s.cows.length}/${barnCapacity(s)} cows`} />
        <Stat label="Output" value={`${formatLitres(herdLitresPerMinute(s), c)}/min`} />
        <Stat
          icon={<Wheat className="size-4 text-accent" aria-hidden />}
          label="Feed"
          value={`${Math.round((s.resources.feedStock / feedCapacity(s)) * 100)}%`}
          warn={s.resources.feedStock / feedCapacity(s) < 0.15}
        />
        <Stat
          icon={<Droplets className="size-4 text-foreground" aria-hidden />}
          label="Water"
          value={`${Math.round((s.resources.waterStock / waterCapacity(s)) * 100)}%`}
          warn={s.resources.waterStock / waterCapacity(s) < 0.15}
        />
        <Stat label="Mood" value={`${Math.round(averageHappiness(s))}`} />
        <Stat label="Grade" value={grade.label} />
        {timeLeft !== null && <Stat label="Time left" value={formatDuration(timeLeft)} warn={timeLeft < 60} strong />}
        {m.targetRevenue && <Stat label="Goal" value={`${formatNumber(s.lifetime.revenue, c)}/${formatNumber(m.targetRevenue, c)}`} />}
      </dl>

      <div className="flex items-center gap-1">
        <span className="hidden text-xs text-muted-foreground md:inline">{m.name}</span>
        <SettingsDialog inGame />
        <Button variant="ghost" size="icon" aria-label="Save and return to title" onClick={() => gameStore.quitToTitle()}>
          <Home className="size-4" aria-hidden />
        </Button>
      </div>
    </header>
  )
}

function Stat({ icon, label, value, strong, warn }: { icon?: React.ReactNode; label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-pixel tabular-nums ${strong ? 'text-base text-accent' : 'text-foreground'} ${warn ? 'text-destructive' : ''}`}>{value}</dd>
    </div>
  )
}
