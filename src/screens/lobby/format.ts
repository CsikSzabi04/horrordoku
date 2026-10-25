// A szoba-statisztika kijelzéséhez: idő (ms → m:ss / ó:pp:mm) és dátum.

/** 90000 → "1:30", 3 725 000 → "1:02:05"; hiányzó érték: "—". */
export function fmtMs(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '—'
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** ISO-idő → "2026. 10. 25." (a böngésző magyar formátuma); hiányzó érték: "—". */
export function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('hu-HU')
}
