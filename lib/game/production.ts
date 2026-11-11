import { BALANCE, BREEDS, MACHINES, MACHINE_ORDER } from './balance'
import {
  adultCows,
  chilledCapacity,
  coolingRate,
  creamCapacity,
  goodsCapacity,
  goodsCount,
  machineCycleSeconds,
  milkSlots,
  pasteurizedCapacity,
  truckLoad,
  unitPrice,
} from './economy'
import type { GameEvent, GameState, InventoryKey, MachineId, SellableKey } from './types'
import { has, stat } from './upgrades'

/** Shallow-copies every nested object a tick or action may write to. Callers mutate the copy only. */
export function draft(s: GameState): GameState {
  return {
    ...s,
    inventory: { ...s.inventory },
    freshness: { ...s.freshness },
    resources: { ...s.resources },
    cows: s.cows.map((c) => ({ ...c })),
    machines: Object.fromEntries(Object.entries(s.machines).map(([k, v]) => [k, { ...v }])) as GameState['machines'],
    lifetime: { ...s.lifetime },
    flags: { ...s.flags },
    tutorial: { ...s.tutorial },
    legacy: { ...s.legacy },
    pending: [...s.pending],
  }
}

export function emit(s: GameState, ...events: GameEvent[]) {
  s.pending.push(...events)
}

export function earn(s: GameState, amount: number) {
  s.coins += amount
  s.lifetime.revenue += amount
}

export function mixFreshness(currentAmount: number, currentFreshness: number, addAmount: number, addFreshness: number) {
  const total = currentAmount + addAmount
  if (total <= 0) return 100
  return (currentAmount * currentFreshness + addAmount * addFreshness) / total
}

/** Cows serviced by the milking machine: the first N adults in herd order. */
export function milkedCowIds(s: GameState): Set<string> {
  const slots = milkSlots(s)
  return new Set(adultCows(s).slice(0, slots).map((c) => c.id))
}

export function herdCreamBonus(s: GameState) {
  const adults = adultCows(s)
  if (adults.length === 0) return 0
  return adults.reduce((sum, c) => sum + BREEDS[c.breed].creamBonus, 0) / adults.length
}

/** Remaining room for a product output, in that output's units. */
function outputRoom(s: GameState, key: InventoryKey): number {
  const i = s.inventory
  switch (key) {
    case 'chilled':
      return chilledCapacity(s) - i.chilled
    case 'pasteurized':
      return pasteurizedCapacity(s) - i.pasteurized
    case 'packs':
    case 'crates':
    case 'cheese':
    case 'yogurt':
      return goodsCapacity(s) - goodsCount(s)
    case 'cream':
    case 'skim':
      return creamCapacity(s) - i.cream - i.skim
    default:
      return Infinity
  }
}

function batchOutputs(s: GameState, id: MachineId) {
  const def = MACHINES[id]
  if (id === 'separator') {
    const bonus = herdCreamBonus(s)
    return [
      { key: 'cream' as const, amount: 1 * (1 + bonus) },
      { key: 'skim' as const, amount: 3 },
    ]
  }
  return def.outputs
}

function hasRoomFor(s: GameState, outputs: { key: InventoryKey; amount: number }[], freedGoods = 0) {
  const goodsKeys: InventoryKey[] = ['packs', 'crates', 'cheese', 'yogurt']
  const creamKeys: InventoryKey[] = ['cream', 'skim']
  const goodsNeeded = outputs.filter((o) => goodsKeys.includes(o.key)).reduce((a, o) => a + o.amount, 0)
  const creamNeeded = outputs.filter((o) => creamKeys.includes(o.key)).reduce((a, o) => a + o.amount, 0)
  if (goodsNeeded > 0 && outputRoom(s, 'packs') + freedGoods < goodsNeeded - 1e-9) return false
  if (creamNeeded > 0 && outputRoom(s, 'cream') < creamNeeded - 1e-9) return false
  for (const o of outputs) {
    if (goodsKeys.includes(o.key) || creamKeys.includes(o.key)) continue
    if (outputRoom(s, o.key) < o.amount - 1e-9) return false
  }
  return true
}

const OUTPUT_LABEL: Partial<Record<InventoryKey, string>> = {
  chilled: 'Chilled tank full',
  pasteurized: 'Pasteurized tank full',
  packs: 'Goods storage full',
  crates: 'Goods storage full',
  cheese: 'Goods storage full',
  yogurt: 'Goods storage full',
  cream: 'Cream tank full',
  skim: 'Cream tank full',
}

