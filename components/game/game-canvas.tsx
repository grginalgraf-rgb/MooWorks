'use client'

import { useEffect, useRef } from 'react'
import { type Hit, WorldRenderer } from '@/lib/game/canvas-renderer'
import { useSettings } from '@/lib/game/settings'
import { gameStore } from '@/lib/game/store'

type Highlight = WorldRenderer['highlight']

const sameHit = (a: Hit, b: Hit) => {
  if (!a || !b || a.kind !== b.kind) return false
  if (a.kind === 'cow' && b.kind === 'cow') return a.id === b.id
  if (a.kind === 'trough' && b.kind === 'trough') return a.resource === b.resource
  return true
}

export function GameCanvas({ highlight }: { highlight: Highlight }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WorldRenderer | null>(null)
  const { reducedMotion } = useSettings()

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const r = new WorldRenderer(canvas)
    rendererRef.current = r
    r.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'monospace'

    const sync = () => {
      const s = gameStore.getState()
      if (s) r.setState(s)
    }
    sync()
    const unsubState = gameStore.subscribe(sync)
    const unsubEvents = gameStore.onEvent((e) => r.handleEvent(e))

    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect()
      r.resize(rect.width, rect.height, Math.min(2, window.devicePixelRatio || 1))
    })
    ro.observe(wrap)

    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      r.frame(Math.min(100, t - last))
      last = t
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    let down: { hit: Hit; x: number; y: number; dragging: boolean } | null = null
    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return r.toWorld(e.clientX - rect.left, e.clientY - rect.top)
    }

    const onDown = (e: PointerEvent) => {
      const p = local(e)
      const hit = r.hitTest(p.x, p.y)
      down = { hit, x: p.x, y: p.y, dragging: false }
      if (hit?.kind === 'can') {
        const s = gameStore.getState()
        if (s && s.inventory.can > 0.05) {
          canvas.setPointerCapture(e.pointerId)
          down.dragging = true
          r.dragCan = p
        } else {
          gameStore.emit({ type: 'hint', text: 'The can is empty. Click a cow to milk her first.' })
        }
      }
    }

    const onMove = (e: PointerEvent) => {
      const p = local(e)
      if (down?.dragging) {
        r.dragCan = p
        canvas.style.cursor = 'grabbing'
        return
      }
      const hit = r.hitTest(p.x, p.y)
      r.hover = hit
      r.hoverCow = hit?.kind === 'cow' ? hit.id : null
      canvas.style.cursor = hit ? (hit.kind === 'can' ? 'grab' : 'pointer') : 'default'
    }

    const onUp = (e: PointerEvent) => {
      const p = local(e)
      const start = down
      down = null
      if (!start) return
      if (start.dragging) {
        r.dragCan = null
        canvas.style.cursor = 'grab'
        const target = r.dropTarget(p.x, p.y)
        if (target === 'market') gameStore.dispatch({ type: 'sellCan' })
        else if (target === 'tank') gameStore.dispatch({ type: 'pourCanToTank' })
        else if (Math.hypot(p.x - start.x, p.y - start.y) < 4) gameStore.emit({ type: 'hint', text: 'Drag the milk can onto the market stall to sell.' })
        else gameStore.emit({ type: 'hint', text: 'Drop the can on the market stall to sell it.' })
        return
      }
      const hit = r.hitTest(p.x, p.y)
      if (!sameHit(hit, start.hit) || !hit) return
      switch (hit.kind) {
        case 'cow':
          gameStore.dispatch({ type: 'collectCow', cowId: hit.id })
          break
        case 'station':
          gameStore.dispatch({ type: 'collectStation' })
          break
        case 'trough':
          gameStore.dispatch({ type: 'fillTrough', resource: hit.resource })
          break
        case 'truck':
          gameStore.dispatch({ type: 'dispatchTruck' })
          break
        case 'market':
          gameStore.emit({ type: 'hint', text: 'Drag your milk can here to sell it.' })
          break
      }
    }

    const onCancel = () => {
      down = null
      r.dragCan = null
    }
    const onLeave = () => {
      r.hover = null
      r.hoverCow = null
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsubState()
      unsubEvents()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.highlight = highlight
  }, [highlight])

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.reducedMotion = reducedMotion
  }, [reducedMotion])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="pixelated block size-full touch-none select-none"
        role="img"
        aria-label="Your dairy farm. Click cows to milk them and drag the milk can to the market stall. Keyboard controls are in the action bar below."
      />
    </div>
  )
}
