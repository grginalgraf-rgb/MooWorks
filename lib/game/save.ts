import { MACHINE_ORDER } from './balance'
import { createInitialState, SAVE_VERSION } from './initial-state'
import { MODES } from './modes'
import type { GameState } from './types'

export const SAVE_KEY = 'mooworks-save-v1'
export const RECORDS_KEY = 'mooworks-records-v1'

type SaveFile = { schema: number; savedAt: number; state: Omit<GameState, 'pending'> }

export type Records = {
  bestTimes: Partial<Record<'dash' | 'milkrun', number>>
  retiredRuns: number
}

/** Upgrades older save files to the current schema and fills any missing fields from a fresh state. */
export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const file = raw as Partial<SaveFile>
  const state = file.state as Partial<GameState> | undefined
  if (!state || typeof state !== 'object' || !state.mode || !(state.mode in MODES)) return null
  const schema = typeof file.schema === 'number' ? file.schema : 1
  if (schema > SAVE_VERSION) return null

  const base = createInitialState(state.mode)
  const merged: GameState = {
    ...base,
    ...state,
    inventory: { ...base.inventory, ...state.inventory },
    freshness: { ...base.freshness, ...state.freshness },
    resources: { ...base.resources, ...state.resources },
    lifetime: { ...base.lifetime, ...state.lifetime },
    tutorial: { ...base.tutorial, ...state.tutorial },
    legacy: { ...base.legacy, ...state.legacy },
    flags: { ...state.flags },
    upgrades: { ...state.upgrades },
    machines: { ...base.machines },
    cows: Array.isArray(state.cows) && state.cows.length > 0 ? state.cows : base.cows,
    orders: Array.isArray(state.orders) ? state.orders : [],
    achievements: Array.isArray(state.achievements) ? state.achievements : [],
    version: SAVE_VERSION,
    pending: [],
  }
  for (const id of MACHINE_ORDER) {
    merged.machines[id] = { ...base.machines[id], ...(state.machines?.[id] ?? {}) }
  }
  return merged
}

export function serialize(state: GameState): string {
  const { pending: _pending, ...rest } = state
  const file: SaveFile = { schema: SAVE_VERSION, savedAt: Date.now(), state: { ...rest, lastSavedAt: Date.now() } }
  return JSON.stringify(file)
}

export function deserialize(text: string): GameState | null {
  try {
    return migrate(JSON.parse(text))
  } catch {
    return null
  }
}

export function writeSave(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state))
  } catch {
    // storage may be full or disabled; the game keeps running in memory
  }
}

export function readSave(): GameState | null {
  try {
    const text = localStorage.getItem(SAVE_KEY)
    return text ? deserialize(text) : null
  } catch {
    return null
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {}
}

export function readRecords(): Records {
  try {
    const text = localStorage.getItem(RECORDS_KEY)
    if (text) {
      const parsed = JSON.parse(text) as Partial<Records>
      return { bestTimes: parsed.bestTimes ?? {}, retiredRuns: parsed.retiredRuns ?? 0 }
    }
  } catch {}
  return { bestTimes: {}, retiredRuns: 0 }
}

export function writeRecords(records: Records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  } catch {}
}
