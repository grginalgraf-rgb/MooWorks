import { BALANCE, BREEDS, FARM_LEVELS, MACHINES } from './balance'
import { MODES } from './modes'
import type { BreedId, Cow, GameState, MachineId, SellableKey } from './types'
import { UPGRADE_MAP, type UpgradeDef, has, level, prereqMet, stat, upgradeCost, describePrereq } from './upgrades'

export const mode = (s: GameState) => MODES[s.mode]

export const barnCapacity = (s: GameState) => BALANCE.start.barnCapacity + stat(s, 'barnCap')
export const feedCapacity = (s: GameState) => BALANCE.resources.baseFeedCapacity + stat(s, 'feedCap')
export const waterCapacity = (s: GameState) => BALANCE.resources.baseWaterCapacity + stat(s, 'waterCap')
export const canCapacity = (s: GameState) => BALANCE.can.baseCapacity + stat(s, 'canCap')
export const handCooldown = (s: GameState) =>
  Math.max(0.2, BALANCE.can.baseCooldown - BALANCE.can.cooldownReductionPerLevel * stat(s, 'handSpeed'))
export const rawCapacity = (s: GameState) =>
  has(s, 'pipeline') ? BALANCE.storage.rawBase + stat(s, 'rawCap') : 0
export const chilledCapacity = (s: GameState) => stat(s, 'chilledCap')
export const pasteurizedCapacity = (s: GameState) =>
  has(s, 'pasteurizer')
    ? BALANCE.storage.pasteurizedBase + BALANCE.storage.pasteurizedPerLevel * (level(s, 'pasteurizer') - 1)
    : 0
export const goodsCapacity = (s: GameState) => BALANCE.storage.goodsBase + stat(s, 'goodsCap')
export const creamCapacity = (s: GameState) =>
  has(s, 'separator') ? BALANCE.storage.creamTankBase + BALANCE.storage.creamTankPerLevel * (level(s, 'separator') - 1) : 0
export const goodsCount = (s: GameState) =>
  s.inventory.packs + s.inventory.crates + s.inventory.cheese + s.inventory.yogurt

export const milkSlots = (s: GameState) => stat(s, 'milkSlots')

export const adultCows = (s: GameState) => s.cows.filter((c) => c.isAdult)

export function unlockedBreeds(s: GameState): BreedId[] {
  return (Object.keys(BREEDS) as BreedId[]).filter((b) => {
    const u = BREEDS[b].unlockUpgrade
    return !u || has(s, u)
  })
}

export function cowPrice(s: GameState, breed: BreedId): number {
  const m = mode(s)
  const owned = s.cows.length
  const base = m.cowPriceBase * Math.pow(BALANCE.cow.priceGrowth, Math.max(0, owned - 1))
  return Math.ceil(base * BREEDS[breed].priceMultiplier * (m.buyAsCalf ? m.calfPriceFactor : 1))
}

export function upgradePrice(s: GameState, def: UpgradeDef): number {
  const l = def.kind === 'level' ? level(s, def.id) : 0
  return Math.ceil(upgradeCost(def.baseCost, def.growth, l) * mode(s).upgradeCostMultiplier)
}

/** Returns a human-readable reason a purchase is blocked, or null if it can be bought. */
export function purchaseBlocker(s: GameState, def: UpgradeDef, price: number): string | null {
  if (def.kind === 'level' && level(s, def.id) >= def.maxLevel) return 'Maxed out'
  const missing = def.prereqs.find((p) => !prereqMet(s, p))
  if (missing) return describePrereq(missing)
  if (def.kind === 'cow' && s.cows.length >= barnCapacity(s)) return `Barn full (${barnCapacity(s)} cows)`
  if (def.consumable) {
    const r = def.consumable.resource
    if (r === 'feedStock' && s.resources.feedStock >= feedCapacity(s)) return 'Silo is full'
    if (r === 'waterStock' && s.resources.waterStock >= waterCapacity(s)) return 'Water tower is full'
  }
  if (s.coins < price) return `Need ${Math.ceil(price - s.coins)} more coins`
  return null
}

