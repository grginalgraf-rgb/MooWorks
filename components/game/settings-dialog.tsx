'use client'

import { Settings2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { type Settings, updateSettings, useSettings } from '@/lib/game/settings'
import { gameStore } from '@/lib/game/store'

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'sound', label: 'Sound effects', hint: 'Collect, sell and purchase blips' },
  { key: 'music', label: 'Music', hint: 'A gentle chiptune loop' },
  { key: 'reducedMotion', label: 'Reduced motion', hint: 'Calmer cows and no bobbing' },
  { key: 'compactNumbers', label: 'Compact numbers', hint: '12.5K instead of 12,500' },
]

export function SettingsDialog({ inGame = false }: { inGame?: boolean }) {
  const settings = useSettings()
  const [saveText, setSaveText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textId = useId()

  const exportSave = () => {
    const text = gameStore.exportSave()
    if (!text) return setMessage('There is no save to export yet.')
    setSaveText(text)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mooworks-save.json'
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Save exported. The JSON is also shown below.')
  }

  const importSave = (text: string) => {
    const ok = gameStore.importSave(text)
    setMessage(ok ? 'Save imported. Welcome back!' : 'That does not look like a MooWorks save.')
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setConfirmReset(false)
          setMessage(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant={inGame ? 'ghost' : 'outline'} size={inGame ? 'icon' : 'sm'} aria-label="Settings and save" className="min-h-9" />
        }
      >
        <Settings2 className="size-4" aria-hidden />
        {!inGame && <span>Settings</span>}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-pixel text-xl">Settings</DialogTitle>
          <DialogDescription>Preferences are stored on this device.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex min-h-11 items-center justify-between gap-4">
              <span className="flex flex-col">
                <span className="text-sm text-foreground">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.hint}</span>
              </span>
              <Switch checked={settings[t.key]} onCheckedChange={(v) => updateSettings({ [t.key]: v })} />
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-pixel text-base text-accent">Save file</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-11" onClick={exportSave}>
              Export save
            </Button>
            <Button variant="secondary" className="min-h-11" onClick={() => fileRef.current?.click()}>
              Import file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import save file"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) importSave(await file.text())
                e.target.value = ''
              }}
            />
          </div>
          <label htmlFor={textId} className="text-xs text-muted-foreground">
            Or paste save JSON
          </label>
          <textarea
            id={textId}
            value={saveText}
            onChange={(e) => setSaveText(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
          />
          <Button variant="outline" className="min-h-11 self-start" disabled={!saveText.trim()} onClick={() => importSave(saveText)}>
            Import pasted save
          </Button>
          {message && (
            <p role="status" className="text-sm text-accent">
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-pixel text-base text-destructive">Danger zone</h3>
          {confirmReset ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-foreground">Delete your saved farm permanently? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="min-h-11"
                  onClick={() => {
                    gameStore.resetSave()
                    setConfirmReset(false)
                    setMessage('Save deleted.')
                  }}
                >
                  Delete save
                </Button>
                <Button variant="outline" className="min-h-11" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="min-h-11 self-start" onClick={() => setConfirmReset(true)}>
              Reset save…
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
