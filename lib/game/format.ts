export function formatNumber(n: number, compact: boolean, digits = 0): string {
  if (!Number.isFinite(n)) return '0'
  if (compact && Math.abs(n) >= 10_000) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  }
  return new Intl.NumberFormat('en', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
}

export function formatLitres(n: number, compact: boolean) {
  return `${formatNumber(n, compact, n < 100 ? 1 : 0)} L`
}

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
