import { checkAchievements } from './achievements'
import { BALANCE, BREEDS } from './balance'
import { barnCapacity, cowRate, feedCapacity, mode, orderSlots, truckInterval, waterCapacity } from './economy'
import { addRandomOrder } from './orders'
import { dispatchTruck, draft, emit, runAutoSell, runMachines, runMilking, truckCargoAvailable } from './production'
import type { GameState } from './types'
import { has, stat } from './upgrades'

export type TickOptions = { efficiency?: number; offline?: boolean }

function approach(current: number, target: number, up: number, down: number) {
  if (current < target) return Math.min(target, current + up)
  return Math.max(target, current - down)
}

function runTroughs(s: GameState, dt: number) {
  const cap = BALANCE.troughs.capacity
  const rate = BALANCE.troughs.autoFillPerSec * dt
  const r = s.resources
  if (has(s, 'auto-feeder') && r.feedTrough < cap && r.feedStock > 0) {
    const move = Math.min(rate, cap - r.feedTrough, r.feedStock)
    r.feedTrough += move
    r.feedStock -= move
  }
  if (has(s, 'auto-water') && r.waterTrough < cap && r.waterStock > 0) {
    const move = Math.min(rate, cap - r.waterTrough, r.waterStock)
    r.waterTrough += move
    r.waterStock -= move
  }
}

function runCows(s: GameState, dt: number, efficiency: number) {
  const c = BALANCE.cow
  const h = BALANCE.happiness
  const feedUse = Math.max(0.3, 1 - stat(s, 'feedUse'))
  const waterUse = Math.max(0.3, 1 - stat(s, 'waterUse'))
  const hay = stat(s, 'hay')
  const bedding = stat(s, 'bedding')
  const shade = stat(s, 'shade')
  const vet = stat(s, 'vet')
  const space = h.spaceBonus * Math.max(0, 1 - s.cows.length / Math.max(1, barnCapacity(s)))
  const r = s.resources

  for (const cow of s.cows) {
    const breed = BREEDS[cow.breed]
    const sizeFactor = cow.isAdult ? 1 : c.calfFeedFactor
    const feedNeed = (c.feedPerMinute / 60) * dt * breed.feedMultiplier * feedUse * sizeFactor
    const waterNeed = (c.waterPerMinute / 60) * dt * waterUse * sizeFactor

    const fed = r.feedTrough > 1e-6
    r.feedTrough = Math.max(0, r.feedTrough - feedNeed)
    const watered = r.waterTrough > 1e-6
    r.waterTrough = Math.max(0, r.waterTrough - waterNeed)

    cow.nutrition = fed
      ? Math.min(100, cow.nutrition + c.nutritionRecoveryPerSec * (1 + hay) * dt)
      : Math.max(0, cow.nutrition - c.starvationPerSec * dt)
    cow.hydration = watered
      ? Math.min(100, cow.hydration + c.hydrationRecoveryPerSec * dt)
      : Math.max(0, cow.hydration - c.starvationPerSec * dt)

    const target = Math.min(
      100,
      Math.max(0, h.base + h.perBedding * bedding + h.perShade * shade + space + (fed && watered ? h.fedBonus : h.hungryPenalty)),
    )
    cow.happiness = approach(
      cow.happiness,
      target,
      (h.riseRate + h.riseRatePerShade * shade) * dt,
      (h.fallRate / (1 + h.beddingFallReduction * bedding)) * dt,
    )

    if (cow.nutrition < c.lowCareThreshold || cow.hydration < c.lowCareThreshold) {
      cow.health = Math.max(10, cow.health - c.healthLossPerSec * dt)
    } else {
      cow.health = Math.min(100, cow.health + c.healthRecoveryPerSec * (1 + 0.5 * vet) * breed.healthRecovery * dt)
    }

    if (!cow.isAdult) {
      if (fed && watered) cow.growth = Math.min(100, cow.growth + (100 / c.calfGrowthSeconds) * dt)
      if (cow.growth >= 100) {
        cow.isAdult = true
        emit(s, { type: 'toast', title: `${cow.name} is all grown up`, body: 'She now produces milk.', tone: 'good' })
      }
      continue
    }

    const produced = Math.min(c.holdingCapacity - cow.milkReadyLitres, cowRate(s, cow) * dt * efficiency)
    if (produced > 0) {
      cow.milkReadyLitres += produced
      s.lifetime.milkProducedLitres += produced
    }
  }
}

