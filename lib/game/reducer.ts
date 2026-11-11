import { checkAchievements } from './achievements'
import { BALANCE, BREEDS } from './balance'
import {
  barnCapacity,
  canCapacity,
  cowPrice,
  feedCapacity,
  handCooldown,
  mode,
  purchaseBlocker,
  rawCapacity,
  truckInterval,
  unitPrice,
  upgradePrice,
  waterCapacity,
} from './economy'
import { makeCow } from './initial-state'
import { canFulfil, dashOrder } from './orders'
import { dispatchTruck, draft, earn, emit, mixFreshness, truckCargoAvailable } from './production'
import { advanceTutorial, tickGame } from './simulation'
import type { BreedId, GameState, MachineId, MarketOrder, SellableKey } from './types'
import { UPGRADE_MAP, has } from './upgrades'

export type GameAction =
  | { type: 'tick'; dt: number }
  | { type: 'collectCow'; cowId: string }
  | { type: 'collectBest' }
  | { type: 'collectStation' }
  | { type: 'fillTrough'; resource: 'feed' | 'water' }
  | { type: 'sellCan' }
  | { type: 'pourCanToTank' }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'buyCow'; breed: BreedId }
  | { type: 'toggleMachine'; id: MachineId }
  | { type: 'toggleAutoSell' }
  | { type: 'sellProduct'; key: SellableKey; amount: 'one' | 'all' }
  | { type: 'dispatchTruck' }
  | { type: 'acceptOrder'; id: string }
  | { type: 'declineOrder'; id: string }
  | { type: 'deliverOrder'; id: string }
  | { type: 'tutorialNext' }
  | { type: 'tutorialSkip' }
  | { type: 'legacyChoice'; choice: 'retire' | 'continue' }

/** Actions that should trigger an immediate save. */
export const SAVE_ACTIONS = new Set<GameAction['type']>([
  'sellCan',
  'pourCanToTank',
  'buyUpgrade',
  'buyCow',
  'sellProduct',
  'dispatchTruck',
  'deliverOrder',
  'legacyChoice',
])

function collectFromCow(s: GameState, cowId: string): GameState {
  if (s.handCooldown > 0) return s
  const cow = s.cows.find((c) => c.id === cowId)
  if (!cow) return s
  const room = canCapacity(s) - s.inventory.can
  if (!cow.isAdult) {
    return { ...s, pending: [...s.pending, { type: 'hint', text: `${cow.name} is still a calf (${Math.floor(cow.growth)}% grown).` }] }
  }
  if (room <= 0.001) {
    return { ...s, pending: [...s.pending, { type: 'hint', text: 'The can is full. Drag it to the market.' }] }
  }
  if (cow.milkReadyLitres < 0.05) {
    return { ...s, pending: [...s.pending, { type: 'hint', text: `${cow.name} has no milk ready yet.` }] }
  }
  const d = draft(s)
  const dc = d.cows.find((c) => c.id === cowId)!
  const take = Math.min(room, dc.milkReadyLitres)
  dc.milkReadyLitres -= take
  d.inventory.can += take
  d.handCooldown = handCooldown(d)
  d.flags.collected = true
  emit(d, { type: 'collect', cowId, litres: take }, { type: 'sound', name: 'collect' })
  return d
}

function sellRaw(d: GameState, litres: number, freshness: number) {
  const value = litres * unitPrice(d, 'raw', freshness)
  earn(d, value)
  d.lifetime.milkSoldLitres += litres
  return value
}

function consumeRaw(d: GameState, litres: number) {
  let need = litres
  for (const key of ['can', 'raw', 'chilled'] as const) {
    const take = Math.min(need, d.inventory[key])
    d.inventory[key] -= take
    need -= take
  }
}

function currentOrders(s: GameState): MarketOrder[] {
  if (s.mode === 'dash') {
    const o = dashOrder(s)
    return o ? [o] : []
  }
  return s.orders
}