export function careMultiplier(s: GameState, cow: Cow): number {
  const vet = stat(s, 'vet')
  const nutritionFactor = 0.65 + 0.35 * (cow.nutrition / 100)
  const hydrationFactor = 0.65 + 0.35 * (cow.hydration / 100)
  const happinessFactor = 0.8 + 0.2 * (cow.happiness / 100)
  const healthFloor = Math.min(0.8, 0.5 + 0.1 * vet)
  const healthFactor = healthFloor + (1 - healthFloor) * (cow.health / 100)
  return nutritionFactor * hydrationFactor * happinessFactor * healthFactor
}

export function cowProductionMultiplier(s: GameState, cow: Cow): number {
  const fed = s.resources.feedTrough > 0
  const breed = BREEDS[cow.breed].milkMultiplier
  const herd = 1 + stat(s, 'herdProd')
  const hay = fed ? 1 + stat(s, 'hay') : 1
  const total = careMultiplier(s, cow) * breed * herd * hay
  const cap = BALANCE.cow.careClampMax + stat(s, 'careCap')
  return Math.min(cap, Math.max(BALANCE.cow.careClampMin, total))
}

/** litres per second for one cow */
export function cowRate(s: GameState, cow: Cow): number {
  if (!cow.isAdult) return 0
  return (BALANCE.cow.litresPerMinute / 60) * cowProductionMultiplier(s, cow)
}

export function herdLitresPerMinute(s: GameState): number {
  return s.cows.reduce((sum, c) => sum + cowRate(s, c), 0) * 60
}

export function averageCare(s: GameState): number {
  const cows = s.cows
  if (cows.length === 0) return 0
  const total = cows.reduce((sum, c) => sum + (c.happiness + c.nutrition + c.hydration + c.health) / 4, 0)
  return total / cows.length
}

export function averageHappiness(s: GameState): number {
  if (s.cows.length === 0) return 0
  return s.cows.reduce((sum, c) => sum + c.happiness, 0) / s.cows.length
}

export type Grade = { id: 'standard' | 'fresh' | 'premium'; label: string; multiplier: number; reason: string }

export function qualityGrade(s: GameState, freshness = 100): Grade {
  const care = averageCare(s)
  const qc = stat(s, 'qualityControl')
  const lab = stat(s, 'qualityLab')
  const freshT = BALANCE.quality.fresh.careThreshold - BALANCE.quality.thresholdPerQualityControl * qc
  const premT =
    BALANCE.quality.premium.careThreshold -
    BALANCE.quality.thresholdPerQualityControl * qc -
    BALANCE.quality.premiumThresholdPerLab * lab
  if (care >= premT && freshness >= 95 && has(s, 'cooling') && (lab > 0 || qc > 0)) {
    return {
      id: 'premium',
      label: 'Premium',
      multiplier: BALANCE.quality.premium.multiplier,
      reason: `Herd care ${Math.round(care)} ≥ ${premT}, chilled & lab-tested.`,
    }
  }
  if (care >= freshT && freshness >= BALANCE.quality.fresh.freshnessThreshold) {
    const hint = has(s, 'cooling') ? `Premium needs care ${premT}+ and Quality Lab or Control.` : 'Premium needs a Cooling Tank.'
    return {
      id: 'fresh',
      label: 'Fresh',
      multiplier: BALANCE.quality.fresh.multiplier,
      reason: `Herd care ${Math.round(care)} ≥ ${freshT}. ${hint}`,
    }
  }
  return {
    id: 'standard',
    label: 'Standard',
    multiplier: 1,
    reason:
      care < freshT
        ? `Raise herd care to ${freshT}+ (now ${Math.round(care)}) for Fresh grade.`
        : `Milk freshness ${Math.round(freshness)}% is below 85%.`,
  }
}

export function freshnessMultiplier(freshness: number): number {
  const floor = BALANCE.freshness.priceFloor
  return floor + (1 - floor) * (freshness / 100)
}