function runWarnings(s: GameState) {
  const lowFeed = s.resources.feedStock + s.resources.feedTrough < feedCapacity(s) * BALANCE.resources.lowWarningFraction
  const lowWater = s.resources.waterStock + s.resources.waterTrough < waterCapacity(s) * BALANCE.resources.lowWarningFraction
  if (lowFeed && !s.flags.warnFeed) {
    emit(s, { type: 'toast', title: 'Feed is running low', body: 'Buy a Feed Refill in the Care tab.', tone: 'warn' })
  }
  if (lowWater && !s.flags.warnWater) {
    emit(s, { type: 'toast', title: 'Water is running low', body: 'Buy a Water Refill in the Care tab.', tone: 'warn' })
  }
  s.flags.warnFeed = lowFeed
  s.flags.warnWater = lowWater
}

export function advanceTutorial(s: GameState) {
  const t = s.tutorial
  if (t.skipped || t.completed) return
  if (t.step === 1 && s.flags.collected) t.step = 2
  if (t.step === 2 && s.lifetime.milkSoldLitres > 0) t.step = 3
  if (t.step === 3 && s.cows.length >= 2) t.step = 4
  if (t.step === 5 && has(s, 'milking-machine')) t.completed = true
}

function runModeRules(s: GameState) {
  const m = mode(s)
  if (m.timeLimitSeconds && s.modeClock >= m.timeLimitSeconds) {
    s.ended = { outcome: 'lost', seconds: m.timeLimitSeconds }
  }
  if (m.targetRevenue && s.lifetime.revenue >= m.targetRevenue) {
    s.ended = { outcome: 'won', seconds: s.modeClock }
  }
  if (m.legacyGoal && !s.legacy.shown && s.lifetime.revenue >= BALANCE.legacyRevenue) {
    s.legacy.shown = true
    s.flags.legacyPending = true
  }
}

export function tickGame(prev: GameState, dt: number, opts: TickOptions = {}): GameState {
  if (prev.ended) return prev
  const efficiency = opts.efficiency ?? 1
  let s = draft(prev)

  s.lifetime.playTimeSeconds += dt
  s.modeClock += dt
  s.handCooldown = Math.max(0, s.handCooldown - dt)

  runTroughs(s, dt)
  runCows(s, dt, efficiency)
  runMilking(s, dt)
  runMachines(s, dt)
  runAutoSell(s, dt)

  if (has(s, 'truck')) {
    s.truckTimer = Math.min(truckInterval(s), s.truckTimer + dt)
    if (s.truckTimer >= truckInterval(s) && has(s, 'auto-dispatch') && truckCargoAvailable(s) > 0) {
      dispatchTruck(s, true)
    }
  }

  if (mode(s).orderBoard) {
    if (s.orders.length < orderSlots(s)) {
      s.orderTimer -= dt
      if (s.orderTimer <= 0) {
        s = addRandomOrder(s)
        s.orderTimer = BALANCE.orders.refreshSeconds
      }
    }
  }

  const feedFraction = s.resources.feedStock / Math.max(1, feedCapacity(s))
  s.wellFedSeconds = feedFraction > 0.8 ? s.wellFedSeconds + dt : 0

  if (!opts.offline) {
    runWarnings(s)
    advanceTutorial(s)
  }
  runModeRules(s)
  return checkAchievements(s)
}
