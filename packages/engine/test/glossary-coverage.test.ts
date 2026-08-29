import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { glossary } from '@elec-assistant/data'

/**
 * Glossary coverage lint (PRD success criterion 5: every technical term rendered
 * in the UI has a glossary entry, CI-enforced). Two mechanisms:
 *
 * 1. A source scan of the web package for <Term id="…"> literals — belt and
 *    suspenders on top of the compile-time GlossaryId prop (catches casts).
 * 2. REQUIRED_TERMS: the curated inventory of technical vocabulary the UI
 *    renders (catalog names, calculator labels, template options). Grown by
 *    hand alongside the UI; deliberately typed as plain strings — typing it
 *    GlossaryId[] would make this test vacuously green.
 */

const REQUIRED_TERMS: readonly string[] = [
  // calculators
  'breaker', 'calibre', 'ampacidad', 'caidaDeTension', 'aislamiento', 'cargaContinua',
  'terminales', 'derrateo', 'agrupamiento', 'temperaturaAmbiente', 'awg', 'tension',
  'monofasico', 'valorEstandar', 'proteccion',
  // conduit / fill
  'emt', 'pvcElectrico', 'poliducto', 'curva', 'dobladora', 'diametroComercial',
  'rellenoTuberia', 'niple', 'tramo', 'cablePv',
  // catalog / BOM vocabulary
  'conector', 'union', 'adaptadorTerminal', 'pegamentoPvc', 'abrazadera', 'whip',
  'nema3r', 'desconectador', 'tierra', 'desperdicio',
  // nameplate / job flow
  'mca', 'mocp', 'btu',
  // wire vocabulary the results/BOM render
  'kcmil', 'thwn2',
  // box fill
  'cajaOctagonal', 'volumenDeCaja', 'prensacable', 'yugo',
  // load calc
  'factorDemanda', 'acometida', 'cargaConectada', 'voltamperio', 'metodoOpcional', 'duchaElectrica',
  // job templates 2–5
  'gfci', 'neutro', 'nema1430', 'nema1450',
  'cajaRectangular', 'plafonera', 'apagador', 'placa',
]

const webSrc = fileURLToPath(new URL('../../web/src/', import.meta.url))

function collectTsx(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) files.push(...collectTsx(path))
    else if (path.endsWith('.tsx')) files.push(path)
  }
  return files
}

describe('glossary coverage lint', () => {
  const ids = new Set<string>(Object.keys(glossary))

  it('every <Term id> used in the web UI has a glossary entry', () => {
    const used = new Map<string, string>()
    for (const file of collectTsx(webSrc)) {
      for (const match of readFileSync(file, 'utf8').matchAll(/<Term\s+id="([^"]+)"/g)) {
        used.set(match[1] ?? '', file)
      }
    }
    expect(used.size).toBeGreaterThan(0)
    const missing = [...used.entries()].filter(([id]) => !ids.has(id))
    expect(
      missing,
      missing.map(([id, file]) => `${id} (${file})`).join(', '),
    ).toEqual([])
  })

  it('the required-terms inventory is fully covered', () => {
    const missing = REQUIRED_TERMS.filter((id) => !ids.has(id))
    expect(missing, `glossary entries missing: ${missing.join(', ')}`).toEqual([])
  })

  it('entries are well-formed (one-line Spanish definition, synonyms, English name)', () => {
    for (const [id, entry] of Object.entries(glossary)) {
      expect(entry.es.length, id).toBeGreaterThan(0)
      expect(entry.en.length, id).toBeGreaterThan(0)
      expect(entry.definition.es.length, id).toBeGreaterThan(0)
      expect(entry.definition.es).not.toContain('\n')
      expect(entry.synonyms.length, id).toBeGreaterThan(0)
    }
  })
})
