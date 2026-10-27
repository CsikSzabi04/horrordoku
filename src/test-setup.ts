// A tesztek alapból magyar nyelven futnak (a meglévő szöveg-állítások magyarok). Az app alapértelmezett nyelve angol — azt a
// `src/i18n/lang.default.test.ts` (friss modul-példánnyal) és a `storage.test.ts` ellenőrzi; a nyelvfüggő tesztek maguk is állítják a nyelvet.
import { setCurrentLang } from './i18n/lang'

setCurrentLang('hu')
