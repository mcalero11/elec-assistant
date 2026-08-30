import type { DevicePresetAppliance } from './types.js'

/**
 * Typical household appliance wattages for the Art. 220 load calculator
 * (PRD US-3 item 6: «built on the device catalog»). These are NOT NEC data:
 * representative nameplate values for units commonly sold in El Salvador,
 * pending user verification like the A/C MCA/MOCP presets — the UI must always
 * surface «valores típicos; verifique la placa de SU equipo».
 *
 * A/C entries derive from the mini-split nameplate presets in ac-presets.ts:
 * typicalVa ≈ (typicalMcaA ÷ 1.25) × 230 V, rounded to 10 VA (MCA is 125% of
 * the compressor+fan load per 440.4(B), so dividing it back out approximates
 * the running load). A data-sanity test asserts this stays consistent.
 *
 * Verification: packages/data/WATTAGES.md is the research procedure. Per-entry
 * `verifiedAt`/`source` stamps supersede the blanket caveat above as they land;
 * unstamped entries are tracked in KNOWN_UNVERIFIED_APPLIANCES
 * (packages/engine/test/wattage-verification.test.ts).
 */
export const appliancePresets = [
  {
    id: 'ducha',
    label: { es: 'Ducha eléctrica', en: 'Electric shower head' },
    synonyms: ['ducha', 'regadera eléctrica', 'calentador de paso'],
    typicalVa: 4400,
    voltage: 120,
    category: 'fixed',
  },
  {
    id: 'termo',
    label: { es: 'Calentador de agua (tanque)', en: 'Tank water heater' },
    synonyms: ['termo', 'calentador de tanque', 'boiler'],
    typicalVa: 4500,
    voltage: 240,
    category: 'fixed',
    verifiedAt: '2026-08-30',
    source: 'https://www.homedepot.com/p/Rheem-Performance-40-Gal-Medium-4500-Watt-Double-Element-Electric-Water-Heater-with-6-Year-Warranty-XE40M06ST45U1/326434008 (elemento estándar 4,500 W; igual Camco 02583)',
  },
  {
    id: 'estufa',
    label: { es: 'Estufa eléctrica (rango)', en: 'Electric range' },
    synonyms: ['estufa', 'cocina eléctrica', 'rango'],
    typicalVa: 9600,
    voltage: 240,
    category: 'range',
  },
  {
    id: 'horno',
    label: { es: 'Horno empotrado', en: 'Wall oven' },
    synonyms: ['horno', 'horno eléctrico'],
    typicalVa: 4000,
    voltage: 240,
    category: 'range',
    verifiedAt: '2026-08-30',
    source: 'https://www.retailspecs.com/files/pdf/attachment/81948/Specification_Sheet.pdf (Frigidaire FCWS3027: 3.7 kW; GCWS3067AF: 4.5 kW — 4.0 kVA queda en el centro)',
  },
  {
    id: 'secadora',
    label: { es: 'Secadora de ropa', en: 'Clothes dryer' },
    synonyms: ['secadora', 'secadora de ropa'],
    typicalVa: 5000,
    voltage: 240,
    category: 'dryer',
  },
  {
    id: 'refri',
    label: { es: 'Refrigeradora', en: 'Refrigerator' },
    synonyms: ['refri', 'nevera', 'frigo', 'refrigerador'],
    typicalVa: 500,
    voltage: 120,
    category: 'covered',
  },
  {
    id: 'congelador',
    label: { es: 'Congelador', en: 'Freezer' },
    synonyms: ['congelador', 'freezer'],
    typicalVa: 500,
    voltage: 120,
    category: 'fixed',
  },
  {
    id: 'micro',
    label: { es: 'Microondas', en: 'Microwave' },
    synonyms: ['micro', 'microondas'],
    typicalVa: 1200,
    voltage: 120,
    category: 'covered',
  },
  {
    id: 'lavadora',
    label: { es: 'Lavadora', en: 'Washing machine' },
    synonyms: ['lavadora', 'máquina de lavar'],
    typicalVa: 1200,
    voltage: 120,
    category: 'covered',
  },
  {
    id: 'lavaplatos',
    label: { es: 'Lavaplatos (máquina)', en: 'Dishwasher' },
    synonyms: ['lavaplatos', 'lavavajillas'],
    typicalVa: 1200,
    voltage: 120,
    category: 'fixed',
    verifiedAt: '2026-08-30',
    source: 'https://www.retailspecs.com/files/pdf/attachment/79597/Specification_Sheet.pdf (Frigidaire FFCD2413U: 10.0 A @ 120 V = 1,200 VA)',
  },
  {
    id: 'plancha',
    label: { es: 'Plancha', en: 'Iron' },
    synonyms: ['plancha'],
    typicalVa: 1200,
    voltage: 120,
    category: 'covered',
    verifiedAt: '2026-08-30',
    source: 'https://www.osterlatino.com/manuales/planchas_de_vapor/GCSTBS5802_GCSTBS5803_GCSTBS5804_GCSTBS5805_GCSTBS5806_GCSTBS5807_GCSTBS5812_GCSTBS5813.pdf (Oster 120 V/1,200 W; B+D IR1850/IRBD200 1,200 W)',
  },
  {
    id: 'tv',
    label: { es: 'Televisor', en: 'Television' },
    synonyms: ['tv', 'tele', 'televisión'],
    typicalVa: 150,
    voltage: 120,
    category: 'covered',
    verifiedAt: '2026-08-30',
    source: 'https://www.samsung.com/latin/tvs/uhd-4k-tv/cu7000-55-inch-un55cu7000pxpa/ (consumo máx. 150 W; 43″ 130 W, 50″ 145 W)',
  },
  {
    id: 'bomba',
    label: { es: 'Bomba de agua (½ HP)', en: 'Water pump (½ HP)' },
    synonyms: ['bomba', 'bomba de agua', 'hidroneumático'],
    typicalVa: 1200,
    voltage: 120,
    category: 'motor',
    verifiedAt: '2026-08-30',
    source: 'NEC Tabla 430.248 (FLC ½ HP 115 V: 9.8 A ≈ 1,176 VA); 430.6(A)(1)/120.11 mandan valor de tabla, no placa — placas reales 3–5.5 A (Truper/Pedrollo), la tabla es conservadora',
  },
  {
    id: 'ac-9k',
    label: { es: 'A/C mini split 9,000 BTU', en: 'Mini-split A/C 9,000 BTU' },
    synonyms: ['aire 9000', 'mini split 9k'],
    typicalVa: 1290,
    voltage: 240,
    category: 'ac',
    source: 'derivado de ac-presets.ts (MCA ÷ 1.25 × 230 V)',
  },
  {
    id: 'ac-12k',
    label: { es: 'A/C mini split 12,000 BTU', en: 'Mini-split A/C 12,000 BTU' },
    synonyms: ['aire 12000', 'mini split 12k', 'una tonelada'],
    typicalVa: 1840,
    voltage: 240,
    category: 'ac',
    verifiedAt: '2026-08-30',
    source: 'derivado de ac-presets.ts (MCA ÷ 1.25 × 230 V)',
  },
  {
    id: 'ac-18k',
    label: { es: 'A/C mini split 18,000 BTU', en: 'Mini-split A/C 18,000 BTU' },
    synonyms: ['aire 18000', 'mini split 18k'],
    typicalVa: 2580,
    voltage: 240,
    category: 'ac',
    verifiedAt: '2026-08-30',
    source: 'derivado de ac-presets.ts (MCA ÷ 1.25 × 230 V)',
  },
  {
    id: 'ac-24k',
    label: { es: 'A/C mini split 24,000 BTU', en: 'Mini-split A/C 24,000 BTU' },
    synonyms: ['aire 24000', 'mini split 24k', 'dos toneladas'],
    typicalVa: 3130,
    voltage: 240,
    category: 'ac',
    source: 'derivado de ac-presets.ts (MCA ÷ 1.25 × 230 V)',
  },
] as const satisfies readonly DevicePresetAppliance[]

export type AppliancePresetId = (typeof appliancePresets)[number]['id']
