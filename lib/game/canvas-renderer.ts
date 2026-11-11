import { BALANCE, BREEDS, MACHINES } from './balance'
import {
  barnCapacity,
  canCapacity,
  chilledCapacity,
  goodsCapacity,
  goodsCount,
  pasteurizedCapacity,
  rawCapacity,
  truckInterval,
} from './economy'
import { milkedCowIds } from './production'
import type { Cow, GameEvent, GameState, MachineId, MachineStatus } from './types'
import { has, level } from './upgrades'

export const WORLD_W = 400
export const WORLD_H = 240
export const GROUND_Y = 118
const BASEMENT_Y = 126

export type Rect = { x: number; y: number; w: number; h: number }
export type Hit =
  | { kind: 'cow'; id: string }
  | { kind: 'can' }
  | { kind: 'station' }
  | { kind: 'trough'; resource: 'feed' | 'water' }
  | { kind: 'market' }
  | { kind: 'tank' }
  | { kind: 'truck' }
  | null

const P = {
  sky: '#9fd4e8',
  skyLow: '#c6e6ee',
  hill: '#7fbf5a',
  hillFar: '#9ccf72',
  grass: '#79b84a',
  grassDark: '#5f9a39',
  grassLight: '#98cc62',
  dirt: '#b4864f',
  dirtDark: '#8e6538',
  fence: '#8a5a32',
  fenceLight: '#b07a46',
  barn: '#b8432f',
  barnDark: '#8a2f22',
  barnTrim: '#f3e6c8',
  roof: '#5a3a28',
  wood: '#7a5233',
  woodDark: '#4f3420',
  hay: '#e6c35a',
  hayDark: '#b8952f',
  water: '#5aa9d6',
  waterDark: '#3a7fae',
  soil: '#5a3a24',
  soilDark: '#3f2818',
  stone: '#3a2a20',
  stoneLight: '#4a372a',
  stoneDark: '#2a1d15',
  metal: '#b9c2c8',
  metalLight: '#e3e8ea',
  metalDark: '#7d888f',
  copper: '#c98a4b',
  copperDark: '#93602f',
  milk: '#fbf8ef',
  milkShade: '#e2dccb',
  cream: '#f6e3a8',
  ink: '#1f1611',
  cream2: '#f3e6c8',
  butter: '#f2c94c',
  green: '#79b84a',
  red: '#d9644a',
  gray: '#7b6d62',
  pink: '#e8a7a0',
  belt: '#2f2620',
  beltLight: '#4a3c31',
  locked: 'rgba(20,12,8,0.62)',
  cheese: '#f0c040',
  truck: '#d9644a',
  truckDark: '#a6442f',
  glass: '#2e4a58',
}

function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

