import { Fragment } from 'react'

/** A nyomszövegekben a `**kiemelt**` rész félkövér (Murdoku-stílus). */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (
        <Fragment key={i}>{i % 2 === 1 ? <strong>{part}</strong> : part}</Fragment>
      ))}
    </>
  )
}

/** Ugyanaz kiemelés nélkül (tippekhez, hangfelolvasáshoz). */
export const plain = (text: string): string => text.replaceAll('**', '')
