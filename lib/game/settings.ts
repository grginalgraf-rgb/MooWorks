'use client'

import { useSyncExternalStore } from 'react'
import { audio } from './audio'

export type Settings = {
  sound: boolean
  music: boolean
  reducedMotion: boolean
  compactNumbers: boolean
}

const KEY = 'mooworks-settings-v1'
const DEFAULTS: Settings = { sound: true, music: false, reducedMotion: false, compactNumbers: true }

let current: Settings = DEFAULTS
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const text = localStorage.getItem(KEY)
    if (text) current = { ...DEFAULTS, ...JSON.parse(text) }
    else if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) current = { ...current, reducedMotion: true }
  } catch {}
  audio.soundOn = current.sound
  audio.musicOn = current.music
}

export function getSettings(): Settings {
  load()
  return current
}

export function updateSettings(patch: Partial<Settings>) {
  load()
  current = { ...current, ...patch }
  audio.soundOn = current.sound
  audio.musicOn = current.music
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {}
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULTS)
}