/** Sale value of one unit (litre or item) of a product. */
export function unitPrice(s: GameState, key: SellableKey, freshness = 100): number {
  const p = BALANCE.prices
  const grade = qualityGrade(s, freshness).multiplier
  const lab = 1 + BALANCE.quality.labValueBonus * stat(s, 'qualityLab')
  const homog = 1 + stat(s, 'homog')
  switch (key) {
    case 'raw':
      return p.raw * grade * freshnessMultiplier(freshness)
    case 'pasteurized':
      return p.pasteurized * grade * lab
    case 'packs':
      return p.packs * (1 + 0.1 * Math.max(0, level(s, 'bottler') - 1)) * homog * grade * lab
    case 'crates':
      return p.crates * (1 + 0.15 * Math.max(0, level(s, 'crater') - 1)) * homog * grade * lab
    case 'cream':
      return p.cream * grade * lab
    case 'skim':
      return p.skim * lab
    case 'cheese':
      return p.cheese * (1 + 0.1 * Math.max(0, level(s, 'cheese') - 1)) * grade * lab
    case 'yogurt':
      return p.yogurt * grade * lab
  }
}

export function farmLevel(s: GameState) {
  let current: (typeof FARM_LEVELS)[number] = FARM_LEVELS[0]
  for (const lvl of FARM_LEVELS) if (s.lifetime.revenue >= lvl.revenue) current = lvl
  const next = FARM_LEVELS.find((l) => l.level === current.level + 1)
  const progress = next ? (s.lifetime.revenue - current.revenue) / (next.revenue - current.revenue) : 1
  return { ...current, next, progress: Math.min(1, Math.max(0, progress)) }
}

export function machineUnlocked(s: GameState, id: MachineId) {
  return has(s, MACHINES[id].upgradeId)
}

export function machineCycleSeconds(s: GameState, id: MachineId): number {
  const def = MACHINES[id]
  const lvl = Math.max(1, level(s, def.upgradeId))
  let speed = (1 + def.levelSpeedBonus * (lvl - 1)) * (1 + stat(s, 'machineSpeed'))
  if (def.conveyor) speed *= 1 + stat(s, 'conveyor')
  const reduce = Math.max(0.5, 1 - stat(s, 'cycleReduce'))
  return (def.cycleSeconds / speed) * reduce
}

export function coolingRate(s: GameState): number {
  const lvl = Math.max(1, level(s, 'cooling'))
  return (MACHINES.cooling.transferRate ?? 1) * (1 + MACHINES.cooling.levelSpeedBonus * (lvl - 1)) * (1 + stat(s, 'machineSpeed'))
}

export function truckInterval(s: GameState): number {
  const l = level(s, 'truck')
  return Math.max(20, BALANCE.truck.baseInterval - BALANCE.truck.intervalReductionPerLevel * Math.max(0, l - 1))
}

export function truckLoad(s: GameState): number {
  return BALANCE.truck.loadPerLevel * level(s, 'truck')
}

export function orderSlots(s: GameState): number {
  return BALANCE.orders.baseSlots + BALANCE.orders.slotsPerContract * stat(s, 'contracts')
}

export function orderRewardMultiplier(s: GameState): number {
  return (1 + BALANCE.orders.rewardPerContract * stat(s, 'contracts')) * (1 + stat(s, 'orderValue'))
}

export function rawAvailable(s: GameState): number {
  return s.inventory.can + s.inventory.raw + s.inventory.chilled
}

export function productAvailable(s: GameState, key: SellableKey): number {
  if (key === 'raw') return rawAvailable(s)
  return s.inventory[key]
}

export function totalMilkLitres(s: GameState): number {
  const i = s.inventory
  return i.can + i.barnBuffer + i.raw + i.chilled + i.pasteurized
}

export function runningMachineCount(s: GameState): number {
  return Object.values(s.machines).filter((m) => m.status === 'running').length
}

export function upgradeDef(id: string) {
  return UPGRADE_MAP[id]
}
