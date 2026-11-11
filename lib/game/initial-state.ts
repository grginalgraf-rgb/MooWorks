import { BALANCE, COW_NAMES, MACHINE_ORDER } from './balance'
import { MODES } from './modes'
import type { BreedId, Cow, GameMode, GameState, MachineId, MachineState } from './types'

export const SAVE_VERSION = 1

export function makeCow(number: number, breed: BreedId, opts: Partial<Cow> = {}): Cow {
  const name = COW_NAMES[(number - 1) % COW_NAMES.length] + (number > COW_NAMES.length ? ` ${Math.ceil(number / COW_NAMES.length)}` : '')
  return {
    id: `cow-${number}`,
    name,
    breed,
    milkReadyLitres: 0,
    happiness: 80,
    nutrition: 90,
    hydration: 90,
    health: 100,
    isAdult: true,
    growth: 100,
    ...opts,
  }
}

function freshMachines(): Record<MachineId, MachineState> {
  return Object.fromEntries(
    MACHINE_ORDER.map((id) => [id, { enabled: true, progress: 0, loaded: false, status: 'locked' } satisfies MachineState]),
  ) as Record<MachineId, MachineState>
}

export function createInitialState(modeId: GameMode, now = Date.now()): GameState {
  const m = MODES[modeId]
  const cows: Cow[] = [makeCow(1, 'meadow', { milkReadyLitres: BALANCE.start.firstCowReadyLitres, name: BALANCE.start.firstCowName })]
  if (m.startWithCalf) cows.push(makeCow(2, 'meadow', { isAdult: false, growth: 0 }))

  return {
    version: SAVE_VERSION,
    mode: modeId,
    coins: m.startCoins,
    cows,
    nextCowNumber: cows.length + 1,
    inventory: {
      can: 0,
      barnBuffer: 0,
      raw: 0,
      chilled: 0,
      pasteurized: 0,
      cream: 0,
      skim: 0,
      packs: 0,
      crates: 0,
      cheese: 0,
      yogurt: 0,
      fruit: 0,
    },
    freshness: { raw: 100, chilled: 100 },
    resources: {
      feedStock: BALANCE.start.feedStock,
      waterStock: BALANCE.start.waterStock,
      feedTrough: BALANCE.start.feedTrough,
      waterTrough: BALANCE.start.waterTrough,
    },
    upgrades: {},
    machines: freshMachines(),
    autoSellRaw: true,
    truckTimer: 0,
    handCooldown: 0,
    lifetime: {
      revenue: 0,
      milkProducedLitres: 0,
      milkSoldLitres: 0,
      productsSold: 0,
      ordersCompleted: 0,
      playTimeSeconds: 0,
      truckDeliveries: 0,
    },
    flags: {},
    wellFedSeconds: 0,
    achievements: [],
    orders: [],
    orderTimer: 20,
    orderSerial: 0,
    dashIndex: 0,
    rng: (now % 2147483647) || 1,
    tutorial: { step: 0, skipped: false, completed: false },
    legacy: { shown: false, retiredRuns: 0 },
    modeClock: 0,
    ended: null,
    autoSellBank: 0,
    runStartedAt: now,
    lastSavedAt: now,
    pending: [],
  }
}
