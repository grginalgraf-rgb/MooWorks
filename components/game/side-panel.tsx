'use client'

import { useState } from 'react'
import { machineUnlocked, mode } from '@/lib/game/economy'
import type { GameState } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { FactoryPanel } from './factory-panel'
import { FarmPanel } from './farm-panel'
import { MarketPanel } from './market-panel'
import { ShopPanel } from './shop-panel'

type Tab = 'shop' | 'factory' | 'market' | 'farm'

export function SidePanel({ state }: { state: GameState }) {
  const [tab, setTab] = useState<Tab>('shop')
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'shop', label: 'Shop', show: true },
    { id: 'factory', label: 'Factory', show: machineUnlocked(state, 'cooling') || state.inventory.raw > 0 },
    { id: 'market', label: 'Orders', show: mode(state).orderBoard || !!mode(state).fixedOrders },
    { id: 'farm', label: 'Farm', show: true },
  ]
  const visible = tabs.filter((t) => t.show)
  const active = visible.some((t) => t.id === tab) ? tab : 'shop'

  return (
    <aside className="flex flex-col overflow-hidden rounded-md border-2 border-border bg-card lg:w-[440px] lg:min-h-0 xl:w-[500px]">
      <div role="tablist" aria-label="Farm management" className="flex border-b-2 border-border">
        {visible.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              'min-h-11 flex-1 font-pixel text-base transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              active === t.id ? 'bg-secondary text-accent' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} className="flex-1 overflow-y-auto p-3 lg:min-h-0">
        {active === 'shop' && <ShopPanel state={state} />}
        {active === 'factory' && <FactoryPanel state={state} />}
        {active === 'market' && <MarketPanel state={state} />}
        {active === 'farm' && <FarmPanel state={state} />}
      </div>
    </aside>
  )
}