export function runMachines(s: GameState, dt: number) {
  for (const id of MACHINE_ORDER) {
    const m = s.machines[id]
    const def = MACHINES[id]
    m.blockedReason = undefined
    if (!has(s, def.upgradeId)) {
      m.status = 'locked'
      continue
    }
    if (!m.enabled) {
      m.status = 'paused'
      continue
    }

    if (def.kind === 'passive') {
      m.status = s.machines.bottler.status === 'running' ? 'running' : 'idle'
      continue
    }

    if (def.kind === 'transfer') {
      const room = chilledCapacity(s) - s.inventory.chilled
      const amount = Math.min(s.inventory.raw, coolingRate(s) * dt, Math.max(0, room))
      if (amount > 1e-9) {
        s.freshness.chilled = mixFreshness(s.inventory.chilled, s.freshness.chilled, amount, s.freshness.raw)
        s.inventory.raw -= amount
        s.inventory.chilled += amount
        m.status = 'running'
        m.progress = (m.progress + dt) % 1
      } else if (s.inventory.raw > 1e-9) {
        m.status = 'blocked'
        m.blockedReason = OUTPUT_LABEL.chilled
      } else {
        m.status = 'idle'
      }
      continue
    }

    const outputs = batchOutputs(s, id)
    if (!m.loaded) {
      const enough = def.inputs.every((inp) => s.inventory[inp.key] >= inp.amount - 1e-9)
      if (!enough) {
        m.status = 'idle'
        m.progress = 0
        continue
      }
      const freed = id === 'crater' ? 2 : 0
      if (!hasRoomFor(s, outputs, freed)) {
        m.status = 'blocked'
        m.blockedReason = OUTPUT_LABEL[outputs[0].key]
        continue
      }
      for (const inp of def.inputs) s.inventory[inp.key] = Math.max(0, s.inventory[inp.key] - inp.amount)
      m.loaded = true
      m.progress = 0
    }

    m.progress = Math.min(1, m.progress + dt / machineCycleSeconds(s, id))
    m.status = 'running'
    if (m.progress >= 1) {
      if (!hasRoomFor(s, outputs)) {
        m.status = 'blocked'
        m.blockedReason = OUTPUT_LABEL[outputs[0].key]
        continue
      }
      for (const out of outputs) s.inventory[out.key] += out.amount
      m.loaded = false
      m.progress = 0
      if (id === 'pasteurizer') s.flags.producedPasteurized = true
      if (id === 'bottler') s.flags.producedPack = true
    }
  }
}

export function runMilking(s: GameState, dt: number) {
  const slots = milkSlots(s)
  if (slots > 0) {
    const rate = BALANCE.milking.litresPerSecondPerSlot * (1 + stat(s, 'milkSpeed')) * dt
    const milked = milkedCowIds(s)
    for (const cow of s.cows) {
      if (!milked.has(cow.id)) continue
      const room = BALANCE.milking.barnBufferCapacity - s.inventory.barnBuffer
      if (room <= 0) break
      const take = Math.min(cow.milkReadyLitres, rate, room)
      cow.milkReadyLitres -= take
      s.inventory.barnBuffer += take
    }
  }

  if (has(s, 'pipeline')) {
    const room = BALANCE.storage.rawBase + stat(s, 'rawCap') - s.inventory.raw
    const move = Math.min(s.inventory.barnBuffer, BALANCE.milking.pipelineLitresPerSecond * dt, Math.max(0, room))
    if (move > 0) {
      s.freshness.raw = mixFreshness(s.inventory.raw, s.freshness.raw, move, 100)
      s.inventory.barnBuffer -= move
      s.inventory.raw += move
    }
  }

  if (s.inventory.raw > 1e-6) {
    s.freshness.raw = Math.max(BALANCE.freshness.minimum, s.freshness.raw - BALANCE.freshness.decayPerSecond * dt)
  } else {
    s.inventory.raw = 0
    s.freshness.raw = 100
  }
}

export function runAutoSell(s: GameState, dt: number) {
  if (!has(s, 'auto-collector') || !s.autoSellRaw) return
  let budget = BALANCE.autoSell.litresPerSecond * dt
  const pasteurizing = has(s, 'pasteurizer') && s.machines.pasteurizer.enabled
  const sources: { key: 'raw' | 'chilled'; reserve: number }[] = has(s, 'cooling') && s.machines.cooling.enabled
    ? [{ key: 'chilled', reserve: pasteurizing ? chilledCapacity(s) * BALANCE.autoSell.overflowFraction : 0 }]
    : [{ key: 'raw', reserve: 0 }]
  let value = 0
  for (const src of sources) {
    const available = Math.max(0, s.inventory[src.key] - src.reserve)
    const amount = Math.min(budget, available)
    if (amount <= 0) continue
    value += amount * unitPrice(s, 'raw', s.freshness[src.key])
    s.inventory[src.key] -= amount
    s.lifetime.milkSoldLitres += amount
    budget -= amount
  }
  if (value > 0) {
    earn(s, value)
    s.autoSellBank += value
    if (s.autoSellBank >= 15) {
      emit(s, { type: 'coins', amount: Math.floor(s.autoSellBank), at: 'tank' })
      s.autoSellBank -= Math.floor(s.autoSellBank)
    }
  }
}

const TRUCK_PRIORITY: SellableKey[] = ['crates', 'cheese', 'yogurt', 'packs', 'cream', 'skim']

export function truckCargoAvailable(s: GameState) {
  return TRUCK_PRIORITY.reduce((sum, k) => sum + Math.floor(s.inventory[k]), 0)
}

/** Loads and sells up to the truck's capacity. Mutates the draft. Returns coins earned. */
export function dispatchTruck(s: GameState, auto: boolean): number {
  let room = truckLoad(s)
  let value = 0
  const bonus = 1 + BALANCE.truck.deliveryBonus + stat(s, 'orderValue')
  for (const key of TRUCK_PRIORITY) {
    if (room <= 0) break
    // crates feed nothing downstream, but packs may be wanted by the crate packer
    const units = Math.min(room, Math.floor(s.inventory[key]))
    if (units <= 0) continue
    value += units * unitPrice(s, key) * bonus
    s.inventory[key] -= units
    s.lifetime.productsSold += units
    room -= units
    if (key === 'cream') s.flags.soldCream = true
    if (key === 'cheese') s.flags.soldCheese = true
    if (key === 'yogurt') s.flags.soldYogurt = true
  }
  s.truckTimer = 0
  if (value > 0) {
    earn(s, value)
    s.lifetime.truckDeliveries += 1
    if (auto) s.flags.autoDelivery = true
    emit(s, { type: 'truck' }, { type: 'coins', amount: Math.floor(value), at: 'truck' }, { type: 'sound', name: 'truck' })
  }
  return value
}
