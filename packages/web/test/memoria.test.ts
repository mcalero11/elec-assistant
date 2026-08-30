import { describe, expect, it } from 'vitest'
import { acMinisplitTemplate, allTemplates, type CitationKey } from '@nec-assistant/data'
import { residentialLoad, resolveTemplateState, runTemplate } from '@nec-assistant/engine'
import { fmtDate, fmtNumber, getMessages } from '../src/lib/i18n'
import {
  buildCargaMemoria,
  buildJobMemoria,
  collectCitations,
  type MemoriaBlock,
  type MemoriaModel,
} from '../src/lib/memoria'
import { priceBom } from '../src/lib/pricing'
import { RESERVED_RUNNER_KEYS, urlStateToRunInput } from '../src/lib/template-url'

const m = getMessages()
const today = new Date('2026-08-30T12:00:00')

const jobModel = (
  params: Record<string, string>,
  overrides: ReadonlyMap<string, number> = new Map(),
  onDate: Date = today,
): MemoriaModel => {
  const runInput = urlStateToRunInput(acMinisplitTemplate, params)
  const result = runTemplate(acMinisplitTemplate, runInput)
  const state = resolveTemplateState(acMinisplitTemplate, runInput)
  const summary = priceBom(result.bom, 'vidri', overrides, onDate)
  return buildJobMemoria({
    template: acMinisplitTemplate,
    runInput,
    state,
    result,
    summary,
    retailer: 'vidri',
    today: onDate,
    m,
  })
}

const keyValueBlock = (model: MemoriaModel, title: string) => {
  const block = model.blocks.find((b) => b.kind === 'keyValue' && b.title === title)
  if (block?.kind !== 'keyValue') throw new Error(`missing keyValue block: ${title}`)
  return block
}

const bomBlockOf = (model: MemoriaModel) => {
  const block = model.blocks.find((b) => b.kind === 'bom')
  if (block?.kind !== 'bom') throw new Error('missing bom block')
  return block
}

const allCitationGroups = (model: MemoriaModel): CitationKey[][] => {
  const groups: CitationKey[][] = []
  for (const block of model.blocks) {
    if (block.kind === 'keyValue') for (const r of block.rows) groups.push([...r.citations])
    else if (block.kind === 'list') for (const i of block.items) groups.push([...i.citations])
    else for (const r of [...block.rows, ...block.tools]) groups.push([...r.citations])
  }
  return groups
}

describe('collectCitations', () => {
  it('dedupes into 1-based first-use order', () => {
    const index = collectCitations([
      ['nec2026.t310_16', 'nec2026.s240_6_a'],
      ['nec2026.t310_16', 'nec2026.ch9_t8'],
    ] as CitationKey[][])
    expect(index.ordered).toEqual(['nec2026.t310_16', 'nec2026.s240_6_a', 'nec2026.ch9_t8'])
    expect(index.numberOf.get('nec2026.t310_16')).toBe(1)
    expect(index.numberOf.get('nec2026.ch9_t8')).toBe(3)
  })

  it('is empty for no groups', () => {
    expect(collectCitations([]).ordered).toEqual([])
  })
})

