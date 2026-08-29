import { describe, expect, it } from 'vitest'
import { acMinisplitTemplate } from '@elec-assistant/data'
import { presetSelection, urlStateToRunInput } from '../src/lib/template-url'

/**
 * URL back-compat contract: mini-split links shared before the generic runner
 * (short keys d/mca/mocp/l/loc/amb/p/cd/bd/bc/w) must keep producing the same
 * runTemplate input. The old runner's `.withDefault(...)` values now live as
 * template defaults, so omitted keys are simply absent here and filled by
 * resolveTemplateState.
 */

describe('urlStateToRunInput (mini-split back-compat)', () => {
  it('resolves an old-format preset URL exactly as the previous runner did', () => {
    const input = urlStateToRunInput(acMinisplitTemplate, {
      d: 'ac-36k',
      l: '15',
      loc: 'exterior',
      cd: 'emt',
      bd: 'dobladora',
    })
    expect(input.answers['device']).toEqual({ id: 'ac-36k', mcaA: 24, mocpA: 40 })
    expect(input.answers['runLengthM']).toBe(15)
    expect(input.answers['location']).toBe('exterior')
    expect(input.answers['ambientC']).toBeUndefined() // untouched → template default (40 outdoors)
    expect(input.options['conduitType']).toBe('emt')
    expect(input.options['bends']).toBe('dobladora')
    expect(input.options['bendCount']).toBeUndefined()
  })

  it('manual nameplate entry: d=manual + mca/mocp keys', () => {
    const input = urlStateToRunInput(acMinisplitTemplate, { d: 'manual', mca: '22', mocp: '35' })
    expect(input.answers['device']).toEqual({ mcaA: 22, mocpA: 35 })
  })

  it('manual entry falls back to field defaults when keys are absent', () => {
    const input = urlStateToRunInput(acMinisplitTemplate, { d: 'manual' })
    expect(input.answers['device']).toEqual({ mcaA: 10, mocpA: 15 })
  })

  it('an unknown preset id falls back to the template default preset', () => {
    const input = urlStateToRunInput(acMinisplitTemplate, { d: 'no-such-unit' })
    expect((input.answers['device'] as { id: string }).id).toBe('ac-12k')
    expect(presetSelection(acMinisplitTemplate, 'device', { d: 'no-such-unit' })).toBe('ac-12k')
  })

  it('invalid choice and number values are omitted (template defaults apply)', () => {
    const input = urlStateToRunInput(acMinisplitTemplate, {
      loc: 'bogus',
      l: 'NaN',
      cd: 'garden-hose',
    })
    expect(input.answers['location']).toBeUndefined()
    expect(input.answers['runLengthM']).toBeUndefined()
    expect(input.options['conduitType']).toBeUndefined()
  })
})
