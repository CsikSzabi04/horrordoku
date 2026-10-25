// NIGHTDOKU keep-alive — a Vercel cron naponta egyszer hívja (lásd vercel.json).
//
// Miért kell: a Supabase ingyenes csomagja szüneteltetheti a projektet, ha egy héten át alig van
// felhasználói adatbázis-aktivitás. Ez a függvény naponta lefuttatja a public.ping() adatbázis-függvényt
// (0001_init.sql), ami valódi táblát olvas — így a projekt aktív marad.
//
// Környezeti változók (Vercel -> Project -> Settings -> Environment Variables):
//   SUPABASE_URL              pl. https://<project-ref>.supabase.co
//   SUPABASE_PUBLISHABLE_KEY  sb_publishable_...   (publikus kulcs; secret/service_role kulcs NEM kell)
//   CRON_SECRET               hosszú, véletlen szöveg; a Vercel automatikusan Bearer tokenként küldi a cronnal

module.exports = async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY' });
  }

  try {
    // Az új (sb_publishable_...) kulcs nem JWT: csak az apikey fejlécben szabad küldeni, Authorization-ben nem.
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/ping`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => null);

    // Nem 2xx esetén a függvény is hibával tér vissza, így a Vercel naplóban és a cron-előzményekben látszik.
    if (!response.ok) {
      return res.status(502).json({ ok: false, supabaseStatus: response.status, body });
    }
    return res.status(200).json({ ok: true, ping: body });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String((err && err.message) || err) });
  }
};
