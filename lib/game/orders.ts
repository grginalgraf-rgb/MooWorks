import { farmLevel, orderRewardMultiplier, productAvailable } from './economy'
import { MODES } from './modes'
import type { GameState, MarketOrder, SellableKey } from './types'
import { has } from './upgrades'

type OrderTemplate = {
  id: string
  customer: string
  product: SellableKey
  amount: number
  reward: number
  requires: string | null
}

export const ORDER_TEMPLATES: OrderTemplate[] = [
  { id: 'cafe', customer: 'Local Café', product: 'raw', amount: 12, reward: 90, requires: null },
  { id: 'farmers-market', customer: 'Farmers Market', product: 'raw', amount: 20, reward: 150, requires: null },
  { id: 'diner', customer: 'Roadside Diner', product: 'raw', amount: 40, reward: 310, requires: 'pipeline' },
  { id: 'school', customer: 'School Kitchen', product: 'pasteurized', amount: 24, reward: 210, requires: 'pasteurizer' },
  { id: 'corner-shop', customer: 'Corner Shop', product: 'packs', amount: 3, reward: 190, requires: 'bottler' },
  { id: 'grocery', customer: 'Grocery Store', product: 'crates', amount: 4, reward: 520, requires: 'crater' },
  { id: 'bakery', customer: 'Bakery', product: 'cream', amount: 2, reward: 70, requires: 'separator' },
  { id: 'smoothie', customer: 'Smoothie Bar', product: 'skim', amount: 12, reward: 60, requires: 'separator' },
  { id: 'cheese-shop', customer: 'Cheese Shop', product: 'cheese', amount: 3, reward: 360, requires: 'cheese' },
  { id: 'gym', customer: 'Gym Café', product: 'yogurt', amount: 4, reward: 280, requires: 'yogurt' },
]

export const PRODUCT_LABELS: Record<SellableKey, { name: string; unit: string; plural: string }> = {
  raw: { name: 'Raw milk', unit: 'L', plural: 'L raw milk' },
  pasteurized: { name: 'Pasteurized milk', unit: 'L', plural: 'L pasteurized milk' },
  cream: { name: 'Cream', unit: 'L', plural: 'L cream' },
  skim: { name: 'Skim milk', unit: 'L', plural: 'L skim milk' },
  packs: { name: 'Bottled 6-packs', unit: 'pack', plural: '6-packs' },
  crates: { name: 'Milk crates', unit: 'crate', plural: 'crates' },
  cheese: { name: 'Cheese wheels', unit: 'wheel', plural: 'cheese wheels' },
  yogurt: { name: 'Yogurt 4-packs', unit: 'pack', plural: 'yogurt packs' },
}

export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, (seed + 0x6d2b79f5) | 0]
}

export function eligibleTemplates(s: GameState) {
  const active = new Set(s.orders.map((o) => o.templateId))
  return ORDER_TEMPLATES.filter((t) => (!t.requires || has(s, t.requires)) && !active.has(t.id))
}

/** Returns a new state with one more order on the board (or unchanged when nothing fits). */
export function addRandomOrder(s: GameState): GameState {
  const pool = eligibleTemplates(s)
  if (pool.length === 0) return s
  const [r, rng] = nextRandom(s.rng)
  const t = pool[Math.floor(r * pool.length)]
  const scale = 1 + 0.15 * (farmLevel(s).level - 1)
  const amount = t.product === 'raw' || t.product === 'pasteurized' || t.product === 'skim' ? Math.round(t.amount * scale) : Math.max(1, Math.round(t.amount * Math.sqrt(scale)))
  const reward = Math.round((t.reward * (amount / t.amount)) * orderRewardMultiplier(s))
  const order: MarketOrder = {
    id: `order-${s.orderSerial + 1}`,
    templateId: t.id,
    customer: t.customer,
    product: t.product,
    amount,
    reward,
    status: 'available',
  }
  return { ...s, rng, orderSerial: s.orderSerial + 1, orders: [...s.orders, order] }
}

export function dashOrder(s: GameState): MarketOrder | null {
  const list = MODES[s.mode].fixedOrders
  if (!list || s.dashIndex >= list.length) return null
  const o = list[s.dashIndex]
  return {
    id: `dash-${s.dashIndex}`,
    templateId: `dash-${s.dashIndex}`,
    customer: o.customer,
    product: o.product,
    amount: o.amount,
    reward: o.reward,
    status: 'accepted',
  }
}

export function canFulfil(s: GameState, order: MarketOrder) {
  return productAvailable(s, order.product) >= order.amount - 1e-6
}
