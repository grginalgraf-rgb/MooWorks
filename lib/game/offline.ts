import { BALANCE } from './balance'
import { mode } from './economy'
import { tickGame } from './simulation'
import type { GameState } from './types'

export type OfflineSummary = {
  seconds: number
  milkProduced: number
  coinsEarned: number
  productsMade: number
}

function productUnits(s: GameState) {
  const i = s.inventory
  return i.packs + i.crates + i.cheese + i.yogurt + s.lifetime.productsSold
}

/** Fast-forwards a loaded save at reduced efficiency. Machines stop safely on their own when blocked or starved. */
export function simulateOffline(state: GameState, now = Date.now()): { state: GameState; summary: OfflineSummary | null } {
  if (!mode(state).offlineProgress || state.ended) return { state, summary: null }
  const away = Math.floor((now - state.lastSavedAt) / 1000)
  if (away < BALANCE.offline.minimumSeconds) return { state, summary: null }
  const seconds = Math.min(away, BALANCE.offline.capSeconds)

  let s = state
  for (let i = 0; i < seconds; i++) {
    s = tickGame(s, 1, { efficiency: BALANCE.offline.efficiency, offline: true })
  }
  s = { ...s, pending: [], lastSavedAt: now }

  return {
    state: s,
    summary: {
      seconds,
      milkProduced: s.lifetime.milkProducedLitres - state.lifetime.milkProducedLitres,
      coinsEarned: s.lifetime.revenue - state.lifetime.revenue,
      productsMade: Math.max(0, productUnits(s) - productUnits(state)),
    },
  }
}
