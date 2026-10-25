// Az Esemény-mód karaktereinek eredeti, lapos vektoros arcképei (nem a játékok hivatalos művészete): egy paraméteres emberi sablon
// (haj, arcszőr, ruha, kiegészítők) + kézzel rajzolt lények/szörnyek. A megjelenés adatai: src/content/looks.ts. 100×120-as vászon.
import { useId } from 'react'
import type { ReactNode } from 'react'
import { LOOKS, type CreatureId, type HumanLook } from '../content/looks'

/** Van-e rajzolt portré ehhez a karakterhez? */
export const hasLook = (id: string): boolean => id in LOOKS

const SHADE = 'rgba(0,0,0,.2)'

/* ------------------------------------------------------------------ ember ------------------------------------------------------------------ */

function Human({ l }: { l: HumanLook }) {
  const hair = l.hair ?? '#2a1c12'
  const style = l.style ?? 'short'
  const outfit = l.outfit ?? 'tee'
  const trim = l.trim ?? '#e8e0d0'
  const kid = !!l.kid
  const big = !!l.big
  const dy = kid ? 6 : 0 // a fej lejjebb ül a gyereknél
  const body = kid ? 'M20 120 Q20 98 50 94 Q80 98 80 120Z' : big ? 'M-4 120 Q-2 84 50 80 Q102 84 104 120Z' : 'M8 120 Q8 88 50 84 Q92 88 92 120Z'
  const by = kid ? 10 : 0 // a ruha-részletek eltolása
  const rx = kid || big ? 24 : 22

  /* hátsó haj (a test mögött) */
  const backHair: ReactNode = (() => {
    switch (style) {
      case 'long':
        return <path d="M25 52 Q20 16 50 15 Q80 16 75 52 L79 106 L21 106Z" fill={hair} />
      case 'bob':
        return <path d="M25 54 Q20 16 50 15 Q80 16 75 54 L76 74 Q50 80 24 74Z" fill={hair} />
      case 'afro':
        return <circle cx="50" cy="36" r="31" fill={hair} />
      case 'pony':
        return <path d="M70 40 Q92 44 86 78 Q82 62 72 56Z" fill={hair} />
      default:
        return null
    }
  })()

  /* elülső haj */
  const frontHair: ReactNode = (() => {
    switch (style) {
      case 'bald':
        return null
      case 'curly':
        return [34, 43, 50, 57, 66].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 22 : 26} r="10" fill={hair} />)
      case 'afro':
        return <path d="M27 46 Q24 22 50 22 Q76 22 73 46 Q64 34 50 34 Q36 34 27 46Z" fill={hair} />
      case 'mohawk':
        return (
          <>
            <path d="M28 44 Q26 22 50 22 Q74 22 72 44 Q62 32 50 32 Q38 32 28 44Z" fill="rgba(0,0,0,.28)" />
            <path d="M42 28 Q44 6 50 2 Q56 6 58 28 Q50 22 42 28Z" fill={hair} />
          </>
        )
      case 'wild':
        return <path d="M26 46 L20 24 L33 31 L33 10 L45 25 L52 4 L58 25 L69 10 L68 31 L80 24 L74 46 Q64 32 50 32 Q36 32 26 46Z" fill={hair} />
      case 'slick':
        return <path d="M27 46 Q26 15 50 15 Q74 15 73 46 Q66 27 50 25 Q34 27 27 46Z" fill={hair} />
      case 'side':
        return <path d="M26 46 Q21 17 52 17 Q80 19 74 46 Q70 31 56 29 Q40 29 26 46Z" fill={hair} />
      case 'bun':
        return (
          <>
            <circle cx="50" cy="13" r="9" fill={hair} />
            <path d="M27 48 Q24 18 50 18 Q76 18 73 48 Q64 33 50 33 Q36 33 27 48Z" fill={hair} />
          </>
        )
      default:
        return <path d="M27 48 Q24 19 50 19 Q76 19 73 48 Q64 34 50 34 Q36 34 27 48Z" fill={hair} />
    }
  })()

  /* arcszőr */
  const facial: ReactNode = (() => {
    switch (l.facial) {
      case 'beard':
        return <path d="M29 56 Q31 80 50 82 Q69 80 71 56 Q62 68 50 68 Q38 68 29 56Z" fill={hair} />
      case 'longbeard':
        return <path d="M29 56 Q26 94 50 108 Q74 94 71 56 Q62 70 50 70 Q38 70 29 56Z" fill={hair} />
      case 'stubble':
        return <path d="M29 56 Q31 80 50 82 Q69 80 71 56 Q62 68 50 68 Q38 68 29 56Z" fill={hair} opacity=".4" />
      case 'mustache':
        return <path d="M37 65 Q44 60 50 64 Q56 60 63 65 Q56 69 50 67 Q44 69 37 65Z" fill={hair} />
      case 'goatee':
        return (
          <>
            <path d="M38 65 Q44 61 50 64 Q56 61 62 65 Q56 68 50 66 Q44 68 38 65Z" fill={hair} />
            <path d="M42 72 Q50 86 58 72 Q50 77 42 72Z" fill={hair} />
          </>
        )
      default:
        return null
    }
  })()

  /* sapka */
  const hc = l.hatColor ?? '#3a3f48'
  const hat: ReactNode = (() => {
    switch (l.hat) {
      case 'cap':
        return (
          <>
            <path d="M27 44 Q26 17 50 17 Q74 17 73 44Z" fill={hc} />
            <rect x="24" y="40" width="52" height="6" rx="3" fill={SHADE} />
          </>
        )
      case 'beanie':
        return (
          <>
            <path d="M26 42 Q24 12 50 12 Q76 12 74 42Z" fill={hc} />
            <rect x="25" y="35" width="50" height="9" rx="4" fill={SHADE} />
          </>
        )
      case 'police':
        return (
          <>
            <path d="M28 38 Q28 13 50 13 Q72 13 72 38Z" fill={hc} />
            <rect x="27" y="32" width="46" height="7" fill="rgba(0,0,0,.3)" />
            <ellipse cx="50" cy="40" rx="25" ry="4.5" fill="#15151a" />
            <circle cx="50" cy="24" r="3.4" fill="#d8b230" />
          </>
        )
      case 'fedora':
        return (
          <>
            <ellipse cx="50" cy="34" rx="35" ry="7" fill={hc} />
            <path d="M31 34 Q31 11 50 11 Q69 11 69 34Z" fill={hc} />
            <rect x="31" y="28" width="38" height="5" fill="rgba(0,0,0,.35)" />
          </>
        )
      case 'hardhat':
        return (
          <>
            <path d="M26 40 Q26 11 50 11 Q74 11 74 40Z" fill={hc} />
            <rect x="46" y="9" width="8" height="31" fill="rgba(255,255,255,.25)" />
            <rect x="22" y="36" width="56" height="6" rx="3" fill={SHADE} />
          </>
        )
      case 'crown':
        return (
          <>
            <path d="M30 28 L33 10 L41 22 L50 6 L59 22 L67 10 L70 28Z" fill="#d8b230" stroke="#9a7a1a" strokeWidth="1.2" />
            <rect x="30" y="26" width="40" height="5" rx="1.5" fill="#b38f20" />
          </>
        )
      case 'wizard':
        return (
          <>
            <ellipse cx="50" cy="34" rx="34" ry="6" fill={hc} />
            <path d="M32 34 Q42 30 50 2 Q58 30 68 34Z" fill={hc} />
            <rect x="34" y="28" width="32" height="4" fill="rgba(0,0,0,.35)" />
          </>
        )
      case 'bandana':
        return <path d="M25 34 Q50 24 75 34 L76 43 Q50 33 24 43Z" fill={hc} />
      case 'headband':
        return <path d="M26 36 Q50 28 74 36 L74 41 Q50 33 26 41Z" fill={hc} />
      default:
        return null
    }
  })()

  /* ruha: a nyak mögötti (hood) és az előtti (gallér, nyakkendő) rész */
  const outfitBack: ReactNode =
    outfit === 'hoodie' ? <path d="M28 88 Q26 66 50 62 Q74 66 72 88 Q60 80 50 80 Q40 80 28 88Z" fill={l.top} stroke={SHADE} strokeWidth="1.5" /> : null

  const outfitFront: ReactNode = (() => {
    switch (outfit) {
      case 'tee':
        return <path d="M40 86 Q50 97 60 86" fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="2" />
      case 'jacket':
        return (
          <>
            <path d="M41 85 L50 112 L59 85Z" fill={trim} />
            <path d="M41 85 L35 108 M59 85 L65 108" stroke="rgba(0,0,0,.35)" strokeWidth="2" />
          </>
        )
      case 'suit':
        return (
          <>
            <path d="M40 84 L50 106 L60 84Z" fill="#f1f1ec" />
            <path d="M40 84 L33 110 L46 101Z M60 84 L67 110 L54 101Z" fill="rgba(0,0,0,.3)" />
            <path d="M48 90 L52 90 L54 112 L50 117 L46 112Z" fill={trim} />
          </>
        )
      case 'uniform':
        return (
          <>
            <path d="M39 84 L47 96 L50 86Z M61 84 L53 96 L50 86Z" fill={trim} />
            <circle cx="35" cy="101" r="4" fill="#d8b230" />
            <rect x="13" y="91" width="15" height="5" rx="2" fill={trim} />
            <rect x="72" y="91" width="15" height="5" rx="2" fill={trim} />
            {[98, 106, 114].map((y) => (
              <circle key={y} cx="50" cy={y} r="1.8" fill="rgba(0,0,0,.4)" />
            ))}
          </>
        )
      case 'hoodie':
        return (
          <>
            <path d="M44 86 L43 106 M56 86 L57 106" stroke="#e8e8e8" strokeWidth="2" strokeLinecap="round" />
            <rect x="32" y="108" width="36" height="12" rx="3" fill={SHADE} />
          </>
        )
      case 'labcoat':
        return (
          <>
            <path d="M42 84 L50 101 L58 84Z" fill={trim} />
            <path d="M38 83 L48 104 L42 110 L30 90Z M62 83 L52 104 L58 110 L70 90Z" fill="#f4f6f8" stroke="rgba(0,0,0,.25)" strokeWidth="1.2" />
          </>
        )
      case 'dress':
        return <path d="M37 85 Q50 104 63 85Z" fill={l.skin} />
      case 'turtle':
        return (
          <>
            <rect x="40" y="64" width="20" height="26" rx="6" fill={l.top} />
            <path d="M41 78 Q50 82 59 78" stroke="rgba(0,0,0,.25)" strokeWidth="1.5" fill="none" />
          </>
        )
      case 'coveralls':
        return (
          <>
            <path d="M50 86 L50 120" stroke="rgba(0,0,0,.4)" strokeWidth="2" />
            <rect x="26" y="98" width="15" height="11" rx="2" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />
            <rect x="59" y="98" width="15" height="11" rx="2" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />
            <path d="M40 84 L47 94 L50 86Z M60 84 L53 94 L50 86Z" fill={trim} />
          </>
        )
      case 'vest':
        return (
          <>
            <path d="M-4 120 L14 90 Q34 84 41 86 L45 120Z M104 120 L86 90 Q66 84 59 86 L55 120Z" fill={l.top} />
            <path d="M41 86 L50 112 L59 86" fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="2" />
          </>
        )
      case 'priest':
        return (
          <>
            <rect x="46" y="82" width="8" height="8" rx="1.5" fill={trim} />
            {[96, 104, 112].map((y) => (
              <circle key={y} cx="50" cy={y} r="1.6" fill="rgba(255,255,255,.35)" />
            ))}
          </>
        )
      case 'straitjacket':
        return (
          <>
            <path d="M8 94 L92 112 M8 112 L92 94" stroke={trim} strokeWidth="6" />
            <rect x="44" y="99" width="12" height="10" rx="2" fill="#bfc3c8" stroke="#555" />
          </>
        )
      default:
        return null
    }
  })()

  /* arc-kiegészítők */
  const extra: ReactNode = (() => {
    switch (l.extra) {
      case 'scar':
        return <path d="M59 44 L67 64 M56 52 L62 50 M60 59 L66 56" stroke="#b23a3a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      case 'blood':
        return (
          <>
            <path d="M43 30 Q43 44 45 52 M60 38 Q61 46 59 56" stroke="#b3122d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <circle cx="62" cy="62" r="3" fill="#b3122d" opacity=".85" />
            <circle cx="36" cy="60" r="2" fill="#b3122d" opacity=".8" />
          </>
        )
      case 'headset':
        return (
          <>
            <path d="M26 46 Q26 17 50 17 Q74 17 74 46" stroke="#202228" strokeWidth="3.4" fill="none" />
            <circle cx="27" cy="54" r="6.5" fill="#202228" />
            <path d="M27 60 Q33 74 46 69" stroke="#202228" strokeWidth="2.2" fill="none" />
            <circle cx="47" cy="69" r="2.6" fill="#202228" />
          </>
        )
      case 'goggles':
        return (
          <>
            <path d="M26 33 Q50 25 74 33 L74 41 Q50 33 26 41Z" fill="#2a2d34" />
            <circle cx="40" cy="35" r="6.5" fill="#e6a53a" stroke="#2a2d34" strokeWidth="2" />
            <circle cx="60" cy="35" r="6.5" fill="#e6a53a" stroke="#2a2d34" strokeWidth="2" />
          </>
        )
      case 'visor':
        return (
          <>
            <rect x="26" y="45" width="48" height="12" rx="6" fill="#d41a2a" opacity=".25" />
            <rect x="29" y="48" width="42" height="6" rx="3" fill="#ff2a3a" />
          </>
        )
      case 'horns':
        return <path d="M31 30 Q22 14 30 3 Q34 16 41 25Z M69 30 Q78 14 70 3 Q66 16 59 25Z" fill="#2a1214" />
      case 'eyepatch':
        return (
          <>
            <path d="M24 40 L74 52" stroke="#111" strokeWidth="1.6" />
            <path d="M54 45 L69 50 L66 62 L52 57Z" fill="#111" />
          </>
        )
      case 'bolt':
        return <path d="M54 30 L48 40 L54 40 L47 50" stroke="#b23a3a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      case 'stitches':
        return <path d="M60 42 L60 68 M57 46 L63 46 M57 52 L63 52 M57 58 L63 58 M57 64 L63 64" stroke="#3a2a2a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      case 'shades':
        return (
          <>
            <rect x="30" y="47" width="18" height="10" rx="4" fill="#0f0f14" />
            <rect x="52" y="47" width="18" height="10" rx="4" fill="#0f0f14" />
            <path d="M48 51 H52" stroke="#0f0f14" strokeWidth="2" />
          </>
        )
      default:
        return null
    }
  })()

  /* testen kívüli kiegészítők */
  const overlay: ReactNode = (() => {
    switch (l.extra) {
      case 'camera':
        return (
          <>
            <circle cx="76" cy="98" r="18" fill="#7cff7c" opacity=".25" />
            <rect x="60" y="90" width="28" height="18" rx="4" fill="#15171c" />
            <circle cx="74" cy="99" r="5.5" fill="#7cff7c" />
            <circle cx="74" cy="99" r="2.4" fill="#0b2a0b" />
          </>
        )
      case 'grabpack':
        return (
          <>
            <path d="M32 86 L26 120 M68 86 L74 120" stroke="#2b2b32" strokeWidth="5" />
            <circle cx="14" cy="106" r="9" fill="#d9402e" stroke="#fff" strokeWidth="1.5" />
            <circle cx="86" cy="106" r="9" fill="#2f6fe0" stroke="#fff" strokeWidth="1.5" />
          </>
        )
      case 'lamp':
        return (
          <>
            <circle cx="80" cy="98" r="22" fill="#ffd36b" opacity=".3" />
            <rect x="76" y="94" width="9" height="14" rx="2" fill="#2a2420" />
            <circle cx="80.5" cy="99" r="3.2" fill="#ffe27a" />
          </>
        )
      default:
        return null
    }
  })()

  return (
    <>
      {l.extra === 'ghost' && <ellipse cx="50" cy="62" rx="46" ry="58" fill="rgba(190,225,255,.35)" />}
      <g opacity={l.extra === 'ghost' ? 0.88 : 1}>
        <g transform={`translate(0 ${dy})`}>{backHair}</g>
        <path d={body} fill={outfit === 'labcoat' ? '#eef1f4' : outfit === 'vest' ? trim : outfit === 'straitjacket' ? '#c9c6bd' : l.top} />
        <g transform={`translate(0 ${by})`}>{outfitBack}</g>
        <rect x="42" y={kid ? 78 : 68} width="16" height="22" rx="4" fill={l.skin} />
        <rect x="42" y={kid ? 78 : 68} width="16" height="9" fill="rgba(0,0,0,.12)" />
        <g transform={`translate(0 ${by})`}>{outfitFront}</g>
        <g transform={`translate(0 ${dy})`}>
          <circle cx={50 - rx - 1} cy="54" r="5" fill={l.skin} />
          <circle cx={50 + rx + 1} cy="54" r="5" fill={l.skin} />
          <ellipse cx="50" cy="52" rx={rx} ry="26" fill={l.skin} />
          {facial}
          {frontHair}
          {hat}
          {l.glasses && (
            <g fill="none" stroke="#111" strokeWidth="2.2">
              <circle cx="41" cy="52" r="6.5" />
              <circle cx="59" cy="52" r="6.5" />
              <path d="M47.5 52 H52.5" />
            </g>
          )}
          <path d="M50 52 q-2 8 1 10" fill="none" stroke="rgba(0,0,0,.2)" strokeWidth="1.6" strokeLinecap="round" />
          {extra}
        </g>
        {overlay}
      </g>
    </>
  )
}

