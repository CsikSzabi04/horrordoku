import type { ReactElement, ReactNode } from 'react'

/**
 * Rajzolt (SVG) tárgyjelek azokhoz a tárgyakhoz, ahol nincs olyan emoji, ami tényleg azt ábrázolja, aminek a neve (a torta nem „party-asztal",
 * a pizza nem „pizzasütő", a fehér kör nem „ajtógomb"). Egységes stílus: 64×64, sötét körvonal, lágy árnyék.
 */
const L = '#2a1a10'
const wood = '#c68a50'
const woodD = '#8a5a2c'
const metal = '#9aa3ad'
const metalD = '#5a606a'

const svg = (children: ReactNode, shadow = true): ReactElement => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    {shadow && <ellipse cx="32" cy="59" rx="22" ry="3" fill="rgba(0,0,0,.25)" />}
    <g stroke={L} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      {children}
    </g>
  </svg>
)

const tableTop = (fill: string): ReactNode => (
  <>
    <rect x="9" y="30" width="6" height="25" fill={woodD} />
    <rect x="49" y="30" width="6" height="25" fill={woodD} />
    <rect x="4" y="22" width="56" height="9" rx="2" fill={fill} />
  </>
)

const door = (fill: string, mark: ReactNode): ReactElement =>
  svg(
    <>
      <rect x="14" y="6" width="36" height="52" rx="3" fill={fill} />
      <rect x="19" y="11" width="26" height="22" rx="2" fill="rgba(0,0,0,.28)" />
      {mark}
      <circle cx="44" cy="42" r="2.4" fill="#f1d27a" />
    </>,
  )

const portal = (color: string): ReactElement =>
  svg(
    <>
      <ellipse cx="32" cy="32" rx="19" ry="25" fill="rgba(0,0,0,.35)" />
      <ellipse cx="32" cy="32" rx="19" ry="25" fill="none" stroke={color} strokeWidth="6" />
      <ellipse cx="32" cy="32" rx="11" ry="17" fill={color} opacity=".35" stroke="none" />
      <path d="M24 22 C34 24 38 34 30 44" fill="none" stroke="#fff" strokeWidth="2" opacity=".8" />
    </>,
  )

