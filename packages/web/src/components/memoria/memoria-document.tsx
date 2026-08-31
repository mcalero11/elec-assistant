import { citationLabel, citationReason, type CitationKey } from '@nec-assistant/data'
import { getMessages } from '@/lib/i18n'
import type { CitationIndex, MemoriaBlock, MemoriaBomRow, MemoriaModel } from '@/lib/memoria'

/**
 * Print-only renderer of a MemoriaModel (PRD US-6). Plain markup on purpose:
 * no popovers, glossary links, or interactive chips — citations become
 * superscript footnote numbers resolved in the «Citas NEC» appendix, and the
 * whole document only exists in the print layout (`hidden print:block`;
 * sizing/pagination rules live under `.memoria` in globals.css).
 */

function CiteRefs({ keys, index }: { keys: readonly CitationKey[]; index: CitationIndex }) {
  if (keys.length === 0) return null
  const nums = [...new Set(keys.map((k) => index.numberOf.get(k)))].filter(
    (n): n is number => n !== undefined,
  )
  if (nums.length === 0) return null
  return <sup>[{nums.join(', ')}]</sup>
}

function RuledValue({ value }: { value?: string }) {
  return value ? (
    <span className="font-medium">{value}</span>
  ) : (
    <span className="inline-block w-48 border-b border-foreground/60" aria-hidden />
  )
}

function BomRows({ rows, index }: { rows: MemoriaBomRow[]; index: CitationIndex }) {
  const m = getMessages()
  return (
    <>
      {rows.map((r, i) => (
        <tr key={i}>
          <td>
            {r.name}
            <CiteRefs keys={r.citations} index={index} />
            {r.note ? <span className="text-muted-foreground"> — {r.note}</span> : null}
          </td>
          <td className="whitespace-nowrap">{r.qty}</td>
          <td className="whitespace-nowrap text-right">
            {r.unitPrice ?? m.jobs.noPrice}
            {r.override ? '*' : ''}
            {r.stale ? '†' : ''}
          </td>
          <td className="whitespace-nowrap text-right">{r.total ?? '—'}</td>
        </tr>
      ))}
    </>
  )
}

function Block({
  block,
  number,
  index,
}: {
  block: MemoriaBlock
  number: number
  index: CitationIndex
}) {
  const m = getMessages()
  return (
    <section>
      <h2>
        {number}. {block.title}
      </h2>

      {block.kind === 'keyValue' ? (
        <div className="space-y-0.5">
          {block.rows.map((row, i) => (
            <div key={i} className="border-b border-foreground/10 py-0.5">
              <div className="flex items-baseline justify-between gap-4">
                <span>{row.label}</span>
                <span className="text-right font-medium tabular-nums">
                  {row.value}
                  <CiteRefs keys={row.citations} index={index} />
                </span>
              </div>
              {row.note ? <div className="text-muted-foreground">{row.note}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {block.kind === 'list' ? (
        <ul className="list-disc space-y-0.5 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>
              {block.tone === 'warning' ? <strong>{m.jobs.warningsTitle}: </strong> : null}
              {block.tone === 'deviation' ? <strong>{m.memoria.deviationPrefix}: </strong> : null}
              {item.text}
              <CiteRefs keys={item.citations} index={index} />
              {item.note ? <div className="text-muted-foreground">{item.note}</div> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {block.kind === 'bom' ? (
        <>
          <table>
            <thead>
              <tr>
                <th>{m.jobs.colItem}</th>
                <th>{m.jobs.colQty}</th>
                <th className="text-right">
                  {m.jobs.colPrice} ({block.retailerLabel})
                </th>
                <th className="text-right">{m.jobs.colTotal}</th>
              </tr>
            </thead>
            <tbody>
              <BomRows rows={block.rows} index={index} />
              {block.tools.length > 0 ? (
                <>
                  <tr>
                    <td colSpan={4} className="pt-2 font-medium">
                      {m.jobs.toolsTitle}
                    </td>
                  </tr>
                  <BomRows rows={block.tools} index={index} />
                </>
              ) : null}
            </tbody>
          </table>
          <p className="mt-1 font-medium">
            {m.jobs.subtotal}: {block.subtotal}
            {block.unpricedCount > 0
              ? ` · ${block.unpricedCount} ${m.jobs.unpricedCount}`
              : ''}
          </p>
          {block.hasOverrides ? (
            <p className="text-muted-foreground">{m.memoria.overrideLegend}</p>
          ) : null}
          {block.hasStale ? (
            <p className="text-muted-foreground">{m.memoria.staleLegend}</p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export function MemoriaDocument({ model }: { model: MemoriaModel }) {
  const m = getMessages()
  const appendixNumber = model.blocks.length + 1
  return (
    <div className="memoria hidden print:block">
      <header>
        <h1>{model.title}</h1>
        <p className="text-muted-foreground">
          {model.appName} · {model.necEdition} · {m.memoria.generatedOn} {model.generatedOn}
        </p>
        <p className="mt-1">
          {m.memoria.project}: <RuledValue value={model.project} />
          <span className="inline-block w-6" />
          {m.memoria.client}: <RuledValue value={model.client} />
        </p>
      </header>

      {/* Bold and ruled rather than colored: the PDF is monochrome-light by
          design, and this must survive a black-and-white print. */}
      {model.nonCompliant ? (
        <p className="mt-2 border-y border-foreground py-1 font-bold uppercase">
          {m.memoria.nonCompliantStamp}
        </p>
      ) : null}

      {model.blocks.map((block, i) => (
        <Block key={i} block={block} number={i + 1} index={model.citations} />
      ))}

      <section>
        <h2>
          {appendixNumber}. {m.common.citations}
        </h2>
        <ol className="list-none space-y-0.5 pl-0">
          {model.citations.ordered.map((key, i) => (
            <li key={key}>
              [{i + 1}] {citationLabel(key, 'es')} — {citationReason(key, 'es')}
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-3 italic">{model.disclaimer}</p>

      <p className="mt-6">
        {m.memoria.responsible}: <RuledValue value={model.responsible} />
        <span className="inline-block w-6" />
        {m.memoria.signature}: <RuledValue />
        <span className="inline-block w-6" />
        {m.memoria.dateLabel}: <RuledValue />
      </p>
    </div>
  )
}