/* ---------------------------------------------------------------- lények ---------------------------------------------------------------- */

interface BearPalette { fur: string; dark: string; muzzle: string; ear: string; eye: 'blue' | 'hollow' }

function Bear({ p }: { p: BearPalette }) {
  return (
    <g>
      <circle cx="25" cy="31" r="13" fill={p.dark} />
      <circle cx="25" cy="31" r="7" fill={p.ear} />
      <circle cx="75" cy="31" r="13" fill={p.dark} />
      <circle cx="75" cy="31" r="7" fill={p.ear} />
      <path d="M6 120 Q6 92 50 88 Q94 92 94 120Z" fill={p.dark} />
      <ellipse cx="50" cy="57" rx="28" ry="26" fill={p.fur} />
      <ellipse cx="50" cy="69" rx="15" ry="11" fill={p.muzzle} />
      <ellipse cx="50" cy="62" rx="6" ry="3.6" fill="#1a1210" />
      <path d="M44 73 Q50 78 56 73" stroke="#1a1210" strokeWidth="1.6" fill="none" />
      {[38, 62].map((x) =>
        p.eye === 'blue' ? (
          <g key={x}>
            <circle cx={x} cy="51" r="5.4" fill="#fff" />
            <circle cx={x} cy="51" r="2.8" fill="#3b7fd9" />
          </g>
        ) : (
          <g key={x}>
            <circle cx={x} cy="51" r="6" fill="#0c0a08" />
            <circle cx={x} cy="51" r="1.4" fill="#fff" />
          </g>
        ),
      )}
      <path d="M31 44 L45 47 M69 44 L55 47" stroke={p.dark} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="50" cy="31" rx="22" ry="4.5" fill="#15151a" />
      <rect x="36" y="9" width="28" height="22" rx="2" fill="#15151a" />
      <rect x="36" y="24" width="28" height="4" fill="#3a3a44" />
      <path d="M50 93 L36 86 L36 100Z M50 93 L64 86 L64 100Z" fill="#15151a" />
      <circle cx="50" cy="93" r="3" fill="#2a2a32" />
    </g>
  )
}

