import type { ScarePlan, Variant } from './mix'

/** A csapás (3. fázis) és a lecsengés (4.): teljes képernyős réteg, piros vignetta, opcionális rázkódás és villanás. */
export function showScare(v: Variant, plan: ScarePlan): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.className = ['nd-scare', `dir-${v.dir}`, plan.golden ? 'gold' : '', plan.flash ? 'flash' : ''].filter(Boolean).join(' ')
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = `<div class="vig"></div><div class="face">${plan.image ? v.emoji : ''}</div>`
  document.body.appendChild(el)
  if (plan.shake) document.body.classList.add('nd-shake')
  const hold = plan.golden ? 2600 : 1400
  setTimeout(() => {
    el.classList.add('out')
    document.body.classList.remove('nd-shake')
  }, hold)
  setTimeout(() => el.remove(), hold + 700)
}

/** Kamu jumpscare: a feszültség épül (halvány vignetta), de nem történik semmi. */
export function showFake(): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.className = 'nd-scare fake'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = '<div class="vig"></div>'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1600)
}
