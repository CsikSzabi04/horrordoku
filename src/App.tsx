import { useEffect, useState } from 'react'

// A0 helyőrző: bizonyítja, hogy a híd él. Az A1 feladat cseréli le a valódi app-vázra (főmenü, útvonalak).
export default function App() {
  const [mem, setMem] = useState<{ dir: string; fallback: boolean } | null>(null)
  const bridge = window.nightdoku as typeof window.nightdoku | undefined
  useEffect(() => {
    void bridge?.memory.status().then(setMem)
  }, [bridge])

  return (
    <main className="boot">
      <h1>
        NIGH<span>T</span>DOKU
      </h1>
      <p>Ahol a sudoku vért ont.</p>
      <dl>
        <dt>híd</dt>
        <dd>{bridge ? `él · v${bridge.version} · ${bridge.platform}` : 'nincs (böngészőben fut, nem Electronban)'}</dd>
        <dt>memory</dt>
        <dd>{mem ? mem.dir : '…'}</dd>
        {mem?.fallback && (
          <>
            <dt>figyelem</dt>
            <dd>az app mappája nem írható — tartalék memory mappa</dd>
          </>
        )}
      </dl>
    </main>
  )
}