function Bonnie() {
  return (
    <g>
      <ellipse cx="33" cy="22" rx="9" ry="26" fill="#5b4bb5" transform="rotate(-8 33 22)" />
      <ellipse cx="33" cy="22" rx="4.5" ry="19" fill="#8a7ad9" transform="rotate(-8 33 22)" />
      <ellipse cx="67" cy="22" rx="9" ry="26" fill="#5b4bb5" transform="rotate(8 67 22)" />
      <ellipse cx="67" cy="22" rx="4.5" ry="19" fill="#8a7ad9" transform="rotate(8 67 22)" />
      <path d="M8 120 Q10 94 50 90 Q90 94 92 120Z" fill="#4a3c9a" />
      <circle cx="50" cy="62" r="29" fill="#5b4bb5" />
      <ellipse cx="50" cy="73" rx="16" ry="11" fill="#9a8be6" />
      {[38, 62].map((x) => (
        <g key={x}>
          <circle cx={x} cy="56" r="6" fill="#fff" />
          <circle cx={x} cy="56" r="3.2" fill="#c43aa0" />
          <circle cx={x} cy="56" r="1.4" fill="#15101c" />
        </g>
      ))}
      <path d="M30 48 L45 52 M70 48 L55 52" stroke="#2f2670" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="50" cy="66" rx="5" ry="3" fill="#1a1230" />
      <path d="M45 77 Q50 81 55 77" stroke="#1a1230" strokeWidth="1.6" fill="none" />
      <path d="M50 94 L36 87 L36 101Z M50 94 L64 87 L64 101Z" fill="#d11a2a" />
      <circle cx="50" cy="94" r="3" fill="#a31220" />
    </g>
  )
}

