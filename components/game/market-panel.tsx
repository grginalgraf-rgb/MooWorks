'use client'

import { Button } from '@/components/ui/button'
import { mode, orderSlots, productAvailable } from '@/lib/game/economy'
import { formatNumber } from '@/lib/game/format'
import { PRODUCT_LABELS, canFulfil, dashOrder } from '@/lib/game/orders'
import { gameStore } from '@/lib/game/store'
import type { GameState, MarketOrder } from '@/lib/game/types'

export function MarketPanel({ state: s }: { state: GameState }) {
  const m = mode(s)
  const dash = !!m.fixedOrders
  const orders: MarketOrder[] = dash ? [dashOrder(s)].filter((o): o is MarketOrder => !!o) : s.orders

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-pixel text-base text-accent">{dash ? 'Delivery route' : 'Order board'}</h3>
        <span className="text-xs text-muted-foreground">
          {dash ? `Stop ${Math.min(s.dashIndex + 1, m.fixedOrders!.length)} of ${m.fixedOrders!.length}` : `${s.orders.length}/${orderSlots(s)} orders`}
        </span>
      </div>
      {orders.length === 0 && <p className="text-sm leading-relaxed text-muted-foreground">No orders right now. Customers post new requests every so often.</p>}
      <ul className="flex flex-col gap-2">
        {orders.map((o) => {
          const have = productAvailable(s, o.product)
          const ready = canFulfil(s, o)
          const label = PRODUCT_LABELS[o.product]
          return (
            <li key={o.id} className="flex flex-col gap-2 rounded-md border-2 border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-pixel text-base text-foreground">{o.customer}</span>
                <span className="font-pixel text-base text-accent">{formatNumber(o.reward, false)}c</span>
              </div>
              <p className="text-sm text-card-foreground">
                Wants {o.amount} {label.plural}
              </p>
              <div className="h-1.5 overflow-hidden rounded-sm bg-muted" aria-hidden>
                <div className="h-full bg-primary" style={{ width: `${Math.min(1, have / o.amount) * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                You have {formatNumber(Math.min(have, o.amount), false, label.unit === 'L' ? 1 : 0)}/{o.amount}
              </p>
              <div className="flex gap-2">
                {o.status === 'available' ? (
                  <>
                    <Button size="sm" className="min-h-9" onClick={() => gameStore.dispatch({ type: 'acceptOrder', id: o.id })}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="min-h-9" onClick={() => gameStore.dispatch({ type: 'declineOrder', id: o.id })}>
                      Decline
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="min-h-9 font-pixel" disabled={!ready} onClick={() => gameStore.dispatch({ type: 'deliverOrder', id: o.id })}>
                    {ready ? 'Deliver' : 'Gathering…'}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
