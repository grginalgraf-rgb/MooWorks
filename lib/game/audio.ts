import type { SoundName } from './types'

type Track = { notes: number[]; interval: number; duration: number; volume: number }

// Melodies from the user's saved BGM settings
const TRACKS: Record<'title' | 'game', Track> = {
  title: {
    notes: [523.25, 587.33, 659.25, 523.25, 783.99, 659.25, 523.25, 392.0, 440.0, 493.88, 523.25, 659.25, 587.33, 523.25],
    interval: 0.25,
    duration: 0.15,
    volume: 0.08,
  },
  game: {
    notes: [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66],
    interval: 0.5,
    duration: 0.3,
    volume: 0.05,
  },
}

const SFX: Record<SoundName, { notes: number[]; step: number; type: OscillatorType; volume: number }> = {
  collect: { notes: [660, 880], step: 0.05, type: 'triangle', volume: 0.08 },
  sell: { notes: [784, 988, 1319], step: 0.07, type: 'square', volume: 0.05 },
  buy: { notes: [523, 659, 784], step: 0.06, type: 'triangle', volume: 0.08 },
  achievement: { notes: [523, 659, 784, 1047], step: 0.09, type: 'square', volume: 0.05 },
  error: { notes: [220, 180], step: 0.07, type: 'sawtooth', volume: 0.04 },
  truck: { notes: [196, 247, 294], step: 0.1, type: 'square', volume: 0.04 },
  order: { notes: [659, 784, 1047, 1319], step: 0.07, type: 'triangle', volume: 0.08 },
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private musicTimer: ReturnType<typeof setInterval> | null = null
  private currentTrack: 'title' | 'game' | null = null
  soundOn = true
  musicOn = false

  private context(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
    const ctx = this.context()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  play(name: SoundName) {
    if (!this.soundOn) return
    const ctx = this.context()
    if (!ctx) return
    const sfx = SFX[name]
    sfx.notes.forEach((n, i) => this.tone(n, ctx.currentTime + i * sfx.step, sfx.step * 1.6, sfx.type, sfx.volume))
  }

  setMusic(track: 'title' | 'game' | null) {
    const wanted = this.musicOn ? track : null
    if (wanted === this.currentTrack && (wanted === null || this.musicTimer)) return
    if (this.musicTimer) clearInterval(this.musicTimer)
    this.musicTimer = null
    this.currentTrack = wanted
    if (!wanted) return
    const t = TRACKS[wanted]
    let index = 0
    const playNext = () => {
      const ctx = this.context()
      if (!ctx) return
      this.tone(t.notes[index % t.notes.length], ctx.currentTime, t.duration, 'triangle', t.volume)
      index++
    }
    playNext()
    this.musicTimer = setInterval(playNext, t.interval * 1000)
  }
}

export const audio = new AudioEngine()