function Marionette() {
  return (
    <g>
      <path d="M10 120 Q12 88 50 84 Q88 88 90 120Z" fill="#17171c" />
      {[96, 104, 112].map((y) => (
        <path key={y} d={`M14 ${y} H86`} stroke="#f4f4f0" strokeWidth="3" />
      ))}
      <path d="M32 40 Q30 14 50 12 Q70 14 68 40Z" fill="#17171c" />
      <ellipse cx="50" cy="54" rx="24" ry="28" fill="#f4f1ea" />
      {[39, 61].map((x) => (
        <g key={x}>
          <circle cx={x} cy="48" r="7.5" fill="#0c0c10" />
          <circle cx={x} cy="48" r="1.6" fill="#f4f1ea" />
          <path d={`M${x} 56 Q${x + (x < 50 ? -3 : 3)} 66 ${x + (x < 50 ? -1 : 1)} 74`} stroke="#0c0c10" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="31" cy="62" r="5" fill="#d9302e" />
      <circle cx="69" cy="62" r="5" fill="#d9302e" />
      <path d="M38 72 Q50 82 62 72" stroke="#0c0c10" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Chica() {
  return (
    <g>
      <path d="M6 120 Q6 92 50 88 Q94 92 94 120Z" fill="#f2c230" />
      <path d="M30 92 L70 92 L67 120 L33 120Z" fill="#f4f4f0" />
      <path d="M38 100 H62 M40 107 H60" stroke="#d9544f" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M38 34 Q34 14 41 11 Q46 20 45 33Z M47 32 Q47 8 54 5 Q58 18 54 32Z M56 33 Q60 17 68 17 Q66 28 61 35Z" fill="#f2c230" />
      <ellipse cx="50" cy="55" rx="28" ry="26" fill="#f2c230" />
      <circle cx="31" cy="64" r="5" fill="#f28fa0" opacity=".7" />
      <circle cx="69" cy="64" r="5" fill="#f28fa0" opacity=".7" />
      <path d="M33 63 Q50 52 67 63 Q62 76 50 78 Q38 76 33 63Z" fill="#f28a1e" />
      <path d="M39 74 Q50 86 61 74 Q50 77 39 74Z" fill="#d9701a" />
      {[38, 62].map((x) => (
        <g key={x}>
          <circle cx={x} cy="46" r="6.5" fill="#fff" />
          <circle cx={x} cy="46" r="3.6" fill="#a58be0" />
          <circle cx={x} cy="46" r="1.6" fill="#15101c" />
        </g>
      ))}
      <path d="M31 39 L36 42 M69 39 L64 42" stroke="#15101c" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function Foxy() {
  return (
    <g>
      <path d="M6 120 Q6 94 50 90 Q94 94 94 120Z" fill="#8a3418" />
      <path d="M20 46 L25 8 L45 31Z" fill="#9b3a1f" />
      <path d="M24 38 L27 17 L38 31Z" fill="#e8a37a" />
      <path d="M80 46 L75 8 L55 31Z" fill="#9b3a1f" />
      <path d="M76 38 L73 17 L62 31Z" fill="#e8a37a" />
      <path d="M18 52 Q50 20 82 52 Q76 84 50 94 Q24 84 18 52Z" fill="#b4451f" />
      <path d="M34 62 Q50 54 66 62 Q62 88 50 92 Q38 88 34 62Z" fill="#e8c9a0" />
      <circle cx="50" cy="85" r="3.6" fill="#15110e" />
      <path d="M42 80 L45 87 L48 80Z M52 80 L55 87 L58 80Z" fill="#fff" />
      <circle cx="37" cy="53" r="5.4" fill="#f4d03a" />
      <circle cx="37" cy="53" r="2.2" fill="#15110e" />
      <path d="M52 44 L74 50 L71 64 L50 59Z" fill="#15110e" />
      <path d="M52 47 L26 38" stroke="#15110e" strokeWidth="1.8" />
      <path d="M72 120 Q72 99 85 97 Q96 97 93 109 Q91 102 85 104 Q81 108 83 120Z" fill="#d4dbe0" stroke="#6b737a" strokeWidth="1.4" />
    </g>
  )
}

function Mouthy({ skin, lips, lashes }: { skin: string; lips: string; lashes?: boolean }) {
  return (
    <g>
      <circle cx="50" cy="54" r="34" fill={skin} />
      {[36, 64].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="42" rx="8" ry="10" fill="#fff" />
          <circle cx={x + (x < 50 ? 1.5 : -1.5)} cy="44" r="3.6" fill="#15101c" />
        </g>
      ))}
      {lashes && <path d="M26 36 L32 40 M30 30 L35 36 M74 36 L68 40 M70 30 L65 36" stroke="#15101c" strokeWidth="2" strokeLinecap="round" />}
      <path d="M13 64 Q50 112 87 64 Q50 76 13 64Z" fill={lips} />
      <path d="M15 65 L21 75 L27 67 L33 78 L39 70 L45 80 L51 71 L57 80 L63 70 L69 78 L75 67 L81 75 L85 65Z" fill="#fff" />
    </g>
  )
}

function Bunzo() {
  return (
    <g>
      <ellipse cx="33" cy="22" rx="9" ry="26" fill="#6a5bd6" transform="rotate(-8 33 22)" />
      <ellipse cx="33" cy="22" rx="4.5" ry="19" fill="#f0a5c8" transform="rotate(-8 33 22)" />
      <ellipse cx="67" cy="22" rx="9" ry="26" fill="#6a5bd6" transform="rotate(8 67 22)" />
      <ellipse cx="67" cy="22" rx="4.5" ry="19" fill="#f0a5c8" transform="rotate(8 67 22)" />
      <path d="M12 120 Q14 96 50 92 Q86 96 88 120Z" fill="#5547b8" />
      <circle cx="50" cy="64" r="28" fill="#6a5bd6" />
      {[39, 61].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="58" rx="5" ry="7" fill="#0f0c1c" />
          <circle cx={x + 1.5} cy="55" r="1.8" fill="#fff" />
        </g>
      ))}
      <circle cx="30" cy="68" r="5" fill="#f0a5c8" opacity=".8" />
      <circle cx="70" cy="68" r="5" fill="#f0a5c8" opacity=".8" />
      <path d="M46 68 L54 68 L50 73Z" fill="#f0a5c8" />
      <path d="M43 76 Q47 80 50 76 Q53 80 57 76" stroke="#0f0c1c" strokeWidth="1.8" fill="none" />
      <circle cx="14" cy="106" r="13" fill="#f4c430" stroke="#c9961a" strokeWidth="2" />
      <circle cx="86" cy="106" r="13" fill="#f4c430" stroke="#c9961a" strokeWidth="2" />
    </g>
  )
}

function Mommy() {
  return (
    <g>
      <path d="M3 30 Q-8 80 10 120 M97 14 Q112 60 92 104" stroke="#e86bb0" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M16 56 Q8 6 50 6 Q92 6 84 56 L90 104 L10 104Z" fill="#c43a86" />
      <ellipse cx="50" cy="56" rx="26" ry="30" fill="#ffb3d6" />
      {[39, 61].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="46" rx="7" ry="8.5" fill="#fff" />
          <circle cx={x} cy="47" r="4" fill="#7a3fc4" />
          <circle cx={x} cy="47" r="1.8" fill="#15101c" />
        </g>
      ))}
      <path d="M30 38 L35 42 M70 38 L65 42" stroke="#15101c" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 68 Q50 90 70 68 Q50 74 30 68Z" fill="#7a1a44" />
      <path d="M33 69 L36 75 L39 70 L43 77 L47 71 L50 78 L53 71 L57 77 L61 70 L64 75 L67 69Z" fill="#fff" />
    </g>
  )
}

function DogDay() {
  return (
    <g>
      <path d="M12 120 Q14 96 50 92 Q86 96 88 120Z" fill="#e8a01c" />
      <ellipse cx="20" cy="46" rx="11" ry="25" fill="#c8791f" transform="rotate(12 20 46)" />
      <ellipse cx="80" cy="46" rx="11" ry="25" fill="#c8791f" transform="rotate(-12 80 46)" />
      <circle cx="50" cy="57" r="30" fill="#f5b83c" />
      <ellipse cx="50" cy="69" rx="18" ry="14" fill="#fbe3a0" />
      <ellipse cx="50" cy="62" rx="6" ry="4" fill="#15101c" />
      {[39, 61].map((x) => (
        <g key={x}>
          <circle cx={x} cy="50" r="4.6" fill="#15101c" />
          <circle cx={x + 1.4} cy="48.6" r="1.5" fill="#fff" />
        </g>
      ))}
      <path d="M31 72 Q50 96 69 72" stroke="#15101c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M24 38 L18 32 M76 38 L82 32 M50 20 L50 12" stroke="#f5b83c" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function MrX() {
  return (
    <g>
      <path d="M-2 120 L4 90 Q50 76 96 90 L102 120Z" fill="#14141a" />
      <path d="M28 82 L50 114 L72 82 L64 72 L50 94 L36 72Z" fill="#26262e" />
      <rect x="42" y="62" width="16" height="24" rx="4" fill="#b2ae9e" />
      <ellipse cx="50" cy="50" rx="21" ry="27" fill="#c2beac" />
      <ellipse cx="41" cy="48" rx="6" ry="4" fill="#25252a" />
      <ellipse cx="59" cy="48" rx="6" ry="4" fill="#25252a" />
      <path d="M50 50 q-2 9 1 11 M42 70 Q50 73 58 70" stroke="rgba(0,0,0,.35)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M57 34 L65 62 M54 40 L60 38" stroke="#6b3a3a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <ellipse cx="50" cy="33" rx="36" ry="7" fill="#15151a" />
      <path d="M30 33 Q30 6 50 6 Q70 6 70 33Z" fill="#1c1c22" />
      <rect x="30" y="26" width="40" height="5" fill="#3a3a44" />
    </g>
  )
}

function Xeno() {
  return (
    <g>
      <path d="M16 120 Q20 98 50 96 Q80 98 84 120Z" fill="#101719" />
      <path d="M50 4 Q88 20 81 64 Q75 92 50 96 Q25 92 19 64 Q12 20 50 4Z" fill="#1a2326" />
      <path d="M50 8 Q60 40 56 72 M38 12 Q46 44 44 78 M63 14 Q64 44 60 76" stroke="#34464b" strokeWidth="2.2" fill="none" />
      <path d="M32 22 Q27 44 31 68" stroke="#6a8c93" strokeWidth="2" fill="none" opacity=".6" />
      <path d="M31 74 Q50 100 69 74 Q50 82 31 74Z" fill="#0c1214" />
      <path d="M35 76 L37 85 L41 78 L44 88 L47 79 L50 91 L53 79 L56 88 L59 78 L63 85 L65 76Z" fill="#cfd6dc" />
      <path d="M50 92 L50 108 M44 90 L42 102" stroke="rgba(200,230,240,.55)" strokeWidth="1.6" />
    </g>
  )
}

function Wendigo() {
  return (
    <g>
      <path d="M36 32 Q20 26 14 6 M24 24 Q14 24 6 14 M31 28 Q27 12 29 0 M64 32 Q80 26 86 6 M76 24 Q86 24 94 14 M69 28 Q73 12 71 0" stroke="#7a6a52" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M14 120 Q18 96 50 92 Q82 96 86 120Z" fill="#3a3d3a" />
      <path d="M36 94 L64 94 M38 102 L62 102 M40 110 L60 110" stroke="#5a5e5a" strokeWidth="2" />
      <path d="M26 40 Q26 22 50 22 Q74 22 74 40 Q77 64 62 84 Q50 94 38 84 Q23 64 26 40Z" fill="#a1a79f" />
      <ellipse cx="39" cy="49" rx="6.5" ry="9" fill="#0d0d0d" />
      <ellipse cx="61" cy="49" rx="6.5" ry="9" fill="#0d0d0d" />
      <circle cx="39" cy="51" r="1.6" fill="#e03a2a" />
      <circle cx="61" cy="51" r="1.6" fill="#e03a2a" />
      <path d="M47 62 L50 70 L53 62Z" fill="#2a2a2a" />
      <path d="M34 74 L38 84 L42 75 L46 86 L50 75 L54 86 L58 75 L62 84 L66 74 Q50 82 34 74Z" fill="#2a1414" stroke="#d8d4c8" strokeWidth="1" />
    </g>
  )
}

function Hunter() {
  return (
    <g>
      <path d="M-2 112 Q4 68 32 58 Q12 82 18 114Z" fill="#c4cbd1" stroke="#7a838b" strokeWidth="1.4" />
      <path d="M102 112 Q96 68 68 58 Q88 82 82 114Z" fill="#c4cbd1" stroke="#7a838b" strokeWidth="1.4" />
      <path d="M24 120 Q28 92 50 90 Q72 92 76 120Z" fill="#4a2f2a" />
      <ellipse cx="50" cy="48" rx="22" ry="28" fill="#6b4a42" />
      <path d="M30 34 Q50 26 70 34 M32 42 Q50 36 68 42" stroke="#3a2420" strokeWidth="2" fill="none" />
      <circle cx="40" cy="46" r="4.4" fill="#f2d13a" />
      <circle cx="60" cy="46" r="4.4" fill="#f2d13a" />
      <circle cx="40" cy="46" r="1.6" fill="#2a1a10" />
      <circle cx="60" cy="46" r="1.6" fill="#2a1a10" />
      <path d="M33 64 Q50 82 67 64 L61 92 Q50 85 39 92Z" fill="#2e1412" />
      <path d="M38 70 L40 77 L43 71 L46 79 L50 72 L54 79 L57 71 L60 77 L62 70Z" fill="#d8d0c0" />
    </g>
  )
}

function Isaac() {
  return (
    <g>
      <path d="M2 120 Q4 86 50 82 Q96 86 98 120Z" fill="#5d6670" />
      <ellipse cx="15" cy="97" rx="14" ry="10" fill="#7b8692" />
      <ellipse cx="85" cy="97" rx="14" ry="10" fill="#7b8692" />
      <rect x="44" y="84" width="12" height="36" rx="6" fill="#4fc3ff" opacity=".3" />
      <rect x="47" y="84" width="6" height="36" rx="3" fill="#4fc3ff" />
      <rect x="36" y="74" width="28" height="10" rx="3" fill="#4a525b" />
      <ellipse cx="50" cy="48" rx="28" ry="30" fill="#6d7782" />
      <path d="M30 43 Q50 33 70 43 Q73 66 50 70 Q27 66 30 43Z" fill="#0b1a2b" stroke="#4fc3ff" strokeWidth="1.8" />
      <path d="M36 44 Q50 38 62 44" stroke="rgba(255,255,255,.4)" strokeWidth="2" fill="none" />
      <path d="M38 22 Q50 16 62 22" stroke="#8c97a3" strokeWidth="3" fill="none" />
    </g>
  )
}

function Pyramid() {
  return (
    <g>
      <path d="M8 120 Q12 90 50 86 Q88 90 92 120Z" fill="#3a2f2c" />
      <path d="M32 90 L68 90 L74 120 L26 120Z" fill="#5b2a22" />
      <ellipse cx="42" cy="108" rx="7" ry="4" fill="#7a1f1a" />
      <ellipse cx="62" cy="100" rx="5" ry="3" fill="#7a1f1a" />
      <path d="M50 2 L90 82 L10 82Z" fill="#6f5d54" />
      <path d="M50 2 L90 82 L50 82Z" fill="#3f3430" />
      <path d="M36 30 L34 60 M62 34 L66 66 M50 18 L50 40" stroke="#8a4a2a" strokeWidth="1.6" opacity=".7" />
      {[
        [30, 70],
        [50, 76],
        [70, 70],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill="#2a2220" />
      ))}
    </g>
  )
}

function Nurse() {
  return (
    <g>
      <path d="M6 120 Q8 92 50 88 Q92 92 94 120Z" fill="#e8e4dc" />
      <path d="M18 110 Q40 98 58 112 M64 100 Q74 108 70 120" stroke="#8a1a1a" strokeWidth="4" fill="none" opacity=".75" />
      <ellipse cx="50" cy="58" rx="27" ry="29" fill="#d9a79a" />
      <circle cx="38" cy="46" r="7" fill="rgba(255,255,255,.2)" />
      <circle cx="62" cy="44" r="6" fill="rgba(255,255,255,.18)" />
      <circle cx="50" cy="68" r="8" fill="rgba(255,255,255,.16)" />
      <path d="M25 52 Q50 62 75 52 M27 66 Q50 76 73 64" stroke="#8a5a50" strokeWidth="3.2" fill="none" />
      <path d="M26 30 Q50 8 74 30 L68 38 Q50 28 32 38Z" fill="#f4f1ea" />
      <rect x="46.8" y="16" width="6.4" height="2.4" fill="#b3122d" />
      <rect x="48.8" y="14" width="2.4" height="6.4" fill="#b3122d" />
    </g>
  )
}

function Liar() {
  return (
    <g>
      <path d="M10 120 Q12 80 50 76 Q88 80 90 120Z" fill="#c98f7c" />
      <path d="M8 94 L92 112 M8 112 L92 94" stroke="#3a2a28" strokeWidth="6.5" />
      <rect x="44" y="98" width="12" height="10" rx="2" fill="#a6a39b" stroke="#444" />
      <path d="M22 90 L30 98 M70 102 L78 110 M30 114 L36 108" stroke="#8a1a1a" strokeWidth="2.4" strokeLinecap="round" />
      <g transform="rotate(9 50 62)">
        <ellipse cx="50" cy="50" rx="19" ry="23" fill="#b8806e" />
        <path d="M34 40 Q50 34 66 42 M33 52 Q50 58 67 50" stroke="#6b3a30" strokeWidth="2" fill="none" />
        <ellipse cx="42" cy="46" rx="3" ry="2" fill="#2a1410" />
        <ellipse cx="58" cy="46" rx="3" ry="2" fill="#2a1410" />
        <path d="M44 66 Q50 70 56 66" stroke="#2a1410" strokeWidth="1.8" fill="none" />
      </g>
    </g>
  )
}

function Trapper() {
  return (
    <g>
      <path d="M-6 120 Q-2 82 50 78 Q102 82 106 120Z" fill="#3d3630" />
      <path d="M28 84 L72 84 L78 120 L22 120Z" fill="#6b3a2a" />
      <path d="M18 84 L40 120 M82 84 L60 120" stroke="#202020" strokeWidth="4.4" />
      <ellipse cx="46" cy="106" rx="9" ry="5" fill="#7a1f1a" />
      <ellipse cx="62" cy="96" rx="5" ry="3" fill="#7a1f1a" />
      <path d="M40 24 Q50 6 60 24Z" fill="#7a6a58" />
      <rect x="44" y="21" width="12" height="3" rx="1" fill="#4a3a28" />
      <ellipse cx="50" cy="50" rx="25" ry="29" fill="#7a6a58" />
      <ellipse cx="40" cy="46" rx="5" ry="2.2" fill="#0a0806" />
      <ellipse cx="60" cy="46" rx="5" ry="2.2" fill="#0a0806" />
      <path d="M37 67 L63 67 M40 64 L40 70 M46 64 L46 70 M52 64 L52 70 M58 64 L58 70" stroke="#2a2018" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="64" cy="36" r="3" fill="#b3122d" opacity=".85" />
      <circle cx="34" cy="58" r="2" fill="#b3122d" opacity=".8" />
    </g>
  )
}

function Diver() {
  return (
    <g>
      <ellipse cx="50" cy="60" rx="48" ry="58" fill="rgba(63,208,192,.22)" />
      <path d="M4 120 Q6 88 50 84 Q94 88 96 120Z" fill="#3a4a50" />
      <ellipse cx="50" cy="86" rx="31" ry="7" fill="#9a7a3a" />
      {[26, 38, 50, 62, 74].map((x) => (
        <circle key={x} cx={x} cy={86 + (x === 50 ? 2 : Math.abs(x - 50) / 12)} r="1.8" fill="#5a421a" />
      ))}
      <circle cx="50" cy="52" r="31" fill="#b08a3e" />
      <path d="M28 40 Q32 24 50 21" stroke="rgba(255,255,255,.45)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="52" r="15" fill="#0f2a2f" stroke="#7a5a1e" strokeWidth="4" />
      <ellipse cx="50" cy="52" rx="9" ry="11" fill="#3fd0c0" opacity=".35" />
      <circle cx="22" cy="54" r="5" fill="#0f2a2f" stroke="#7a5a1e" strokeWidth="2.6" />
      <circle cx="78" cy="54" r="5" fill="#0f2a2f" stroke="#7a5a1e" strokeWidth="2.6" />
      <rect x="44" y="17" width="12" height="9" rx="2" fill="#7a5a1e" />
    </g>
  )
}

function Vecna() {
  return (
    <g>
      <path d="M0 40 Q20 50 14 82 M100 40 Q80 50 86 82 M8 18 Q30 40 26 62 M92 18 Q70 40 74 62 M0 90 Q18 84 22 104 M100 90 Q82 84 78 104" stroke="#2a0a12" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M14 120 Q18 92 50 88 Q82 92 86 120Z" fill="#1a1216" />
      <ellipse cx="50" cy="50" rx="23" ry="30" fill="#7a2323" />
      <path d="M34 30 Q40 44 36 62 M50 24 Q54 40 50 64 M66 30 Q60 44 64 62 M28 46 Q38 50 40 58 M72 46 Q62 50 60 58" stroke="#3a0e10" strokeWidth="2" fill="none" />
      <ellipse cx="41" cy="47" rx="5.5" ry="4" fill="#0b0506" />
      <ellipse cx="59" cy="47" rx="5.5" ry="4" fill="#0b0506" />
      <circle cx="41" cy="47" r="1.7" fill="#ff8a2a" />
      <circle cx="59" cy="47" r="1.7" fill="#ff8a2a" />
      <path d="M46 70 Q50 74 54 70" stroke="#1a0608" strokeWidth="2" fill="none" />
    </g>
  )
}

function NightKing() {
  return (
    <g>
      <path d="M12 120 Q16 92 50 88 Q84 92 88 120Z" fill="#2a3038" />
      <path d="M28 34 L31 10 L40 26 L46 4 L50 24 L54 4 L60 26 L69 10 L72 34Z" fill="#c8dcee" stroke="#8fa8be" strokeWidth="1.2" />
      <ellipse cx="50" cy="54" rx="22" ry="28" fill="#aeb9c8" />
      <path d="M34 40 Q40 52 36 64 M64 40 Q60 52 64 64" stroke="#8798ad" strokeWidth="1.6" fill="none" />
      <circle cx="41" cy="48" r="4.2" fill="#0d1620" />
      <circle cx="59" cy="48" r="4.2" fill="#0d1620" />
      <circle cx="41" cy="48" r="2" fill="#4fc3ff" />
      <circle cx="59" cy="48" r="2" fill="#4fc3ff" />
      <path d="M42 70 Q50 74 58 70" stroke="#5a6b80" strokeWidth="2" fill="none" />
    </g>
  )
}

function Meeseeks() {
  return (
    <g>
      <path d="M12 120 Q16 92 50 88 Q84 92 88 120Z" fill="#3aa6d8" />
      <ellipse cx="50" cy="54" rx="26" ry="29" fill="#4fb8e8" />
      {[38, 62].map((x) => (
        <g key={x}>
          <circle cx={x} cy="44" r="8" fill="#fff" />
          <circle cx={x} cy="45" r="3.6" fill="#15101c" />
        </g>
      ))}
      <path d="M30 62 Q50 86 70 62 Q50 70 30 62Z" fill="#0d3a52" />
      <path d="M33 63 Q50 72 67 63" stroke="#fff" strokeWidth="2.4" fill="none" />
    </g>
  )
}

function Lich() {
  return (
    <g>
      <path d="M10 120 Q14 90 50 86 Q86 90 90 120Z" fill="#1d2a22" />
      <path d="M30 34 Q24 16 34 6 Q36 20 42 30Z M70 34 Q76 16 66 6 Q64 20 58 30Z" fill="#cfd8c0" stroke="#8a9a7a" strokeWidth="1" />
      <ellipse cx="50" cy="52" rx="24" ry="29" fill="#d4dcc6" />
      <ellipse cx="40" cy="46" rx="7" ry="9" fill="#0a120c" />
      <ellipse cx="60" cy="46" rx="7" ry="9" fill="#0a120c" />
      <circle cx="40" cy="47" r="2.4" fill="#7cff5a" />
      <circle cx="60" cy="47" r="2.4" fill="#7cff5a" />
      <path d="M47 60 L50 67 L53 60Z" fill="#2a3a2a" />
      <path d="M34 74 L37 82 L41 74 L45 83 L50 74 L55 83 L59 74 L63 82 L66 74 Q50 80 34 74Z" fill="#1a1a12" stroke="#cfd8c0" strokeWidth="1" />
    </g>
  )
}

function Clicker() {
  return (
    <g>
      <path d="M14 120 Q18 94 50 90 Q82 94 86 120Z" fill="#3a342c" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="50" cy="50" rx="13" ry="30" fill="#8a6a50" stroke="#4a3a2a" strokeWidth="1.4" transform={`rotate(${a} 50 52) translate(0 -14)`} />
      ))}
      <ellipse cx="50" cy="54" rx="22" ry="26" fill="#4a4038" />
      <path d="M36 42 Q50 36 64 42 M34 56 Q50 50 66 56 M38 68 Q50 64 62 68" stroke="#2a221a" strokeWidth="2" fill="none" />
      <path d="M44 78 L48 84 L52 78 L56 84" stroke="#d8d0b8" strokeWidth="1.6" fill="none" />
    </g>
  )
}