describe('buildJobMemoria (ac-minisplit)', () => {
  const model = jobModel({ d: 'ac-24k', l: '18' })

  it('carries the document header meta', () => {
    expect(model.title).toContain(acMinisplitTemplate.name.es)
    expect(model.necEdition).toBe('NEC 2026')
    expect(model.generatedOn).toBe(fmtDate(today))
    expect(model.disclaimer).toBe(m.common.disclaimer)
  })

  it('marks untouched inputs as defaults and names the chosen preset', () => {
    const inputs = keyValueBlock(model, m.memoria.sectionInputs)
    const preset = inputs.rows.find((r) => r.value.includes('24,000 BTU'))
    expect(preset).toBeDefined()
    const ambient = inputs.rows.find((r) => r.note === m.memoria.defaultValue)
    expect(ambient).toBeDefined()
    const provided = inputs.rows.find((r) => r.value.startsWith(fmtNumber(18)))
    expect(provided?.note).toBeUndefined()
  })

  it('omits disabled options from the inputs', () => {
    // lfnc disables the bends/bendCount options entirely.
    const lfnc = jobModel({ d: 'ac-24k', cd: 'lfnc' })
    const withBends = keyValueBlock(model, m.memoria.sectionInputs).rows.length
    const withoutBends = keyValueBlock(lfnc, m.memoria.sectionInputs).rows.length
    expect(withoutBends).toBeLessThan(withBends)
  })

  it('renders every parameter and one detail block per engine call', () => {
    const runInput = urlStateToRunInput(acMinisplitTemplate, { d: 'ac-24k', l: '18' })
    const result = runTemplate(acMinisplitTemplate, runInput)
    const params = keyValueBlock(model, m.memoria.sectionParameters)
    expect(params.rows).toHaveLength(result.parameters.length)
    expect(model.blocks.filter((b) => b.title === m.memoria.circuitTitle)).toHaveLength(1)
    const circuit = keyValueBlock(model, m.memoria.circuitTitle)
    expect(circuit.rows.some((r) => r.label === m.calibre.governedBy)).toBe(true)
  })

  it('manual nameplate entry renders the MCA/MOCP rows', () => {
    const manual = jobModel({ d: 'manual', mca: '22', mocp: '35' })
    const inputs = keyValueBlock(manual, m.memoria.sectionInputs)
    expect(inputs.rows.some((r) => r.value === m.jobs.manualEntry)).toBe(true)
    expect(inputs.rows.some((r) => r.value.startsWith(fmtNumber(22)))).toBe(true)
  })

  it('flags price overrides and emits the legend only when used', () => {
    const plain = bomBlockOf(model)
    expect(plain.hasOverrides).toBe(false)

    const pricedItem = plain.rows.find((r) => r.unitPrice !== undefined)
    expect(pricedItem).toBeDefined()

    const runInput = urlStateToRunInput(acMinisplitTemplate, { d: 'ac-24k', l: '18' })
    const result = runTemplate(acMinisplitTemplate, runInput)
    const someItemId = result.bom.find((l) => l.category === 'material')!.itemId
    const overridden = bomBlockOf(jobModel({ d: 'ac-24k', l: '18' }, new Map([[someItemId, 9.99]])))
    expect(overridden.hasOverrides).toBe(true)
    expect(overridden.rows.some((r) => r.override && r.unitPrice !== undefined)).toBe(true)
  })

  it('marks stale prices when the run date is far in the future', () => {
    const future = bomBlockOf(jobModel({ d: 'ac-24k', l: '18' }, new Map(), new Date('2099-01-01')))
    expect(future.hasStale).toBe(true)
  })

  it('splits tools from consumables', () => {
    const withBender = bomBlockOf(jobModel({ d: 'ac-24k', l: '18', bd: 'dobladora' }))
    expect(withBender.tools.length).toBeGreaterThan(0)
  })

  it('the citation appendix covers exactly the citations used by rows', () => {
    const expected = new Set(allCitationGroups(model).flat())
    expect(new Set(model.citations.ordered)).toEqual(expected)
    for (const key of expected) {
      expect(model.citations.numberOf.get(key)).toBeGreaterThan(0)
    }
  })
})

describe('buildCargaMemoria', () => {
  const result = residentialLoad({
    areaM2: 120,
    smallApplianceCircuits: 2,
    laundryCircuits: 1,
    devices: [{ presetId: 'ducha' }, { presetId: 'ac-12k' }],
  })
  const model = buildCargaMemoria({
    areaM2: 120,
    smallApplianceCircuits: 2,
    laundryCircuits: 1,
    result,
    today,
    m,
    project: 'Casa modelo',
  })

  it('renders both methods with the worked arithmetic carried through', () => {
    const standard = keyValueBlock(model, m.memoria.methodStandardTitle)
    const optional = keyValueBlock(model, m.memoria.methodOptionalTitle)
    expect(standard.rows.length).toBeGreaterThan(2)
    expect(optional.rows.length).toBeGreaterThan(2)
    const withDetail = result.standard.lines.find((l) => l.detail)
    if (withDetail) {
      expect(
        standard.rows.some((r) => r.note?.includes(withDetail.detail!.es)),
      ).toBe(true)
    }
  })

  it('names the governing method and the suggested service', () => {
    const resultBlock = keyValueBlock(model, m.memoria.resultTitle)
    expect(
      resultBlock.rows.some(
        (r) => r.value === m.carga.governsStandard || r.value === m.carga.governsOptional,
      ),
    ).toBe(true)
    expect(
      resultBlock.rows.some((r) => r.value === `${fmtNumber(result.minServiceA)} A`),
    ).toBe(true)
  })

  it('lists the devices with their category', () => {
    const devices = keyValueBlock(model, m.memoria.deviceListTitle)
    expect(devices.rows).toHaveLength(result.devices.length)
    expect(devices.rows.some((r) => r.note === m.carga.catAc)).toBe(true)
  })

  it('keeps the project info on the model', () => {
    expect(model.project).toBe('Casa modelo')
    expect(model.client).toBeUndefined()
  })

  it('collects service citations into the appendix', () => {
    const expected = new Set(allCitationGroups(model).flat())
    expect(new Set(model.citations.ordered)).toEqual(expected)
    expect(model.citations.ordered.length).toBeGreaterThan(0)
  })
})

describe('reserved runner URL keys', () => {
  it('no template urlKey collides with the runner-owned keys', () => {
    const reserved = new Set<string>(RESERVED_RUNNER_KEYS)
    for (const template of allTemplates) {
      const keys: string[] = []
      for (const q of template.questions) {
        keys.push(q.urlKey ?? q.id)
        if (q.type === 'preset') for (const f of q.manualFields) keys.push(f.urlKey ?? f.id)
      }
      for (const o of template.options) keys.push(o.urlKey ?? o.id)
      const collisions = keys.filter((k) => reserved.has(k))
      expect(collisions, `${template.id}: ${collisions.join(', ')}`).toEqual([])
    }
  })
})
