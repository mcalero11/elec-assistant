import type { DevicePresetAc } from './types.js'

/**
 * Typical mini-split nameplate presets (MCA/MOCP) by capacity, 208/230 V 1φ.
 * These are representative values from common inverter units sold in Central
 * America — the UI must always surface «valores típicos de placa; verifique la
 * placa de SU equipo» and offer manual MCA/MOCP entry (PRD US-1).
 */
export const acPresets = [
  {
    id: 'ac-9k',
    btu: 9000,
    tons: 0.75,
    voltage: 230,
    typicalMcaA: 7,
    typicalMocpA: 15,
    label: { es: '9,000 BTU (3/4 ton)', en: '9,000 BTU (3/4 ton)' },
    synonyms: ['9000', '9k', 'tres cuartos de tonelada'],
  },
  {
    id: 'ac-12k',
    btu: 12000,
    tons: 1,
    voltage: 230,
    typicalMcaA: 10,
    typicalMocpA: 15,
    label: { es: '12,000 BTU (1 ton)', en: '12,000 BTU (1 ton)' },
    synonyms: ['12000', '12k', 'una tonelada'],
  },
  {
    id: 'ac-18k',
    btu: 18000,
    tons: 1.5,
    voltage: 230,
    typicalMcaA: 14,
    typicalMocpA: 20,
    label: { es: '18,000 BTU (1.5 ton)', en: '18,000 BTU (1.5 ton)' },
    synonyms: ['18000', '18k', 'tonelada y media'],
  },
  {
    id: 'ac-24k',
    btu: 24000,
    tons: 2,
    voltage: 230,
    typicalMcaA: 17,
    typicalMocpA: 25,
    label: { es: '24,000 BTU (2 ton)', en: '24,000 BTU (2 ton)' },
    synonyms: ['24000', '24k', 'dos toneladas'],
  },
  {
    id: 'ac-36k',
    btu: 36000,
    tons: 3,
    voltage: 230,
    typicalMcaA: 24,
    typicalMocpA: 40,
    label: { es: '36,000 BTU (3 ton)', en: '36,000 BTU (3 ton)' },
    synonyms: ['36000', '36k', 'tres toneladas'],
  },
] as const satisfies readonly DevicePresetAc[]

export type AcPresetId = (typeof acPresets)[number]['id']