function reduce(s: GameState, action: GameAction): GameState {
  if (s.ended && action.type !== 'tick') return s

  switch (action.type) {
    case 'tick':
      return tickGame(s, action.dt)

    case 'collectCow':
      return collectFromCow(s, action.cowId)

    case 'collectBest': {
      const best = [...s.cows].filter((c) => c.isAdult).sort((a, b) => b.milkReadyLitres - a.milkReadyLitres)[0]
      if (!best) return s
      return collectFromCow(s, best.id)
    }

    case 'collectStation': {
      const room = canCapacity(s) - s.inventory.can
      if (s.inventory.barnBuffer < 0.05 || room <= 0.001) {
        const text = room <= 0.001 ? 'The can is full.' : 'The milk station is empty.'
        return { ...s, pending: [...s.pending, { type: 'hint', text }] }
      }
      const d = draft(s)
      const take = Math.min(room, d.inventory.barnBuffer)
      d.inventory.barnBuffer -= take
      d.inventory.can += take
      d.flags.collected = true
      emit(d, { type: 'collect', litres: take }, { type: 'sound', name: 'collect' })
      return d
    }

    case 'fillTrough': {
      const d = draft(s)
      const r = d.resources
      const isFeed = action.resource === 'feed'
      const stock = isFeed ? r.feedStock : r.waterStock
      const trough = isFeed ? r.feedTrough : r.waterTrough
      const move = Math.min(stock, BALANCE.troughs.capacity - trough)
      if (move <= 0.01) {
        const text = stock <= 0 ? `No ${action.resource} in storage. Buy a refill in Care.` : 'The trough is already full.'
        return { ...s, pending: [...s.pending, { type: 'hint', text }] }
      }
      if (isFeed) {
        r.feedStock -= move
        r.feedTrough += move
      } else {
        r.waterStock -= move
        r.waterTrough += move
      }
      emit(d, { type: 'sound', name: 'collect' })
      return d
    }

    case 'sellCan': {
      if (s.inventory.can < 0.01) return { ...s, pending: [...s.pending, { type: 'hint', text: 'The can is empty. Click a cow to collect milk.' }] }
      const d = draft(s)
      const litres = d.inventory.can
      d.inventory.can = 0
      const value = sellRaw(d, litres, 100)
      emit(d, { type: 'pour', target: 'market' }, { type: 'coins', amount: Math.floor(value), at: 'market' }, { type: 'sound', name: 'sell' })
      return d
    }

    case 'pourCanToTank': {
      const room = rawCapacity(s) - s.inventory.raw
      if (!has(s, 'pipeline') || s.inventory.can < 0.01 || room <= 0.01) {
        const text = !has(s, 'pipeline') ? 'Build the Milk Pipeline first.' : room <= 0.01 ? 'The raw tank is full.' : 'The can is empty.'
        return { ...s, pending: [...s.pending, { type: 'hint', text }] }
      }
      const d = draft(s)
      const move = Math.min(room, d.inventory.can)
      d.freshness.raw = mixFreshness(d.inventory.raw, d.freshness.raw, move, 100)
      d.inventory.can -= move
      d.inventory.raw += move
      emit(d, { type: 'pour', target: 'tank' }, { type: 'sound', name: 'collect' })
      return d
    }

    case 'buyUpgrade': {
      const def = UPGRADE_MAP[action.id]
      if (!def || def.kind === 'cow') return s
      const price = upgradePrice(s, def)
      if (purchaseBlocker(s, def, price)) return { ...s, pending: [...s.pending, { type: 'sound', name: 'error' }] }
      const d = draft(s)
      d.coins -= price
      if (def.consumable) {
        const { resource, amount } = def.consumable
        if (resource === 'feedStock') d.resources.feedStock = Math.min(feedCapacity(d), d.resources.feedStock + amount)
        else if (resource === 'waterStock') d.resources.waterStock = Math.min(waterCapacity(d), d.resources.waterStock + amount)
        else d.inventory.fruit += amount
        emit(d, { type: 'sound', name: 'buy' })
        return d
      }
      const prevLevel = d.upgrades[def.id] ?? 0
      d.upgrades = { ...d.upgrades, [def.id]: prevLevel + 1 }
      if (prevLevel === 0 && def.id === 'truck') d.truckTimer = 0
      if (prevLevel === 0 && def.id === 'milking-machine' && d.tutorial.step === 5) d.tutorial.completed = true
      emit(
        d,
        { type: 'unlock', upgradeId: def.id },
        { type: 'sound', name: 'buy' },
        { type: 'toast', title: prevLevel === 0 ? `${def.name} built` : `${def.name} Lv ${prevLevel + 1}`, tone: 'good' },
      )
      return d
    }

    case 'buyCow': {
      const def = UPGRADE_MAP['buy-cow']
      const breed = BREEDS[action.breed]
      if (breed.unlockUpgrade && !has(s, breed.unlockUpgrade)) return s
      const price = cowPrice(s, action.breed)
      if (purchaseBlocker(s, def, price) || s.cows.length >= barnCapacity(s)) {
        return { ...s, pending: [...s.pending, { type: 'sound', name: 'error' }] }
      }
      const d = draft(s)
      d.coins -= price
      const calf = mode(d).buyAsCalf
      const cow = makeCow(d.nextCowNumber, action.breed, calf ? { isAdult: false, growth: 0 } : {})
      d.nextCowNumber += 1
      d.cows.push(cow)
      emit(
        d,
        { type: 'cowAdded', cowId: cow.id },
        { type: 'sound', name: 'buy' },
        { type: 'toast', title: `${cow.name} joined the herd`, body: calf ? `${breed.name} calf. Keep her fed to grow.` : breed.name, tone: 'good' },
      )
      return d
    }

    case 'toggleMachine': {
      const d = draft(s)
      d.machines[action.id].enabled = !d.machines[action.id].enabled
      return d
    }

    case 'toggleAutoSell':
      return { ...s, autoSellRaw: !s.autoSellRaw }

    case 'sellProduct': {
      const key = action.key
      const d = draft(s)
      const all = action.amount === 'all' && has(d, 'cart')
      let units: number
      let freshness = 100
      if (key === 'raw') {
        const source = d.inventory.chilled > 0 ? 'chilled' : 'raw'
        freshness = d.freshness[source]
        units = all ? d.inventory[source] : Math.min(10, d.inventory[source])
        if (units < 0.01) return s
        d.inventory[source] -= units
        const value = sellRaw(d, units, freshness)
        emit(d, { type: 'coins', amount: Math.floor(value), at: 'market' }, { type: 'sound', name: 'sell' })
        return d
      }
      const liquid = key === 'pasteurized' || key === 'cream' || key === 'skim'
      const have = d.inventory[key]
      units = all ? (liquid ? have : Math.floor(have)) : liquid ? Math.min(have, key === 'pasteurized' ? 10 : 2) : Math.min(1, Math.floor(have))
      if (units < 0.01) return s
      const value = units * unitPrice(d, key, freshness)
      d.inventory[key] -= units
      earn(d, value)
      if (liquid) d.lifetime.milkSoldLitres += key === 'pasteurized' ? units : 0
      d.lifetime.productsSold += liquid ? 0 : units
      if (key === 'cream') d.flags.soldCream = true
      if (key === 'cheese') d.flags.soldCheese = true
      if (key === 'yogurt') d.flags.soldYogurt = true
      emit(d, { type: 'coins', amount: Math.floor(value), at: 'market' }, { type: 'sound', name: 'sell' })
      return d
    }

    case 'dispatchTruck': {
      if (!has(s, 'truck') || s.truckTimer < truckInterval(s) || truckCargoAvailable(s) <= 0) return s
      const d = draft(s)
      dispatchTruck(d, false)
      return d
    }

    case 'acceptOrder':
      return { ...s, orders: s.orders.map((o) => (o.id === action.id ? { ...o, status: 'accepted' } : o)) }

    case 'declineOrder':
      return { ...s, orders: s.orders.filter((o) => o.id !== action.id) }

    case 'deliverOrder': {
      const order = currentOrders(s).find((o) => o.id === action.id)
      if (!order || order.status !== 'accepted' || !canFulfil(s, order)) return s
      const d = draft(s)
      if (order.product === 'raw') consumeRaw(d, order.amount)
      else d.inventory[order.product] = Math.max(0, d.inventory[order.product] - order.amount)
      earn(d, order.reward)
      d.lifetime.ordersCompleted += 1
      if (order.product === 'raw' || order.product === 'pasteurized') d.lifetime.milkSoldLitres += order.amount
      else d.lifetime.productsSold += order.amount
      if (order.product === 'cream') d.flags.soldCream = true
      if (order.product === 'cheese') d.flags.soldCheese = true
      if (order.product === 'yogurt') d.flags.soldYogurt = true
      if (d.mode === 'dash') {
        d.dashIndex += 1
        const total = mode(d).fixedOrders?.length ?? 0
        if (d.dashIndex >= total) d.ended = { outcome: 'won', seconds: d.modeClock }
      } else {
        d.orders = d.orders.filter((o) => o.id !== order.id)
      }
      emit(
        d,
        { type: 'coins', amount: order.reward, at: 'order' },
        { type: 'sound', name: 'order' },
        { type: 'toast', title: `${order.customer} paid ${order.reward} coins`, tone: 'good' },
      )
      return d
    }

    case 'tutorialNext': {
      const d = draft(s)
      if (d.tutorial.step === 0) d.tutorial.step = 1
      else if (d.tutorial.step === 4) d.tutorial.step = 5
      else if (d.tutorial.step === 5) d.tutorial.completed = true
      return d
    }

    case 'tutorialSkip':
      return { ...s, tutorial: { ...s.tutorial, skipped: true } }

    case 'legacyChoice': {
      const d = draft(s)
      d.flags.legacyPending = false
      if (action.choice === 'retire') d.legacy.retiredRuns += 1
      return d
    }
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const next = reduce(state, action)
  if (next === state || action.type === 'tick') return next
  const d = draft(next)
  advanceTutorial(d)
  return checkAchievements(d)
}