function Voldemort() {
  return (
    <g>
      <path d="M6 120 Q8 88 50 82 Q92 88 94 120Z" fill="#101014" />
      <path d="M40 84 L50 106 L60 84" stroke="#2a2a32" strokeWidth="2" fill="none" />
      <ellipse cx="50" cy="50" rx="21" ry="29" fill="#d9d9c8" />
      <path d="M31 44 Q36 52 34 62" stroke="#a0a090" strokeWidth="1.4" fill="none" />
      <path d="M37 47 L45 49 M63 47 L55 49" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="41" cy="50" rx="3.6" ry="1.8" fill="#c01a1a" />
      <ellipse cx="59" cy="50" rx="3.6" ry="1.8" fill="#c01a1a" />
      <path d="M48 64 L48 68 M52 64 L52 68" stroke="#6a6a60" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M43 76 Q50 78 57 76" stroke="#7a7a6c" strokeWidth="1.6" fill="none" />
    </g>
  )
}

function Finn() {
  return (
    <g>
      <path d="M12 120 Q16 92 50 88 Q84 92 88 120Z" fill="#3a8ae0" />
      <path d="M62 90 L74 120 M38 90 L26 120" stroke="#3fa24a" strokeWidth="5" />
      <ellipse cx="50" cy="58" rx="19" ry="21" fill="#f0d0b0" />
      <circle cx="28" cy="30" r="9" fill="#f4f4f0" stroke="#d0d0c8" strokeWidth="1.4" />
      <circle cx="72" cy="30" r="9" fill="#f4f4f0" stroke="#d0d0c8" strokeWidth="1.4" />
      <path d="M26 56 Q22 22 50 18 Q78 22 74 56 Q64 40 50 40 Q36 40 26 56Z" fill="#f4f4f0" stroke="#d0d0c8" strokeWidth="1.4" />
      <circle cx="42" cy="58" r="2.4" fill="#15101c" />
      <circle cx="58" cy="58" r="2.4" fill="#15101c" />
      <path d="M44 68 Q50 72 56 68" stroke="#15101c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Dogish({ fur, ear, muzzle, pug }: { fur: string; ear: string; muzzle: string; pug?: boolean }) {
  return (
    <g>
      <path d="M12 120 Q14 96 50 92 Q86 96 88 120Z" fill={ear} />
      <ellipse cx="20" cy="46" rx="11" ry="25" fill={ear} transform="rotate(12 20 46)" />
      <ellipse cx="80" cy="46" rx="11" ry="25" fill={ear} transform="rotate(-12 80 46)" />
      <circle cx="50" cy="57" r="30" fill={fur} />
      <ellipse cx="50" cy="69" rx="18" ry="14" fill={muzzle} />
      <ellipse cx="50" cy="62" rx="6" ry="4" fill="#15101c" />
      {[39, 61].map((x) => (
        <g key={x}>
          <circle cx={x} cy="50" r="4.6" fill="#15101c" />
          <circle cx={x + 1.4} cy="48.6" r="1.5" fill="#fff" />
        </g>
      ))}
      <path d="M31 72 Q50 94 69 72" stroke="#15101c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {pug && <path d="M36 40 Q40 36 44 40 M56 40 Q60 36 64 40 M44 54 Q50 58 56 54" stroke="rgba(0,0,0,.35)" strokeWidth="1.8" fill="none" />}
    </g>
  )
}

function Bmo() {
  return (
    <g>
      <rect x="18" y="14" width="64" height="92" rx="9" fill="#5fd0b0" stroke="#2f9a80" strokeWidth="2.6" />
      <rect x="26" y="22" width="48" height="40" rx="5" fill="#b8f4de" stroke="#2f9a80" strokeWidth="2" />
      <circle cx="40" cy="38" r="3.2" fill="#15221e" />
      <circle cx="60" cy="38" r="3.2" fill="#15221e" />
      <path d="M40 48 Q50 56 60 48" stroke="#15221e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <rect x="28" y="70" width="18" height="5" rx="2" fill="#2f9a80" />
      <rect x="35" y="66" width="4" height="13" rx="2" fill="#2f9a80" />
      <circle cx="62" cy="72" r="4.4" fill="#d9302e" />
      <circle cx="72" cy="66" r="3.4" fill="#2f6fe0" />
      <path d="M30 90 H70" stroke="#2f9a80" strokeWidth="3.4" strokeLinecap="round" />
    </g>
  )
}

function Birdperson() {
  return (
    <g>
      <path d="M8 120 Q10 92 50 88 Q90 92 92 120Z" fill="#7a1a1a" />
      <path d="M30 34 Q34 12 50 10 Q66 12 70 34 Q60 24 50 24 Q40 24 30 34Z" fill="#6b4226" />
      <ellipse cx="50" cy="54" rx="22" ry="26" fill="#8a5a3a" />
      <path d="M30 50 Q50 40 70 50" stroke="#5a3a22" strokeWidth="2" fill="none" />
      <circle cx="40" cy="48" r="4.4" fill="#f4d03a" />
      <circle cx="60" cy="48" r="4.4" fill="#f4d03a" />
      <circle cx="40" cy="48" r="1.8" fill="#15101c" />
      <circle cx="60" cy="48" r="1.8" fill="#15101c" />
      <path d="M42 62 Q50 56 58 62 Q54 82 50 86 Q46 82 42 62Z" fill="#d9a34a" />
    </g>
  )
}

function Squanchy() {
  return (
    <g>
      <path d="M10 120 Q12 92 50 88 Q88 92 90 120Z" fill="#2fa38a" />
      <path d="M22 100 L34 112 M60 96 L74 108 M44 108 L56 116" stroke="#f4d03a" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 46 L24 14 L44 32Z M74 46 L76 14 L56 32Z" fill="#e08a3a" />
      <ellipse cx="50" cy="56" rx="26" ry="26" fill="#e08a3a" />
      <rect x="28" y="44" width="18" height="11" rx="4" fill="#0f0f14" />
      <rect x="54" y="44" width="18" height="11" rx="4" fill="#0f0f14" />
      <path d="M46 49 H54" stroke="#0f0f14" strokeWidth="2.4" />
      <path d="M46 64 L54 64 L50 69Z" fill="#f28fa0" />
      <path d="M40 72 Q50 80 60 72" stroke="#15101c" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Poopy() {
  return (
    <g>
      <path d="M14 120 Q16 94 50 90 Q84 94 86 120Z" fill="#8a6a3a" />
      <ellipse cx="50" cy="58" rx="30" ry="32" fill="#efe3c0" />
      {[38, 62].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="48" rx="7" ry="8.5" fill="#fff" stroke="#b8a878" strokeWidth="1" />
          <circle cx={x} cy="50" r="3" fill="#15101c" />
        </g>
      ))}
      <path d="M32 68 Q50 90 68 68 Q50 76 32 68Z" fill="#7a2a2a" />
      <path d="M36 69 Q50 76 64 69" stroke="#fff" strokeWidth="3" fill="none" />
    </g>
  )
}

function Lsp() {
  return (
    <g>
      <path d="M22 70 Q10 56 24 42 Q22 24 40 24 Q50 8 62 24 Q80 22 78 42 Q92 56 78 70 Q86 92 62 92 Q50 104 38 92 Q14 92 22 70Z" fill="#b08ad9" stroke="#8a64b8" strokeWidth="2" />
      <path d="M50 24 L53 31 L60 31 L55 36 L57 43 L50 39 L43 43 L45 36 L40 31 L47 31Z" fill="#f4d03a" />
      <circle cx="39" cy="55" r="5" fill="#fff" />
      <circle cx="61" cy="55" r="5" fill="#fff" />
      <circle cx="40" cy="56" r="2.4" fill="#15101c" />
      <circle cx="60" cy="56" r="2.4" fill="#15101c" />
      <path d="M42 72 Q50 66 58 72" stroke="#15101c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  )
}

function CatNap() {
  return (
    <g>
      <path d="M12 120 Q14 94 50 90 Q86 94 88 120Z" fill="#3f2a66" />
      <path d="M22 48 L24 14 L42 32Z M78 48 L76 14 L58 32Z" fill="#5a3a8a" />
      <circle cx="50" cy="58" r="29" fill="#5a3a8a" />
      <ellipse cx="50" cy="70" rx="16" ry="11" fill="#7a58b0" />
      {[39, 61].map((x) => (
        <g key={x}>
          <circle cx={x} cy="52" r="6.4" fill="#f4e24a" />
          <circle cx={x} cy="52" r="2.4" fill="#15101c" />
        </g>
      ))}
      <path d="M32 70 Q50 90 68 70" stroke="#15101c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M42 77 L45 83 L48 77 M52 77 L55 83 L58 77" fill="#fff" />
    </g>
  )
}

function Creature({ c }: { c: CreatureId }) {
  switch (c) {
    case 'freddy':
      return <Bear p={{ fur: '#7d4a24', dark: '#6b3f1f', muzzle: '#d9b183', ear: '#c9966b', eye: 'blue' }} />
    case 'goldenFreddy':
      return (
        <g transform="rotate(-9 50 72)">
          <Bear p={{ fur: '#d9a82a', dark: '#b98a1c', muzzle: '#f0d27a', ear: '#f0d27a', eye: 'hollow' }} />
        </g>
      )
    case 'chica':
      return <Chica />
    case 'bonnie':
      return <Bonnie />
    case 'marionette':
      return <Marionette />
    case 'foxy':
      return <Foxy />
    case 'huggy':
      return (
        <g>
          <circle cx="16" cy="112" r="12" fill="#f4c430" />
          <circle cx="84" cy="112" r="12" fill="#f4c430" />
          <Mouthy skin="#2f6fe0" lips="#a1121f" />
        </g>
      )
    case 'kissy':
      return (
        <g>
          <circle cx="16" cy="112" r="12" fill="#f4c430" />
          <circle cx="84" cy="112" r="12" fill="#f4c430" />
          <Mouthy skin="#ff5fa8" lips="#d4123a" lashes />
        </g>
      )
    case 'bunzo':
      return <Bunzo />
    case 'mommy':
      return <Mommy />
    case 'dogday':
      return <DogDay />
    case 'mrx':
      return <MrX />
    case 'xeno':
      return <Xeno />
    case 'wendigo':
      return <Wendigo />
    case 'hunter':
      return <Hunter />
    case 'isaac':
      return <Isaac />
    case 'pyramid':
      return <Pyramid />
    case 'nurse':
      return <Nurse />
    case 'liar':
      return <Liar />
    case 'trapper':
      return <Trapper />
    case 'diver':
      return <Diver />
    case 'vecna':
      return <Vecna />
    case 'nightking':
      return <NightKing />
    case 'meeseeks':
      return <Meeseeks />
    case 'lich':
      return <Lich />
    case 'clicker':
      return <Clicker />
    case 'voldemort':
      return <Voldemort />
    case 'finn':
      return <Finn />
    case 'jake':
      return <Dogish fur="#f3c33b" ear="#d89a1a" muzzle="#f8dc7a" />
    case 'pug':
      return <Dogish fur="#d9b47a" ear="#3a2a20" muzzle="#3a2a20" pug />
    case 'bmo':
      return <Bmo />
    case 'birdperson':
      return <Birdperson />
    case 'squanchy':
      return <Squanchy />
    case 'poopy':
      return <Poopy />
    case 'lsp':
      return <Lsp />
    case 'catnap':
      return <CatNap />
  }
}

/** Az Esemény-karakter rajzolt portréja (100×120). `null`, ha nincs hozzá megjelenés. */
/** `crop="face"`: kis (kerek) avatárhoz az arcot mutatja nagyítva. */
export function EventPortrait({ id, className, crop }: { id: string; className?: string; crop?: 'face' }) {
  const look = LOOKS[id]
  const vg = useId().replace(/[^a-zA-Z0-9]/g, '')
  if (!look) return null
  return (
    <svg className={className} viewBox="0 0 100 120" role="img" aria-label={id} preserveAspectRatio={crop === 'face' ? 'xMidYMin slice' : undefined}>
      <defs>
        <radialGradient id={`${vg}v`} cx="50%" cy="46%" r="70%">
          <stop offset=".5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".5" />
        </radialGradient>
      </defs>
      <rect width="100" height="120" fill={look.bg} />
      <rect width="100" height="120" fill={`url(#${vg}v)`} />
      {look.k === 'h' ? <Human l={look} /> : <Creature c={look.c} />}
    </svg>
  )
}
