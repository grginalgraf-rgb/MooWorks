'use client'

import { useSyncExternalStore } from 'react'
import { audio } from './audio'
import { BALANCE } from './balance'
import { createInitialState } from './initial-state'
import { type OfflineSummary, simulateOffline } from './offline'
import { type GameAction, SAVE_ACTIONS, gameReducer } from './reducer'
import { type Records, clearSave, deserialize, readRecords, readSave, serialize, writeRecords, writeSave } from './save'
import { tickGame } from './simulation'
import type { GameEvent, GameMode, GameState } from './types'

export type StoreMeta = {
  hydrated: boolean
  hasSave: boolean
  savedMode: GameMode | null
  offlineSummary: OfflineSummary | null
  records: Records
}

type EventListener = (e: GameEvent) => void

class GameStore {
  private state: GameState | null = null
  private meta: StoreMeta = {
    hydrated: false,
    hasSave: false,
    savedMode: null,
    offlineSummary: null,
    records: { bestTimes: {}, retiredRuns: 0 },
  }
  private listeners = new Set<() => void>()
  private eventListeners = new Set<EventListener>()
  private loop: ReturnType<typeof setInterval> | null = null
  private lastTime = 0
  private accumulator = 0
  private sinceSave = 0
  private saved: GameState | null = null

  getState = () => this.state
  getMeta = () => this.meta

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onEvent(listener: EventListener) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /** Broadcasts a UI-only event (e.g. an invalid-drop hint) without touching game state. */
  emit(e: GameEvent) {
    this.eventListeners.forEach((l) => l(e))
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  private setMeta(patch: Partial<StoreMeta>) {
    this.meta = { ...this.meta, ...patch }
    this.notify()
  }

  hydrate() {
    if (this.meta.hydrated) return
    const saved = readSave()
    this.saved = saved
    this.meta = {
      ...this.meta,
      hydrated: true,
      hasSave: !!saved,
      savedMode: saved?.mode ?? null,
      records: readRecords(),
    }
    this.notify()
  }

  continueGame() {
    const saved = this.saved ?? readSave()
    if (!saved) return
    const { state, summary } = simulateOffline(saved)
    this.state = state
    this.meta = { ...this.meta, offlineSummary: summary }
    this.save()
    this.start()
    this.notify()
  }

  newGame(mode: GameMode) {
    this.state = createInitialState(mode)
    this.meta = { ...this.meta, offlineSummary: null, hasSave: true, savedMode: mode }
    this.save()
    this.start()
    this.notify()
  }

  quitToTitle() {
    if (this.state) this.save()
    this.stop()
    this.saved = this.state
    this.state = null
    audio.setMusic('title')
    this.notify()
  }

  resetSave() {
    this.stop()
    clearSave()
    this.saved = null
    this.state = null
    this.meta = { ...this.meta, hasSave: false, savedMode: null, offlineSummary: null }
    this.notify()
  }

  importSave(text: string): boolean {
    const imported = deserialize(text)
    if (!imported) return false
    this.state = { ...imported, lastSavedAt: Date.now() }
    this.meta = { ...this.meta, hasSave: true, savedMode: imported.mode, offlineSummary: null }
    this.save()
    this.start()
    this.notify()
    return true
  }

  exportSave(): string | null {
    return this.state ? serialize(this.state) : this.saved ? serialize(this.saved) : null
  }

  dismissOfflineSummary() {
    this.setMeta({ offlineSummary: null })
  }

  dispatch = (action: GameAction) => {
    if (!this.state) return
    const prev = this.state
    this.commit(prev, gameReducer(prev, action))
    if (SAVE_ACTIONS.has(action.type)) this.save()
  }

  private commit(prev: GameState, next: GameState) {
    if (next === prev) return
    const events = next.pending
    this.state = events.length ? { ...next, pending: [] } : next
    if (!prev.ended && this.state.ended) this.recordEnding(this.state)
    if (prev.legacy.retiredRuns !== this.state.legacy.retiredRuns) {
      const records = { ...this.meta.records, retiredRuns: this.meta.records.retiredRuns + 1 }
      writeRecords(records)
      this.meta = { ...this.meta, records }
    }
    this.notify()
    events.forEach((e) => {
      if (e.type === 'sound') audio.play(e.name)
      this.eventListeners.forEach((l) => l(e))
    })
  }

  private recordEnding(s: GameState) {
    if (s.ended?.outcome !== 'won' || (s.mode !== 'dash' && s.mode !== 'milkrun')) return
    const best = this.meta.records.bestTimes[s.mode]
    if (best === undefined || s.ended.seconds < best) {
      const records = { ...this.meta.records, bestTimes: { ...this.meta.records.bestTimes, [s.mode]: s.ended.seconds } }
      writeRecords(records)
      this.meta = { ...this.meta, records }
    }
    this.save()
  }

  save() {
    if (!this.state) return
    writeSave(this.state)
    this.sinceSave = 0
  }

  private start() {
    if (this.loop || typeof window === 'undefined') return
    this.lastTime = performance.now()
    this.accumulator = 0
    audio.setMusic('game')
    this.loop = setInterval(() => this.step(), 100)
    window.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('pagehide', this.onHide)
  }

  private stop() {
    if (this.loop) clearInterval(this.loop)
    this.loop = null
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.onVisibility)
      window.removeEventListener('pagehide', this.onHide)
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.save()
  }

  private onHide = () => this.save()

  private step() {
    if (!this.state) return
    const now = performance.now()
    const elapsed = Math.min(BALANCE.maxCatchUpSeconds, (now - this.lastTime) / 1000)
    this.lastTime = now
    this.accumulator += elapsed
    const dt = BALANCE.tickSeconds
    if (this.accumulator < dt) return
    const prev = this.state
    let next = prev
    while (this.accumulator >= dt) {
      next = tickGame(next, dt)
      this.accumulator -= dt
    }
    this.commit(prev, next)
    this.sinceSave += elapsed
    if (this.sinceSave >= BALANCE.autosaveSeconds) this.save()
  }
}

export const gameStore = new GameStore()

const serverMeta: StoreMeta = {
  hydrated: false,
  hasSave: false,
  savedMode: null,
  offlineSummary: null,
  records: { bestTimes: {}, retiredRuns: 0 },
}

export function useGameState(): GameState | null {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getState, () => null)
}

export function useStoreMeta(): StoreMeta {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getMeta, () => serverMeta)
}