function seeded(seed: number) {
  let s = seed || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

type CowVisual = {
  x: number
  y: number
  tx: number
  ty: number
  facing: 1 | -1
  anim: 'idle' | 'walk' | 'graze' | 'drink'
  timer: number
  phase: number
  bornAt: number
}

type Floater = { x: number; y: number; text: string; age: number; color: string }
type Sparkle = { x: number; y: number; age: number }

const MACHINE_RECTS: Record<MachineId, Rect> = {
  cooling: { x: 96, y: 150, w: 28, h: 50 },
  pasteurizer: { x: 130, y: 154, w: 30, h: 46 },
  homogenizer: { x: 164, y: 172, w: 16, h: 28 },
  bottler: { x: 184, y: 160, w: 36, h: 40 },
  crater: { x: 226, y: 166, w: 28, h: 34 },
  separator: { x: 262, y: 152, w: 24, h: 48 },
  cheese: { x: 292, y: 164, w: 30, h: 36 },
  yogurt: { x: 326, y: 160, w: 26, h: 40 },
}

export const MARKET_RECT: Rect = { x: 4, y: 190, w: 52, h: 46 }
export const TANK_RECT: Rect = { x: 62, y: 146, w: 28, h: 54 }
const TRUCK_BAY: Rect = { x: 356, y: 178, w: 44, h: 40 }
const FEED_TROUGH: Rect = { x: 86, y: 96, w: 20, h: 9 }
const WATER_TROUGH: Rect = { x: 86, y: 108, w: 20, h: 9 }
const CAN_HOME = { x: 70, y: 98 }
const CAN_SIZE = { w: 12, h: 15 }

function inRect(px: number, py: number, r: Rect, pad = 0) {
  return px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad
}

export class WorldRenderer {
  private ctx: CanvasRenderingContext2D
  private state: GameState | null = null
  private cows = new Map<string, CowVisual>()
  private floaters: Floater[] = []
  private sparkles: Sparkle[] = []
  private unlockFlash = new Map<string, number>()
  private truckAway = 0
  private pour = 0
  private time = 0
  private decor: { grass: { x: number; y: number; c: string }[]; flowers: { x: number; y: number; c: string }[]; stones: { x: number; y: number; w: number }[] }
  scale = 1
  offsetX = 0
  offsetY = 0
  dragCan: { x: number; y: number } | null = null
  hover: Hit = null
  hoverCow: string | null = null
  reducedMotion = false
  fontFamily = 'monospace'
  highlight: 'cow' | 'can' | 'market' | 'troughs' | null = null

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D not supported')
    this.ctx = ctx
    const rand = seeded(42)
    const grass: { x: number; y: number; c: string }[] = []
    const flowers: { x: number; y: number; c: string }[] = []
    for (let i = 0; i < 140; i++) grass.push({ x: Math.floor(rand() * WORLD_W), y: 30 + Math.floor(rand() * 84), c: rand() > 0.5 ? P.grassDark : P.grassLight })
    const flowerColors = [P.butter, '#f5f0e6', '#e889a8', '#b7a1e0']
    for (let i = 0; i < 34; i++) flowers.push({ x: 96 + Math.floor(rand() * 300), y: 36 + Math.floor(rand() * 78), c: flowerColors[Math.floor(rand() * flowerColors.length)] })
    const stones: { x: number; y: number; w: number }[] = []
    for (let row = 0; row < 12; row++) for (let col = 0; col < 16; col++) stones.push({ x: col * 26 + (row % 2) * 13 - 6, y: BASEMENT_Y + row * 10, w: 22 + Math.floor(rand() * 4) })
    this.decor = { grass, flowers, stones }
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.canvas.width = Math.round(cssW * dpr)
    this.canvas.height = Math.round(cssH * dpr)
    this.scale = Math.min(cssW / WORLD_W, cssH / WORLD_H)
    this.offsetX = (cssW - WORLD_W * this.scale) / 2
    this.offsetY = (cssH - WORLD_H * this.scale) / 2
    this.dpr = dpr
  }
  private dpr = 1

  toWorld(cssX: number, cssY: number) {
    return { x: (cssX - this.offsetX) / this.scale, y: (cssY - this.offsetY) / this.scale }
  }

  pastureBounds() {
    const s = this.state
    const lv = s ? level(s, 'pasture') : 0
    const right = Math.min(396, 262 + lv * 34)
    return { left: 112, right, top: 40, bottom: 104 }
  }

  setState(s: GameState) {
    this.state = s
    const b = this.pastureBounds()
    const ids = new Set(s.cows.map((c) => c.id))
    for (const id of this.cows.keys()) if (!ids.has(id)) this.cows.delete(id)
    for (const cow of s.cows) {
      if (this.cows.has(cow.id)) continue
      const r = seeded(hash(cow.id))
      const x = b.left + r() * (b.right - b.left - 24)
      const y = b.top + r() * (b.bottom - b.top)
      this.cows.set(cow.id, { x, y, tx: x, ty: y, facing: r() > 0.5 ? 1 : -1, anim: 'idle', timer: 1 + r() * 2, phase: r() * 10, bornAt: this.time })
    }
  }

  handleEvent(e: GameEvent) {
    switch (e.type) {
      case 'coins': {
        const at =
          e.at === 'truck' ? { x: 370, y: 172 } : e.at === 'tank' ? { x: 76, y: 140 } : e.at === 'order' ? { x: 30, y: 176 } : { x: 30, y: 184 }
        this.floaters.push({ ...at, text: `+${e.amount}`, age: 0, color: P.butter })
        break
      }
      case 'collect': {
        const v = e.cowId ? this.cows.get(e.cowId) : null
        const at = v ? { x: v.x + 10, y: v.y } : { x: 40, y: 70 }
        this.floaters.push({ ...at, text: `+${e.litres.toFixed(1)}L`, age: 0, color: P.milk })
        for (let i = 0; i < 6; i++) this.sparkles.push({ x: at.x + (Math.random() - 0.5) * 12, y: at.y + (Math.random() - 0.5) * 6, age: Math.random() * 0.2 })
        break
      }
      case 'unlock':
        this.unlockFlash.set(e.upgradeId, 1.6)
        break
      case 'truck':
        this.truckAway = 3
        break
      case 'pour':
        this.pour = 0.8
        break
      case 'cowAdded':
        break
    }
  }

  canRect(): Rect {
    const pos = this.dragCan ?? CAN_HOME
    return { x: pos.x - (this.dragCan ? CAN_SIZE.w / 2 : 0), y: pos.y - (this.dragCan ? CAN_SIZE.h / 2 : 0), ...CAN_SIZE }
  }

  hitTest(x: number, y: number): Hit {
    const s = this.state
    if (!s) return null
    if (inRect(x, y, this.canRect(), 3)) return { kind: 'can' }
    if (inRect(x, y, MARKET_RECT)) return { kind: 'market' }
    if (has(s, 'pipeline') && inRect(x, y, TANK_RECT)) return { kind: 'tank' }
    if (has(s, 'truck') && inRect(x, y, TRUCK_BAY)) return { kind: 'truck' }
    if (inRect(x, y, FEED_TROUGH, 2)) return { kind: 'trough', resource: 'feed' }
    if (inRect(x, y, WATER_TROUGH, 2)) return { kind: 'trough', resource: 'water' }
    const sorted = [...s.cows].sort((a, b) => (this.cows.get(b.id)?.y ?? 0) - (this.cows.get(a.id)?.y ?? 0))
    for (const cow of sorted) {
      const v = this.cows.get(cow.id)
      if (!v) continue
      if (inRect(x, y, { x: v.x - 1, y: v.y - 4, w: 24, h: 20 })) return { kind: 'cow', id: cow.id }
    }
    if (has(s, 'milking-machine') && inRect(x, y, { x: 14, y: 52, w: 50, h: 40 })) return { kind: 'station' }
    return null
  }

  dropTarget(x: number, y: number): 'market' | 'tank' | null {
    if (inRect(x, y, MARKET_RECT, 6)) return 'market'
    if (this.state && has(this.state, 'pipeline') && inRect(x, y, TANK_RECT, 6)) return 'tank'
    return null
  }

  cowScreenRect(id: string): Rect | null {
    const v = this.cows.get(id)
    if (!v) return null
    return { x: v.x * this.scale + this.offsetX, y: v.y * this.scale + this.offsetY, w: 22 * this.scale, h: 16 * this.scale }
  }

  private updateCows(dt: number) {
    const s = this.state
    if (!s) return
    const b = this.pastureBounds()
    for (const cow of s.cows) {
      const v = this.cows.get(cow.id)
      if (!v) continue
      v.x = Math.min(Math.max(v.x, b.left), b.right - 22)
      v.y = Math.min(Math.max(v.y, b.top), b.bottom)
      if (this.reducedMotion) {
        v.anim = 'idle'
        continue
      }
      v.timer -= dt
      if (v.anim === 'walk') {
        const dx = v.tx - v.x
        const dy = v.ty - v.y
        const dist = Math.hypot(dx, dy)
        const speed = cow.isAdult ? 9 : 12
        if (dist < 1) {
          const nearTrough = v.tx < b.left + 6
          v.anim = nearTrough ? 'drink' : Math.random() > 0.4 ? 'graze' : 'idle'
          v.timer = 2 + Math.random() * 3
        } else {
          v.x += (dx / dist) * speed * dt
          v.y += (dy / dist) * speed * dt
          v.facing = dx >= 0 ? 1 : -1
        }
      } else if (v.timer <= 0) {
        const thirsty = cow.hydration < 75 || cow.nutrition < 75
        if (thirsty && Math.random() < 0.5) {
          v.tx = b.left
          v.ty = 90 + Math.random() * 14
        } else {
          v.tx = b.left + Math.random() * (b.right - b.left - 22)
          v.ty = b.top + Math.random() * (b.bottom - b.top)
        }
        v.anim = 'walk'
        v.timer = 8
      }
    }
  }

  frame(dtMs: number) {
    const dt = Math.min(0.1, dtMs / 1000)
    this.time += dt
    this.updateCows(dt)
    this.floaters = this.floaters.filter((f) => (f.age += dt) < 1.4)
    this.sparkles = this.sparkles.filter((sp) => (sp.age += dt) < 0.7)
    for (const [k, v] of this.unlockFlash) {
      if (v - dt <= 0) this.unlockFlash.delete(k)
      else this.unlockFlash.set(k, v - dt)
    }
    this.truckAway = Math.max(0, this.truckAway - dt)
    this.pour = Math.max(0, this.pour - dt)
    this.draw()
  }

  // ---------- drawing primitives ----------
  private r(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  private text(str: string, x: number, y: number, color: string, size = 5, align: CanvasTextAlign = 'center') {
    const ctx = this.ctx
    ctx.font = `${size}px ${this.fontFamily}`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.fillStyle = P.ink
    ctx.fillText(str, x + 0.5, y + 0.5)
    ctx.fillStyle = color
    ctx.fillText(str, x, y)
  }

  private bar(x: number, y: number, w: number, frac: number, color: string) {
    this.r(x, y, w, 3, P.ink)
    this.r(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, Math.max(0, frac))), 1, color)
  }

  private statusLight(x: number, y: number, status: MachineStatus) {
    const c = status === 'running' ? P.green : status === 'blocked' ? P.red : status === 'paused' ? P.gray : P.butter
    this.r(x - 1, y - 1, 4, 4, P.ink)
    const blink = status === 'blocked' && !this.reducedMotion && Math.floor(this.time * 3) % 2 === 0
    this.r(x, y, 2, 2, blink ? P.ink : c)
  }

  private draw() {
    const ctx = this.ctx
    const s = this.state
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = P.soilDark
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    const k = this.scale * this.dpr
    ctx.setTransform(k, 0, 0, k, this.offsetX * this.dpr, this.offsetY * this.dpr)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, WORLD_W, WORLD_H)
    ctx.clip()
    this.drawPasture()
    if (s) {
      this.drawBarn(s)
      this.drawTroughs(s)
      this.drawCows(s)
    }
    this.drawGround(s)
    this.drawBasement()
    if (s) {
      this.drawPipes(s)
      this.drawMarket(s)
      this.drawRawTank(s)
      this.drawMachines(s)
      this.drawTruck(s)
      this.drawCan(s)
    }
    this.drawEffects()
    ctx.restore()
  }

  private drawPasture() {
    this.r(0, 0, WORLD_W, 14, P.sky)
    this.r(0, 14, WORLD_W, 10, P.skyLow)
    // clouds drift
    const drift = this.reducedMotion ? 0 : (this.time * 3) % (WORLD_W + 60)
    for (const [cx, cy] of [[40, 6], [190, 4], [320, 8]]) {
      const x = ((cx + drift) % (WORLD_W + 60)) - 30
      this.r(x, cy, 22, 4, '#f3f8fa')
      this.r(x + 5, cy - 3, 12, 3, '#f3f8fa')
    }
    for (let x = 0; x < WORLD_W; x += 4) {
      const h = 6 + Math.round(Math.sin(x / 37) * 4 + Math.sin(x / 13) * 2)
      this.r(x, 24 - h, 4, h, P.hillFar)
    }
    this.r(0, 22, WORLD_W, GROUND_Y - 22, P.grass)
    for (const g of this.decor.grass) {
      this.r(g.x, g.y, 1, 2, g.c)
      this.r(g.x + 2, g.y + 1, 1, 1, g.c)
    }
    // trees
    for (const tx of [104, 372]) {
      this.r(tx + 5, 18, 4, 16, P.woodDark)
      this.r(tx, 6, 14, 14, P.grassDark)
      this.r(tx + 2, 3, 10, 4, P.grassDark)
      this.r(tx + 3, 8, 4, 3, P.grassLight)
    }
    // dirt path from barn door down to cellar hatch
    this.r(26, 92, 18, GROUND_Y - 92, P.dirt)
    this.r(28, 96, 2, 1, P.dirtDark)
    this.r(38, 104, 2, 1, P.dirtDark)
  }

  private drawFence(s: GameState) {
    const b = this.pastureBounds()
    const top = 34
    const bottom = 116
    const left = 110
    const right = b.right + 2
    for (const y of [top, top + 4]) this.r(left, y, right - left, 1, P.fenceLight)
    for (let x = left; x <= right; x += 12) {
      this.r(x, top - 3, 2, 10, P.fence)
    }
    for (let y = top; y < bottom; y += 10) this.r(right, y, 2, 8, P.fence)
    for (const f of this.decor.flowers) {
      if (f.x > right - 2) continue
      this.r(f.x, f.y, 1, 1, f.c)
      this.r(f.x, f.y + 1, 1, 1, P.grassDark)
    }
    if (level(s, 'pasture') >= 4) {
      // pond for the fully expanded ranch
      this.r(330, 92, 30, 10, P.waterDark)
      this.r(332, 93, 26, 8, P.water)
      this.r(336, 95, 6, 1, '#cfeaf4')
    }
  }

  private drawBarn(s: GameState) {
    this.drawFence(s)
    const ext = level(s, 'barn')
    // barn wings grow with Barn Extension
    if (ext >= 1) {
      this.r(2, 50, 12, 42, P.barnDark)
      this.r(2, 46, 12, 4, P.roof)
    }
    const x = 12
    const w = 56
    this.r(x, 40, w, 52, P.barn)
    this.r(x, 40, w, 2, P.barnDark)
    // roof
    for (let i = 0; i < 14; i++) this.r(x - 4 + i * 2, 40 - i, w + 8 - i * 4, 1, i % 3 === 0 ? P.woodDark : P.roof)
    this.r(x + 22, 30, 12, 8, P.barnTrim)
    this.r(x + 24, 32, 8, 4, P.woodDark)
    // door
    this.r(x + 16, 62, 24, 30, P.woodDark)
    this.r(x + 17, 63, 22, 29, P.barnDark)
    this.r(x + 17, 63, 22, 1, P.barnTrim)
    this.r(x + 17, 63, 1, 29, P.barnTrim)
    this.r(x + 38, 63, 1, 29, P.barnTrim)
    if (!has(s, 'milking-machine')) {
      this.r(x + 18, 64, 20, 1, P.barnTrim)
      for (let i = 0; i < 20; i++) this.r(x + 18 + i, 64 + i * 1.4, 1, 1, P.barnTrim)
    }
    // windows show stalls added by barn extension
    for (let i = 0; i < Math.min(3, ext); i++) this.r(x + 4 + i * 0, 48 + i * 0, 0, 0, P.ink)
    this.r(x + 4, 48, 8, 8, P.ink)
    this.r(x + 5, 49, 6, 6, P.butter)
    this.r(x + 44, 48, 8, 8, P.ink)
    this.r(x + 45, 49, 6, 6, ext >= 2 ? P.butter : P.glass)
    if (ext >= 3) {
      this.r(68, 54, 14, 38, P.barnDark)
      this.r(68, 50, 14, 4, P.roof)
      this.r(71, 60, 8, 8, P.butter)
    }
    // hay bales
    this.r(4, 96, 12, 8, P.hay)
    this.r(4, 99, 12, 1, P.hayDark)
    this.r(10, 104, 12, 8, P.hay)
    this.r(10, 107, 12, 1, P.hayDark)

    // silo grows with Feed Silo levels
    const silo = level(s, 'silo')
    if (silo > 0) {
      const h = 26 + silo * 4
      this.r(84 - 0, 92 - h, 10, h, P.metal)
      this.r(85, 92 - h, 2, h, P.metalLight)
      this.r(83, 92 - h - 3, 12, 3, P.metalDark)
    }
    const tower = level(s, 'water-tower')
    if (tower > 0) {
      this.r(97, 60, 1, 32, P.woodDark)
      this.r(104, 60, 1, 32, P.woodDark)
      this.r(95, 52 - tower, 12, 9 + tower, P.water)
      this.r(95, 52 - tower, 12, 2, P.waterDark)
    }

    // milking station inside the doorway
    if (has(s, 'milking-machine')) {
      const flash = this.unlockFlash.get('milking-machine')
      this.r(x + 20, 70, 16, 20, P.metalDark)
      this.r(x + 21, 71, 14, 18, P.metal)
      const frac = s.inventory.barnBuffer / BALANCE.milking.barnBufferCapacity
      this.r(x + 23, 74, 10, 12, P.ink)
      this.r(x + 24, 75 + 10 * (1 - frac), 8, 10 * frac, P.milk)
      this.text(`${Math.round(s.inventory.barnBuffer)}L`, x + 28, 68, P.cream2, 5)
      const slots = Math.min(6, milkedCowIds(s).size)
      for (let i = 0; i < slots; i++) this.r(x + 2 + i * 3, 88, 2, 2, P.green)
      if (flash) this.flashRect({ x: x + 16, y: 62, w: 24, h: 30 }, flash)
    }
    if (this.hover?.kind === 'station') this.outline({ x: x + 16, y: 62, w: 24, h: 30 }, P.butter)
  }

  private drawTroughs(s: GameState) {
    const cap = BALANCE.troughs.capacity
    const drawTrough = (rect: Rect, frac: number, fill: string, hovered: boolean) => {
      this.r(rect.x, rect.y, rect.w, rect.h, P.woodDark)
      this.r(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 3, P.ink)
      const fh = Math.round((rect.h - 3) * Math.min(1, frac))
      this.r(rect.x + 1, rect.y + 1 + (rect.h - 3 - fh), rect.w - 2, fh, fill)
      this.r(rect.x + 2, rect.y + rect.h - 1, 2, 2, P.woodDark)
      this.r(rect.x + rect.w - 4, rect.y + rect.h - 1, 2, 2, P.woodDark)
      if (hovered || (this.highlight === 'troughs' && Math.floor(this.time * 2) % 2 === 0)) this.outline(rect, P.butter)
    }
    drawTrough(FEED_TROUGH, s.resources.feedTrough / cap, P.hay, this.hover?.kind === 'trough' && this.hover.resource === 'feed')
    drawTrough(WATER_TROUGH, s.resources.waterTrough / cap, P.water, this.hover?.kind === 'trough' && this.hover.resource === 'water')
    if (s.resources.feedTrough < 1) this.alertIcon(FEED_TROUGH.x + FEED_TROUGH.w + 2, FEED_TROUGH.y)
    if (s.resources.waterTrough < 1) this.alertIcon(WATER_TROUGH.x + WATER_TROUGH.w + 2, WATER_TROUGH.y)
  }

  private alertIcon(x: number, y: number) {
    if (!this.reducedMotion && Math.floor(this.time * 2) % 2) return
    this.r(x, y, 4, 7, P.red)
    this.r(x + 1, y + 1, 2, 3, P.cream2)
    this.r(x + 1, y + 5, 2, 1, P.cream2)
  }

  private drawCows(s: GameState) {
    const ordered = [...s.cows].sort((a, b) => (this.cows.get(a.id)?.y ?? 0) - (this.cows.get(b.id)?.y ?? 0))
    for (const cow of ordered) {
      const v = this.cows.get(cow.id)
      if (!v) continue
      this.drawCow(cow, v)
    }
  }

  private drawCow(cow: Cow, v: CowVisual) {
    const ctx = this.ctx
    const breed = BREEDS[cow.breed]
    const coat = breed.coat
    const calf = !cow.isAdult
    const t = this.time + v.phase
    const bx = Math.round(v.x)
    const by = Math.round(v.y)

    // shadow
    this.r(bx + 2, by + 14, 18, 2, 'rgba(30,50,20,0.35)')

    ctx.save()
    const scale = calf ? 0.7 : 1
    ctx.translate(bx + 11, by + (calf ? 4 : 0))
    ctx.scale(v.facing * scale, scale)
    ctx.translate(-11, 0)

    const walking = v.anim === 'walk' && !this.reducedMotion
    const step = walking ? Math.floor(t * 6) % 2 : 0
    const headDrop = v.anim === 'graze' || v.anim === 'drink' ? 3 : 0
    const chew = v.anim === 'graze' && Math.floor(t * 4) % 2 === 0 ? 1 : 0

    // legs
    const leg = (x: number, lift: number) => {
      this.r(x, 10 - lift, 2, 4, coat.shade)
      this.r(x, 13 - lift, 2, 1, P.ink)
    }
    leg(3, step)
    leg(6, 1 - step)
    leg(13, 1 - step)
    leg(16, step)

    // body
    this.r(2, 3, 16, 8, coat.base)
    this.r(2, 10, 16, 1, coat.shade)
    this.r(1, 4, 1, 6, coat.base)
    if (breed.shaggy) {
      for (let i = 2; i < 18; i += 2) this.r(i, 11, 1, 1, coat.shade)
      this.r(2, 3, 16, 1, coat.shade)
    }
    // patches, unique per cow
    const pr = seeded(hash(cow.id + 'spots'))
    const patches = breed.id === 'meadow' || breed.id === 'holstein' ? 3 : 1
    for (let i = 0; i < patches; i++) {
      const px = 3 + Math.floor(pr() * 10)
      const py = 3 + Math.floor(pr() * 4)
      this.r(px, py, 3 + Math.floor(pr() * 3), 2 + Math.floor(pr() * 2), coat.patch)
    }
    // udder
    if (!calf) this.r(8, 11, 4, 2, P.pink)

    // tail flick
    const flick = this.reducedMotion ? 0 : Math.floor(t * 1.3) % 5 === 0 ? 1 : 0
    this.r(0, 4, 1, 5 - flick, coat.shade)
    this.r(-1 + flick, 8 - flick, 2, 2, coat.patch)

    // head
    const hy = 1 + headDrop
    this.r(16, hy, 5, 7, coat.base)
    this.r(16, hy, 2, 2, coat.patch)
    this.r(19, hy + 4, 4, 3 + chew * 0, P.pink)
    this.r(21, hy + 5, 1, 1, P.ink)
    this.r(18, hy + 2, 1, 1, P.ink)
    this.r(15, hy, 2, 1, coat.shade)
    if (breed.horns) {
      this.r(16, hy - 2, 1, 2, P.cream2)
      this.r(20, hy - 2, 1, 2, P.cream2)
    }
    if (breed.shaggy) this.r(17, hy, 4, 2, coat.patch)
    if (chew) this.r(19, hy + 7, 3, 1, P.grassDark)
    ctx.restore()

    // milk ready indicator
    if (cow.isAdult && cow.milkReadyLitres >= BALANCE.cow.milkReadyIndicator) {
      const bob = this.reducedMotion ? 0 : Math.round(Math.sin(t * 3) * 1.5)
      const full = cow.milkReadyLitres >= BALANCE.cow.holdingCapacity - 0.05
      const dx = bx + 10
      const dy = by - 9 + bob
      this.r(dx, dy - 2, 2, 1, P.milk)
      this.r(dx - 1, dy - 1, 4, 3, P.milk)
      this.r(dx - 1, dy + 2, 4, 1, P.milkShade)
      this.r(dx - 2, dy, 1, 2, full ? P.butter : '#7fb6d6')
      this.r(dx + 3, dy, 1, 2, full ? P.butter : '#7fb6d6')
    }
    if (calf) this.bar(bx + 4, by - 4, 14, cow.growth / 100, P.green)
    if (this.hoverCow === cow.id || (this.highlight === 'cow' && cow.id === 'cow-1')) {
      this.text(cow.name, bx + 11, by - (cow.milkReadyLitres >= 1 ? 16 : 6), P.cream2, 5)
      if (this.highlight === 'cow' && Math.floor(this.time * 2) % 2 === 0) this.outline({ x: bx - 1, y: by - 2, w: 24, h: 18 }, P.butter)
    }
  }

  private drawGround(s: GameState | null) {
    this.r(0, GROUND_Y, WORLD_W, BASEMENT_Y - GROUND_Y, P.soil)
    this.r(0, GROUND_Y, WORLD_W, 2, P.grassDark)
    for (let x = 0; x < WORLD_W; x += 7) this.r(x + ((x * 3) % 5), GROUND_Y + 4, 2, 1, P.soilDark)
    void s
  }

  private drawBasement() {
    this.r(0, BASEMENT_Y, WORLD_W, WORLD_H - BASEMENT_Y, P.stone)
    for (const st of this.decor.stones) {
      this.r(st.x, st.y, st.w, 9, P.stoneLight)
      this.r(st.x, st.y + 8, st.w, 1, P.stoneDark)
    }
    // ceiling beam and lanterns
    this.r(0, BASEMENT_Y, WORLD_W, 4, P.woodDark)
    for (let x = 20; x < WORLD_W; x += 90) {
      this.r(x, BASEMENT_Y + 4, 1, 4, P.ink)
      this.r(x - 2, BASEMENT_Y + 8, 5, 4, P.butter)
    }
    // floor
    this.r(0, 218, WORLD_W, WORLD_H - 218, P.woodDark)
    for (let x = 0; x < WORLD_W; x += 16) this.r(x, 218, 1, WORLD_H - 218, P.ink)
    this.r(0, 218, WORLD_W, 1, P.wood)
  }

  private drawPipes(s: GameState) {
    if (!has(s, 'pipeline')) return
    // vertical pipe from barn floor into raw tank
    const px = 72
    this.r(px, 86, 4, 64, P.metalDark)
    this.r(px + 1, 86, 1, 64, P.metalLight)
    this.r(40, 86, px - 36, 4, P.metalDark)
    this.r(40, 87, px - 36, 1, P.metalLight)
    if (s.inventory.barnBuffer > 0.1 && !this.reducedMotion) {
      const off = (this.time * 30) % 8
      for (let y = 90 + off; y < 146; y += 8) this.r(px + 1, y, 2, 2, P.milk)
    }
    // header pipe linking tanks through the basement
    const unlocked = (['cooling', 'pasteurizer', 'separator', 'cheese', 'yogurt'] as MachineId[]).filter((id) => has(s, MACHINES[id].upgradeId))
    const rightmost = unlocked.length ? Math.max(...unlocked.map((id) => MACHINE_RECTS[id].x + MACHINE_RECTS[id].w / 2)) : 0
    if (rightmost) {
      this.r(76, 140, rightmost - 76, 3, P.copperDark)
      this.r(76, 140, rightmost - 76, 1, P.copper)
      for (const id of unlocked) this.r(MACHINE_RECTS[id].x + MACHINE_RECTS[id].w / 2 - 1, 142, 2, MACHINE_RECTS[id].y - 142, P.copperDark)
    }
    // conveyor belt from bottler to dispatch bay
    if (has(s, 'bottler')) {
      const end = has(s, 'truck') ? TRUCK_BAY.x : 300
      this.r(184, 204, end - 184, 5, P.belt)
      const move = this.reducedMotion || s.machines.bottler.status !== 'running' ? 0 : (this.time * 12) % 6
      for (let x = 184 + move; x < end; x += 6) this.r(x, 205, 2, 1, P.beltLight)
      for (let x = 188; x < end; x += 14) this.r(x, 209, 2, 9, P.metalDark)
    }
  }

  private drawMarket(s: GameState) {
    const m = MARKET_RECT
    const dragging = !!this.dragCan
    // counter
    this.r(m.x, m.y + 18, m.w, m.h - 18, P.wood)
    this.r(m.x, m.y + 18, m.w, 3, P.fenceLight)
    this.r(m.x + 2, m.y + 24, m.w - 4, 1, P.woodDark)
    // awning
    for (let i = 0; i < 6; i++) this.r(m.x + i * 9, m.y, 9, 7, i % 2 ? P.cream2 : P.red)
    this.r(m.x, m.y + 7, m.w, 1, P.ink)
    this.r(m.x + 2, m.y + 8, 2, 10, P.woodDark)
    this.r(m.x + m.w - 4, m.y + 8, 2, 10, P.woodDark)
    this.text('MARKET', m.x + m.w / 2, m.y + 31, P.butter, 6)
    // stock on counter
    if (s.inventory.packs > 0) for (let i = 0; i < Math.min(4, s.inventory.packs); i++) this.drawBottle(m.x + 8 + i * 4, m.y + 12)
    if (dragging || this.highlight === 'market') {
      const pulse = this.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(this.time * 6)
      this.ctx.globalAlpha = pulse
      this.outline({ x: m.x - 1, y: m.y - 1, w: m.w + 2, h: m.h + 2 }, P.butter)
      this.ctx.globalAlpha = 1
      if (dragging) this.text('DROP HERE', m.x + m.w / 2, m.y - 5, P.butter, 5)
    }
  }

  private drawTank(rect: Rect, frac: number, liquid: string, color: string, label: string) {
    this.r(rect.x, rect.y + 4, rect.w, rect.h - 4, P.metalDark)
    this.r(rect.x + 1, rect.y + 2, rect.w - 2, rect.h - 2, color)
    this.r(rect.x + 3, rect.y + 2, 2, rect.h - 4, P.metalLight)
    // sight glass
    const gx = rect.x + rect.w - 7
    const gy = rect.y + 8
    const gh = rect.h - 18
    this.r(gx, gy, 4, gh, P.ink)
    const fh = Math.round((gh - 2) * Math.min(1, Math.max(0, frac)))
    this.r(gx + 1, gy + 1 + (gh - 2 - fh), 2, fh, liquid)
    // legs
    this.r(rect.x + 2, rect.y + rect.h, 2, 218 - rect.y - rect.h, P.metalDark)
    this.r(rect.x + rect.w - 4, rect.y + rect.h, 2, 218 - rect.y - rect.h, P.metalDark)
    this.text(label, rect.x + rect.w / 2, rect.y + rect.h - 5, P.ink, 4)
  }

  private drawRawTank(s: GameState) {
    const unlocked = has(s, 'pipeline')
    if (!unlocked) {
      this.lockedSilhouette(TANK_RECT, 'RAW')
      return
    }
    this.drawTank(TANK_RECT, s.inventory.raw / Math.max(1, rawCapacity(s)), P.milk, P.metal, 'RAW')
    this.text(`${Math.round(s.inventory.raw)}L`, TANK_RECT.x + TANK_RECT.w / 2, TANK_RECT.y - 3, P.cream2, 5)
    if (this.dragCan) this.outline(TANK_RECT, P.butter)
    const f = this.unlockFlash.get('pipeline')
    if (f) this.flashRect(TANK_RECT, f)
  }

  private lockedSilhouette(rect: Rect, label: string) {
    this.r(rect.x, rect.y, rect.w, rect.h, P.locked)
    this.r(rect.x, rect.y, rect.w, 1, P.stoneDark)
    this.text(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 3, P.gray, 4)
    // padlock
    const cx = rect.x + rect.w / 2 - 2
    const cy = rect.y + rect.h / 2 + 2
    this.r(cx, cy + 2, 5, 4, P.gray)
    this.r(cx + 1, cy, 1, 2, P.gray)
    this.r(cx + 3, cy, 1, 2, P.gray)
    this.r(cx + 1, cy - 1, 3, 1, P.gray)
  }

  private drawMachines(s: GameState) {
    for (const id of Object.keys(MACHINE_RECTS) as MachineId[]) {
      const rect = MACHINE_RECTS[id]
      const def = MACHINES[id]
      const m = s.machines[id]
      if (!has(s, def.upgradeId)) {
        this.lockedSilhouette(rect, def.short)
        continue
      }
      const running = m.status === 'running' && !this.reducedMotion
      switch (id) {
        case 'cooling':
          this.drawTank(rect, s.inventory.chilled / Math.max(1, chilledCapacity(s)), '#d9eef7', '#a9c9d6', 'COOL')
          if (running) for (let i = 0; i < 3; i++) this.r(rect.x + 8 + i * 5, rect.y - 2 - ((this.time * 8 + i * 3) % 6), 1, 1, '#d9eef7')
          break
        case 'pasteurizer': {
          this.drawTank(rect, s.inventory.pasteurized / Math.max(1, pasteurizedCapacity(s)), P.milk, P.copper, 'PAST')
          // heat gauge
          this.r(rect.x + 6, rect.y + 10, 10, 10, P.ink)
          this.r(rect.x + 7, rect.y + 11, 8, 8, P.cream2)
          const a = running ? -Math.PI / 2 + Math.sin(this.time * 2) * 0.8 : Math.PI
          this.r(rect.x + 11 + Math.cos(a) * 3, rect.y + 15 + Math.sin(a) * 3, 1, 1, P.red)
          if (running) for (let i = 0; i < 3; i++) this.r(rect.x + 10 + i * 3, rect.y - ((this.time * 10 + i * 4) % 10), 2, 2, 'rgba(240,235,225,0.6)')
          break
        }
        case 'homogenizer': {
          this.r(rect.x, rect.y, rect.w, rect.h, P.metalDark)
          this.r(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, P.metal)
          const rot = running ? Math.floor(this.time * 8) % 4 : 0
          const cx = rect.x + rect.w / 2
          const cy = rect.y + 10
          this.r(cx - 4, cy - 4, 8, 8, P.ink)
          const spokes = [[0, -3], [3, 0], [0, 3], [-3, 0]]
          const [sx, sy] = spokes[rot]
          this.r(cx - 1 + sx, cy - 1 + sy, 2, 2, P.butter)
          this.r(cx - 1, cy - 1, 2, 2, P.metalLight)
          this.text(`x${level(s, 'homogenizer')}`, cx, rect.y + rect.h - 5, P.ink, 4)
          break
        }
        case 'bottler': {
          this.r(rect.x, rect.y, rect.w, rect.h - 4, P.metalDark)
          this.r(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 6, P.metal)
          this.r(rect.x + 4, rect.y + 6, rect.w - 8, 10, P.glass)
          // nozzles
          for (let i = 0; i < 3; i++) this.r(rect.x + 9 + i * 8, rect.y + 16, 2, running ? 3 + (Math.floor(this.time * 6) % 2) : 3, P.metalDark)
          const fill = m.progress
          for (let i = 0; i < 3; i++) this.drawBottle(rect.x + 8 + i * 8, rect.y + 22, m.loaded ? fill : 0)
          // bottles moving along the belt
          if (s.inventory.packs > 0 || running) {
            const count = Math.min(6, Math.ceil(s.inventory.packs))
            const end = has(s, 'truck') ? TRUCK_BAY.x - 6 : 296
            for (let i = 0; i < count; i++) {
              const bx = rect.x + rect.w + 4 + ((i * 12 + (running ? this.time * 12 : 0)) % Math.max(10, end - rect.x - rect.w - 8))
              this.drawBottle(bx, 196)
            }
          }
          this.text('BOTTLE', rect.x + rect.w / 2, rect.y + 3.5, P.ink, 4)
          break
        }
        case 'crater': {
          this.r(rect.x, rect.y, rect.w, rect.h - 4, P.wood)
          this.r(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 6, P.fenceLight)
          const lid = m.loaded ? Math.min(1, m.progress * 1.4) : 0
          this.r(rect.x + 4, rect.y + 12, 20, 12, P.woodDark)
          this.r(rect.x + 4, rect.y + 12 - (1 - lid) * 6, 20, 2, P.hay)
          for (let i = 0; i < Math.min(3, s.inventory.crates); i++) this.drawCrate(rect.x + 2 + i * 9, rect.y - 8)
          this.text('CRATE', rect.x + rect.w / 2, rect.y + 5, P.ink, 4)
          break
        }
        case 'separator': {
          this.r(rect.x + 4, rect.y, rect.w - 8, rect.h - 8, P.metalDark)
          this.r(rect.x + 5, rect.y + 1, rect.w - 10, rect.h - 10, P.metalLight)
          this.r(rect.x + 2, rect.y + rect.h - 10, rect.w - 4, 6, P.metal)
          // split pipes: cream and skim
          this.r(rect.x - 2, rect.y + 20, 6, 2, P.cream)
          this.r(rect.x + rect.w - 4, rect.y + 26, 6, 2, P.milk)
          if (running) this.r(rect.x + rect.w / 2 - 1, rect.y + 6 + (Math.floor(this.time * 10) % 4), 2, 2, P.cream)
          this.text(`${Math.round(s.inventory.cream)}`, rect.x + 2, rect.y + 16, P.cream, 4, 'left')
          this.text('CREAM', rect.x + rect.w / 2, rect.y + rect.h - 2, P.cream2, 4)
          break
        }
        case 'cheese': {
          this.r(rect.x, rect.y + 6, rect.w, rect.h - 10, P.copperDark)
          this.r(rect.x + 1, rect.y + 7, rect.w - 2, rect.h - 12, P.copper)
          this.r(rect.x + 3, rect.y + 6, rect.w - 6, 4, m.loaded ? P.cream : P.ink)
          // stirring paddle
          const sx = running ? Math.round(Math.sin(this.time * 3) * 8) : 0
          this.r(rect.x + rect.w / 2 + sx, rect.y - 4, 2, 12, P.woodDark)
          this.r(rect.x + 2, rect.y - 4, rect.w - 4, 1, P.metalDark)
          for (let i = 0; i < Math.min(3, s.inventory.cheese); i++) this.drawCheese(rect.x + 2 + i * 10, rect.y + rect.h - 2)
          this.text('VAT', rect.x + rect.w / 2, rect.y + 18, P.ink, 4)
          break
        }
        case 'yogurt': {
          this.r(rect.x, rect.y, rect.w, rect.h - 4, P.metalDark)
          this.r(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 6, '#e9d6e8')
          this.r(rect.x + 3, rect.y + 6, rect.w - 6, 8, P.glass)
          const cups = m.loaded ? Math.ceil(m.progress * 4) : 0
          for (let i = 0; i < 4; i++) {
            this.r(rect.x + 3 + i * 5, rect.y + 22, 4, 5, i < cups ? P.milk : P.stoneLight)
            this.r(rect.x + 3 + i * 5, rect.y + 22, 4, 1, i < cups ? '#e889a8' : P.stoneLight)
          }
          this.text(`fruit ${Math.floor(s.inventory.fruit)}`, rect.x + rect.w / 2, rect.y + 32, P.ink, 4)
          this.text('YOGURT', rect.x + rect.w / 2, rect.y + 3.5, P.ink, 4)
          break
        }
      }
      if (def.kind === 'batch' && m.loaded) this.bar(rect.x, rect.y + rect.h + 1, rect.w, m.progress, P.butter)
      this.statusLight(rect.x + rect.w - 4, rect.y + 2, m.status)
      const f = this.unlockFlash.get(def.upgradeId)
      if (f) this.flashRect(rect, f)
    }
  }

  private drawBottle(x: number, y: number, fill = 1) {
    this.r(x, y, 3, 7, P.ink)
    this.r(x + 1, y - 2, 1, 2, P.ink)
    this.r(x + 1, y + 1 + 5 * (1 - fill), 1, 5 * fill, P.milk)
    this.r(x + 1, y - 2, 1, 1, P.red)
  }

  private drawCrate(x: number, y: number) {
    this.r(x, y, 8, 7, P.woodDark)
    this.r(x + 1, y + 1, 6, 5, P.fenceLight)
    this.r(x + 1, y + 3, 6, 1, P.woodDark)
  }

  private drawCheese(x: number, y: number) {
    this.r(x, y - 4, 8, 4, P.copperDark)
    this.r(x, y - 5, 8, 2, P.cheese)
  }

  private drawTruck(s: GameState) {
    const bay = TRUCK_BAY
    // dispatch bay door
    this.r(bay.x, bay.y - 4, bay.w, bay.h + 4, P.stoneDark)
    this.r(bay.x, bay.y - 4, bay.w, 2, P.butter)
    for (let i = 0; i < 6; i++) this.r(bay.x + i * 8, bay.y - 2, 4, 1, P.ink)
    if (!has(s, 'truck')) {
      this.lockedSilhouette({ x: bay.x + 4, y: bay.y + 4, w: bay.w - 8, h: bay.h - 8 }, 'TRUCK')
      return
    }
    const away = this.truckAway
    const leaving = away > 0 ? Math.min(1, (3 - away) / 1.2) : 0
    const back = away > 0 && away < 1 ? 1 - away : 0
    const tx = bay.x + 2 + (away > 0 ? leaving * 50 - back * 50 : 0)
    const ty = bay.y + 12
    // cargo box
    this.r(tx, ty, 26, 16, P.cream2)
    this.r(tx, ty + 15, 26, 1, P.ink)
    this.text('MOO', tx + 13, ty + 6, P.red, 5)
    const cargo = goodsCount(s) / Math.max(1, goodsCapacity(s))
    this.r(tx + 2, ty + 11, 22, 2, P.ink)
    this.r(tx + 2, ty + 11, 22 * Math.min(1, cargo), 2, P.green)
    // cab
    this.r(tx + 26, ty + 4, 12, 12, P.truck)
    this.r(tx + 28, ty + 6, 7, 5, P.glass)
    this.r(tx + 26, ty + 15, 12, 1, P.truckDark)
    // wheels
    for (const wx of [tx + 4, tx + 18, tx + 30]) {
      this.r(wx, ty + 16, 5, 5, P.ink)
      this.r(wx + 2, ty + 18, 1, 1, P.gray)
    }
    const frac = s.truckTimer / truckInterval(s)
    this.bar(bay.x + 2, bay.y + bay.h + 2, bay.w - 4, frac, frac >= 1 ? P.green : P.butter)
    const f = this.unlockFlash.get('truck')
    if (f) this.flashRect(bay, f)
  }

  private drawCan(s: GameState) {
    const rect = this.canRect()
    const frac = s.inventory.can / canCapacity(s)
    const x = Math.round(rect.x)
    const y = Math.round(rect.y)
    if (this.dragCan) this.r(x + 1, y + rect.h, rect.w, 2, 'rgba(0,0,0,0.35)')
    // can body
    this.r(x + 3, y, 6, 2, P.metalDark)
    this.r(x + 2, y + 2, 8, 2, P.metal)
    this.r(x, y + 4, 12, 11, P.metalDark)
    this.r(x + 1, y + 4, 10, 10, P.metal)
    this.r(x + 2, y + 5, 2, 8, P.metalLight)
    // fill window
    this.r(x + 6, y + 5, 4, 9, P.ink)
    const fh = Math.round(8 * Math.min(1, frac))
    this.r(x + 7, y + 5 + (9 - fh) - 1 + 1, 2, fh, P.milk)
    // handles
    this.r(x - 1, y + 6, 1, 3, P.metalDark)
    this.r(x + 12, y + 6, 1, 3, P.metalDark)
    this.text(`${s.inventory.can.toFixed(1)}L`, x + 6, y + rect.h + 4, P.cream2, 5)
    const pulse = (this.highlight === 'can' || this.hover?.kind === 'can') && !this.dragCan
    if (pulse && (this.reducedMotion || Math.floor(this.time * 2) % 2 === 0)) this.outline({ x: x - 2, y: y - 2, w: rect.w + 4, h: rect.h + 4 }, P.butter)
    if (this.pour > 0 && !this.reducedMotion) {
      for (let i = 0; i < 4; i++) this.r(MARKET_RECT.x + 24, MARKET_RECT.y + 4 + i * 3 + ((this.time * 30) % 3), 2, 2, P.milk)
    }
  }

  private outline(rect: Rect, color: string) {
    const ctx = this.ctx
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(rect.x) + 0.5, Math.round(rect.y) + 0.5, Math.round(rect.w), Math.round(rect.h))
  }

  private flashRect(rect: Rect, remaining: number) {
    const ctx = this.ctx
    ctx.globalAlpha = Math.min(0.55, remaining / 2)
    this.r(rect.x, rect.y, rect.w, rect.h, P.butter)
    ctx.globalAlpha = 1
    this.outline({ x: rect.x - 2, y: rect.y - 2, w: rect.w + 4, h: rect.h + 4 }, P.butter)
  }

  private drawEffects() {
    for (const sp of this.sparkles) {
      const a = 1 - sp.age / 0.7
      this.ctx.globalAlpha = a
      this.r(sp.x, sp.y - sp.age * 10, 1, 1, P.milk)
    }
    this.ctx.globalAlpha = 1
    for (const f of this.floaters) {
      const a = 1 - f.age / 1.4
      this.ctx.globalAlpha = Math.max(0, a)
      this.text(f.text, f.x, f.y - (this.reducedMotion ? 0 : f.age * 14), f.color, 7)
    }
    this.ctx.globalAlpha = 1
    void barnCapacity
  }
}
