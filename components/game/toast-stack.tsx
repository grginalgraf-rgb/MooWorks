'use client'

import { useEffect, useState } from 'react'
import { ACHIEVEMENT_MAP } from '@/lib/game/achievements'
import { gameStore } from '@/lib/game/store'
import { cn } from '@/lib/utils'

type Toast = { id: number; title: string; body?: string; tone: 'info' | 'good' | 'warn' | 'achievement' | 'hint' }

let serial = 0

export function ToastStack() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const push = (t: Omit<Toast, 'id'>, ms: number) => {
      const id = ++serial
      setToasts((list) => [...list.filter((x) => !(x.tone === 'hint' && t.tone === 'hint')), { ...t, id }].slice(-4))
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), ms)
    }
    const unsubscribe = gameStore.onEvent((e) => {
      if (e.type === 'toast') push({ title: e.title, body: e.body, tone: e.tone ?? 'info' }, 3800)
      else if (e.type === 'hint') push({ title: e.text, tone: 'hint' }, 2400)
      else if (e.type === 'achievement') {
        const a = ACHIEVEMENT_MAP[e.id]
        if (a) push({ title: `Achievement: ${a.name}`, body: a.description, tone: 'achievement' }, 4500)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-in fade-in slide-in-from-bottom-2 rounded-md border-2 bg-card px-3 py-2 shadow-lg',
            t.tone === 'good' && 'border-primary',
            t.tone === 'warn' && 'border-destructive',
            t.tone === 'achievement' && 'border-accent',
            (t.tone === 'info' || t.tone === 'hint') && 'border-border',
          )}
        >
          <p className={cn('font-pixel text-sm', t.tone === 'achievement' ? 'text-accent' : 'text-foreground')}>{t.title}</p>
          {t.body && <p className="text-xs leading-snug text-muted-foreground">{t.body}</p>}
        </div>
      ))}
    </div>
  )
}