export const DRAWN: Record<string, () => ReactElement> = {
  table: () => svg(<>{tableTop(wood)}</>),
  partytable: () =>
    svg(
      <>
        <path d="M12 36 V55 M52 36 V55" stroke={woodD} strokeWidth="4" fill="none" />
        <rect x="23" y="12" width="18" height="11" rx="2" fill="#f7b6d2" />
        <rect x="31" y="6" width="2.5" height="6" fill="#ffd34d" />
        <circle cx="32" cy="5.5" r="2" fill="#ff8a00" stroke="none" />
        <path d="M4 23 H60 L56 36 H8Z" fill="#e0373f" />
        <path d="M17 23 L15 36 M32 23 V36 M47 23 L49 36" stroke="#fff" strokeWidth="3" fill="none" />
      </>,
    ),
  desk: () =>
    svg(
      <>
        <path d="M13 34 V54 M51 34 V54" stroke={woodD} strokeWidth="4" fill="none" />
        <rect x="18" y="44" width="28" height="5" rx="1" fill="#9a6b3a" />
        <path d="M8 22 H56 L52 34 H12Z" fill="#d9a36a" />
        <path d="M16 27 H40" stroke="#fff" strokeWidth="2" opacity=".7" fill="none" />
      </>,
    ),
  officedesk: () =>
    svg(
      <>
        <rect x="6" y="26" width="19" height="29" fill={woodD} />
        <rect x="49" y="26" width="6" height="29" fill={woodD} />
        <path d="M11 33 H20 M11 40 H20 M11 47 H20" stroke="#f1d27a" strokeWidth="2.5" fill="none" />
        <rect x="4" y="20" width="56" height="7" rx="2" fill="#a06a3a" />
        <rect x="30" y="6" width="18" height="13" rx="1.5" fill="#2b3340" />
        <rect x="33" y="9" width="12" height="7" fill="#7fd6ff" stroke="none" />
      </>,
    ),
  counter: () =>
    svg(
      <>
        <rect x="6" y="28" width="52" height="27" fill={woodD} />
        <path d="M23 30 V53 M41 30 V53" stroke="#5a381a" strokeWidth="2" fill="none" />
        <rect x="4" y="21" width="56" height="8" rx="2" fill="#d9b27c" />
        <rect x="45" y="6" width="6" height="15" rx="2" fill="#2f8f3e" />
        <path d="M16 20 L19 10 H27 L30 20Z" fill="#cfe9f7" />
      </>,
    ),
  reception: () =>
    svg(
      <>
        <rect x="6" y="28" width="52" height="27" fill="#6b4a8a" />
        <path d="M23 30 V53 M41 30 V53" stroke="#3d2a52" strokeWidth="2" fill="none" />
        <rect x="4" y="21" width="56" height="8" rx="2" fill="#d9b27c" />
        <path d="M22 21 A10 10 0 0 1 42 21Z" fill="#f1c232" />
        <rect x="30" y="8" width="4" height="4" fill="#f1c232" />
      </>,
    ),
  register: () =>
    svg(
      <>
        <rect x="8" y="27" width="48" height="26" rx="3" fill="#7d8590" />
        <rect x="14" y="9" width="24" height="18" rx="2" fill="#2b3340" />
        <rect x="17" y="12" width="18" height="8" fill="#7dff9c" stroke="none" />
        <g fill="#e9eef5" strokeWidth="1">
          <rect x="13" y="32" width="8" height="5" />
          <rect x="24" y="32" width="8" height="5" />
          <rect x="35" y="32" width="8" height="5" />
          <rect x="46" y="32" width="6" height="5" />
        </g>
        <rect x="12" y="43" width="40" height="6" fill="#4d535c" />
      </>,
    ),
  bonsai: () =>
    svg(
      <>
        <path d="M32 46 C30 38 36 34 32 26" stroke="#5a3a1c" strokeWidth="4" fill="none" />
        <circle cx="23" cy="24" r="9" fill="#3fa34d" />
        <circle cx="39" cy="22" r="10" fill="#58c265" />
        <circle cx="31" cy="13" r="8" fill="#2f8f3e" />
        <path d="M14 46 H50 L45 58 H19Z" fill="#8f5a3a" />
      </>,
    ),
  fridge: () =>
    svg(
      <>
        <rect x="15" y="5" width="34" height="52" rx="4" fill="#e9f2f8" />
        <path d="M15 22 H49" fill="none" />
        <path d="M43 11 V18 M43 28 V40" stroke={metalD} strokeWidth="3" fill="none" />
        <path d="M21 10 L25 14" stroke="#9fd6f2" strokeWidth="2" fill="none" />
      </>,
    ),
  stove: () =>
    svg(
      <>
        <rect x="8" y="16" width="48" height="39" rx="3" fill="#aab1ba" />
        <ellipse cx="22" cy="22" rx="8" ry="3" fill="#2b2b30" />
        <ellipse cx="42" cy="22" rx="8" ry="3" fill="#2b2b30" />
        <rect x="14" y="32" width="36" height="17" rx="2" fill="#3a3f48" />
        <path d="M14 29 H50" stroke="#fff" strokeWidth="3" fill="none" />
        <path d="M22 15 C18 11 24 9 22 4 C28 9 28 13 22 15Z" fill="#ff8a00" stroke="none" />
      </>,
    ),
  board: () =>
    svg(
      <>
        <path d="M14 46 L10 58 M50 46 L54 58" stroke={woodD} strokeWidth="3" fill="none" />
        <rect x="4" y="8" width="56" height="38" rx="2" fill="#a9743f" />
        <rect x="8" y="12" width="48" height="30" fill="#2f5d3a" />
        <path d="M13 21 H34 M13 29 H46 M13 36 H28" stroke="#f1f1e6" strokeWidth="2.2" fill="none" />
        <rect x="8" y="43" width="48" height="3" fill="#8a5a2c" />
      </>,
    ),
  seesaw: () =>
    svg(
      <>
        <path d="M32 32 L21 55 H43Z" fill="#d1162f" />
        <path d="M6 44 L58 20" stroke={wood} strokeWidth="8" fill="none" />
        <circle cx="12" cy="38" r="3" fill="#f1b81c" />
        <circle cx="52" cy="24" r="3" fill="#f1b81c" />
      </>,
    ),
  sandbox: () =>
    svg(
      <>
        <rect x="5" y="28" width="54" height="26" rx="2" fill="#a9743f" />
        <rect x="10" y="32" width="44" height="17" fill="#f4d98a" stroke="none" />
        <path d="M38 29 H50 L48 41 H40Z" fill="#2f7de1" />
        <path d="M44 29 V20 L52 24" stroke="#d1162f" strokeWidth="2" fill="none" />
      </>,
    ),
  lounger: () =>
    svg(
      <>
        <path d="M22 40 L18 55 M52 40 L56 55" stroke={woodD} strokeWidth="3.5" fill="none" />
        <path d="M8 16 L30 36" stroke="#2f7de1" strokeWidth="9" fill="none" />
        <path d="M30 36 H58" stroke="#2f7de1" strokeWidth="9" fill="none" />
        <path d="M14 19 L34 37 M42 36 V37 M48 36 V37" stroke="#fff" strokeWidth="2" fill="none" opacity=".8" />
      </>,
    ),
  stool: () =>
    svg(
      <>
        <rect x="30" y="24" width="4" height="30" fill={metal} />
        <ellipse cx="32" cy="43" rx="12" ry="3" fill="none" stroke={metal} strokeWidth="3" />
        <ellipse cx="32" cy="56" rx="13" ry="3" fill={metalD} />
        <ellipse cx="32" cy="20" rx="17" ry="7" fill="#c0392b" />
      </>,
    ),
  oven: () =>
    svg(
      <>
        <path d="M5 55 V36 C5 12 59 12 59 36 V55Z" fill="#b5532f" />
        <path d="M9 30 H55 M7 41 H57 M15 21 H49" stroke="#7a2f18" strokeWidth="1.5" fill="none" />
        <path d="M21 55 V41 C21 28 43 28 43 41 V55Z" fill="#1d1208" />
        <path d="M32 55 C25 49 34 45 32 38 C41 45 41 51 32 55Z" fill="#ff9a1a" stroke="none" />
      </>,
    ),
  bakeoven: () =>
    svg(
      <>
        <path d="M5 55 V36 C5 12 59 12 59 36 V55Z" fill="#c9783f" />
        <path d="M9 30 H55 M7 41 H57 M15 21 H49" stroke="#8a4a22" strokeWidth="1.5" fill="none" />
        <path d="M21 55 V41 C21 28 43 28 43 41 V55Z" fill="#1d1208" />
        <ellipse cx="32" cy="50" rx="7" ry="4" fill="#ffd34d" stroke="none" />
        <rect x="26" y="8" width="12" height="9" fill="#8a4a22" />
      </>,
    ),
  doorbtn: () =>
    svg(
      <>
        <rect x="12" y="7" width="40" height="50" rx="4" fill={metalD} />
        <circle cx="32" cy="28" r="13" fill="#d1162f" stroke="#7a0d1b" strokeWidth="3" />
        <path d="M25 22 C28 18 34 18 37 21" stroke="#fff" strokeWidth="2.5" fill="none" opacity=".8" />
        <circle cx="32" cy="49" r="3.5" fill="#7dff9c" />
      </>,
    ),
  toybox: () =>
    svg(
      <>
        <rect x="14" y="14" width="12" height="13" fill="#2f7de1" />
        <rect x="28" y="9" width="12" height="18" fill="#f1c232" />
        <circle cx="48" cy="21" r="6" fill="#58c265" />
        <rect x="7" y="27" width="50" height="28" rx="3" fill="#ff7eb6" />
        <rect x="7" y="27" width="50" height="8" fill="#c0357a" />
        <path d="M32 40 L34 45 L39 45 L35 48 L36 53 L32 50 L28 53 L29 48 L25 45 L30 45Z" fill="#fff6a0" strokeWidth="1" />
      </>,
    ),
  blocks: () =>
    svg(
      <>
        <rect x="6" y="36" width="24" height="20" fill="#2f7de1" />
        <rect x="32" y="36" width="24" height="20" fill="#d1162f" />
        <rect x="16" y="16" width="24" height="20" fill="#f1c232" />
        <rect x="26" y="4" width="16" height="12" fill="#58c265" />
        <path d="M14 46 H22 M40 46 H48" stroke="#fff" strokeWidth="2.5" fill="none" />
      </>,
    ),
  conveyor: () =>
    svg(
      <>
        <rect x="22" y="20" width="22" height="18" fill={wood} />
        <path d="M33 20 V38" fill="none" />
        <rect x="3" y="38" width="58" height="12" rx="6" fill="#3b3f47" />
        <g fill={metal}>
          <circle cx="11" cy="44" r="3.5" />
          <circle cx="24" cy="44" r="3.5" />
          <circle cx="37" cy="44" r="3.5" />
          <circle cx="50" cy="44" r="3.5" />
        </g>
        <path d="M12 50 V57 M52 50 V57" stroke={metalD} strokeWidth="3" fill="none" />
      </>,
    ),
  panel: () =>
    svg(
      <>
        <rect x="9" y="6" width="46" height="52" rx="4" fill={metalD} />
        <g fill="#58e07a" strokeWidth="1.5">
          <rect x="21" y="26" width="22" height="19" rx="5" />
          <rect x="20" y="15" width="4.5" height="14" rx="2.2" />
          <rect x="26" y="12" width="4.5" height="17" rx="2.2" />
          <rect x="32" y="13" width="4.5" height="16" rx="2.2" />
          <rect x="38" y="17" width="4.5" height="12" rx="2.2" />
        </g>
      </>,
    ),
  doorSpade: () => door('#7a4e26', <text x="32" y="29" textAnchor="middle" fontSize="20" fill="#fff" stroke="none">♠</text>),
  doorDiamond: () => door('#7a4e26', <text x="32" y="29" textAnchor="middle" fontSize="20" fill="#ff5a5a" stroke="none">♦</text>),
  doorCircle: () => door('#7a4e26', <circle cx="32" cy="22" r="7" fill="none" stroke="#fff" strokeWidth="3" />),
  doorGreen: () => portal('#2fd36b'),
  doorBlue: () => portal('#2f9bff'),
  doorOrange: () => portal('#ff8a00'),
  airlock: () =>
    svg(
      <>
        <circle cx="32" cy="32" r="25" fill={metal} />
        <circle cx="32" cy="32" r="18" fill={metalD} />
        <path d="M32 15 V49 M15 32 H49" stroke="#f1c232" strokeWidth="4" fill="none" />
        <circle cx="32" cy="32" r="5" fill="#f1c232" />
      </>,
    ),
  flamer: () =>
    svg(
      <>
        <rect x="12" y="6" width="40" height="52" rx="3" fill="#c0302b" />
        <rect x="18" y="12" width="28" height="24" fill="#2b3340" />
        <path d="M32 33 C23 27 34 23 32 14 C43 23 43 29 32 33Z" fill="#ff9a1a" stroke="none" />
        <rect x="18" y="43" width="28" height="7" fill="#f1c232" />
      </>,
    ),
  cryopod: () =>
    svg(
      <>
        <rect x="14" y="52" width="36" height="6" fill={metalD} />
        <rect x="16" y="5" width="32" height="49" rx="14" fill="#8fd0f2" />
        <rect x="21" y="11" width="22" height="36" rx="10" fill="#d8f1fb" stroke="none" />
        <path d="M26 20 L38 20 M26 30 L38 30" stroke="#8fd0f2" strokeWidth="2" fill="none" />
      </>,
    ),
  vent: () =>
    svg(
      <>
        <rect x="9" y="9" width="46" height="46" fill={metal} />
        <path d="M13 19 H51 M13 27 H51 M13 35 H51 M13 43 H51" stroke="#3a3f48" strokeWidth="4" fill="none" />
        <g fill="#e9eef5" strokeWidth="1">
          <circle cx="13" cy="13" r="1.6" />
          <circle cx="51" cy="13" r="1.6" />
          <circle cx="13" cy="51" r="1.6" />
          <circle cx="51" cy="51" r="1.6" />
        </g>
      </>,
    ),
  totem: () =>
    svg(
      <>
        <rect x="21" y="5" width="22" height="53" rx="4" fill={woodD} />
        <rect x="21" y="5" width="22" height="16" rx="4" fill="#d1162f" />
        <rect x="21" y="38" width="22" height="16" fill="#2f7de1" />
        <path d="M21 28 L8 21 V33Z M43 28 L56 21 V33Z" fill="#f1c232" />
        <g fill="#fff6a0" strokeWidth="1">
          <circle cx="28" cy="13" r="2.4" />
          <circle cx="36" cy="13" r="2.4" />
          <circle cx="28" cy="31" r="2.4" />
          <circle cx="36" cy="31" r="2.4" />
          <circle cx="28" cy="45" r="2.4" />
          <circle cx="36" cy="45" r="2.4" />
        </g>
      </>,
    ),
  fireplace: () =>
    svg(
      <>
        <rect x="6" y="12" width="52" height="45" rx="3" fill="#8f8a82" />
        <path d="M6 24 H58 M6 36 H58 M20 12 V24 M38 24 V36 M14 36 V57" stroke="#5e5a54" strokeWidth="1.5" fill="none" />
        <path d="M15 57 V33 C15 20 49 20 49 33 V57Z" fill="#1d1208" />
        <path d="M32 57 C23 50 34 45 31 36 C43 44 43 51 32 57Z" fill="#ff9a1a" stroke="none" />
        <rect x="3" y="8" width="58" height="6" rx="1" fill="#6b4a2a" />
      </>,
    ),
  stasis: () =>
    svg(
      <>
        <rect x="13" y="52" width="38" height="6" fill={metalD} />
        <rect x="17" y="6" width="30" height="47" rx="7" fill="#1f4f99" />
        <rect x="21" y="11" width="22" height="37" rx="5" fill="#59c7ff" stroke="none" />
        <path d="M26 20 V40 M32 14 V44 M38 20 V40" stroke="#d8f1fb" strokeWidth="2" fill="none" opacity=".8" />
      </>,
    ),
  gunrack: () =>
    svg(
      <>
        <rect x="10" y="5" width="44" height="53" rx="3" fill="#5b4631" />
        <rect x="15" y="10" width="34" height="43" fill="#2b3340" />
        <path d="M21 49 L24 15 M32 49 L34 15 M43 49 L44 15" stroke="#cfd6df" strokeWidth="3.5" fill="none" />
        <circle cx="32" cy="55" r="1.6" fill="#f1d27a" stroke="none" />
      </>,
    ),
  lockdoor: () =>
    svg(
      <>
        <rect x="14" y="6" width="36" height="52" rx="3" fill="#6b7480" />
        <path d="M27 31 V26 C27 18 37 18 37 26 V31" stroke="#d1162f" strokeWidth="3.5" fill="none" />
        <rect x="22" y="30" width="20" height="16" rx="2" fill="#d1162f" />
        <circle cx="32" cy="38" r="2.2" fill="#2a1a10" stroke="none" />
      </>,
    ),
  hospbed: () =>
    svg(
      <>
        <rect x="6" y="28" width="52" height="11" rx="3" fill="#f1f6fa" />
        <rect x="9" y="23" width="15" height="7" rx="3.5" fill="#cfe9f7" />
        <path d="M6 20 V52 M58 20 V52 M6 39 H58" stroke={metal} strokeWidth="3.5" fill="none" />
        <circle cx="10" cy="54" r="3.2" fill={metalD} />
        <circle cx="54" cy="54" r="3.2" fill={metalD} />
      </>,
    ),
  locker: () =>
    svg(
      <>
        <rect x="12" y="5" width="40" height="53" rx="2" fill="#5b7a9a" />
        <path d="M32 5 V58" fill="none" />
        <path d="M17 14 H27 M17 18 H27 M37 14 H47 M37 18 H47" stroke="#2a3a4a" strokeWidth="2" fill="none" />
        <circle cx="28" cy="34" r="2.2" fill="#e9eef5" />
        <circle cx="36" cy="34" r="2.2" fill="#e9eef5" />
      </>,
    ),
  switch: () =>
    svg(
      <>
        <rect x="13" y="9" width="38" height="46" rx="3" fill="#6b7480" />
        <rect x="28" y="15" width="8" height="26" rx="2" fill="#2b3340" />
        <path d="M32 38 L41 19" stroke="#d1162f" strokeWidth="5" fill="none" />
        <circle cx="41" cy="19" r="4.2" fill="#d1162f" />
        <circle cx="19" cy="14" r="1.6" fill="#e9eef5" stroke="none" />
        <circle cx="45" cy="50" r="1.6" fill="#e9eef5" stroke="none" />
      </>,
    ),
  generator: () =>
    svg(
      <>
        <rect x="5" y="22" width="54" height="31" rx="4" fill="#e8a317" />
        <rect x="11" y="10" width="26" height="14" rx="5" fill="#c0302b" />
        <path d="M44 25 L38 38 H46 L40 51 L54 34 H46 L52 25Z" fill="#fff6a0" strokeWidth="1.5" />
        <circle cx="14" cy="53" r="3.5" fill={metalD} />
        <circle cx="50" cy="53" r="3.5" fill={metalD} />
      </>,
    ),
  hook: () =>
    svg(
      <>
        <path d="M32 3 V16" stroke={metal} strokeWidth="3" strokeDasharray="4 2" fill="none" />
        <path d="M32 16 V40 C32 58 12 56 13 43 C14 37 22 38 21 44" stroke={metal} strokeWidth="5.5" fill="none" />
        <path d="M32 16 V40 C32 58 12 56 13 43 C14 37 22 38 21 44" stroke="#d1d6dc" strokeWidth="2" fill="none" />
      </>,
    ),
  medkit: () =>
    svg(
      <>
        <path d="M23 18 V11 H41 V18" stroke={metalD} strokeWidth="3.5" fill="none" />
        <rect x="7" y="18" width="50" height="35" rx="4" fill="#fff" />
        <path d="M32 24 V47 M20.5 35.5 H43.5" stroke="#d1162f" strokeWidth="8" fill="none" />
      </>,
    ),
  pallet: () =>
    svg(
      <>
        <rect x="11" y="14" width="7" height="42" fill={woodD} />
        <rect x="45" y="14" width="7" height="42" fill={woodD} />
        <rect x="4" y="20" width="56" height="7" fill={wood} />
        <rect x="4" y="32" width="56" height="7" fill={wood} />
        <rect x="4" y="44" width="56" height="7" fill={wood} />
      </>,
    ),
  gate: () =>
    svg(
      <>
        <rect x="5" y="6" width="8" height="52" fill={metalD} />
        <rect x="51" y="6" width="8" height="52" fill={metalD} />
        <path d="M19 12 V54 M27 12 V54 M35 12 V54 M43 12 V54" stroke={metal} strokeWidth="4" fill="none" />
        <path d="M13 22 H51 M13 44 H51" stroke={metalD} strokeWidth="4" fill="none" />
      </>,
    ),
  lamp: () =>
    svg(
      <>
        <rect x="29.5" y="20" width="5" height="38" fill={metalD} />
        <rect x="24" y="54" width="16" height="5" rx="1" fill={metalD} />
        <circle cx="32" cy="14" r="11" fill="#ffe27a" />
        <circle cx="32" cy="14" r="5" fill="#fff6c8" stroke="none" />
      </>,
    ),
  throne: () =>
    svg(
      <>
        <path d="M13 36 V8 L21 17 L27 4 L32 15 L37 4 L43 17 L51 8 V36Z" fill="#4d535c" />
        <rect x="10" y="36" width="44" height="9" rx="2" fill="#6b7480" />
        <rect x="10" y="26" width="7" height="12" fill="#8a1d2b" />
        <rect x="47" y="26" width="7" height="12" fill="#8a1d2b" />
        <path d="M16 45 V56 M48 45 V56" stroke={metalD} strokeWidth="4" fill="none" />
      </>,
    ),
  pool: () =>
    svg(
      <>
        <path d="M10 46 V56 M54 46 V56" stroke={woodD} strokeWidth="4" fill="none" />
        <rect x="5" y="20" width="54" height="28" rx="4" fill="#2f8f3e" stroke="#7a4e26" strokeWidth="5" />
        <circle cx="22" cy="34" r="3.5" fill="#fff" strokeWidth="1" />
        <circle cx="31" cy="30" r="3.5" fill="#d1162f" strokeWidth="1" />
        <circle cx="40" cy="36" r="3.5" fill="#f1c232" strokeWidth="1" />
      </>,
    ),
  screen: () =>
    svg(
      <>
        <path d="M14 46 L10 58 M50 46 L54 58" stroke={metalD} strokeWidth="3" fill="none" />
        <rect x="4" y="8" width="56" height="38" rx="2" fill="#2b3340" />
        <rect x="9" y="13" width="46" height="28" fill="#f1f6fa" />
        <path d="M18 34 L28 22 L36 30 L42 24 L50 34Z" fill="#b8c9dd" strokeWidth="1.5" />
      </>,
    ),
}
