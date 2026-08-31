import type { JobTemplate } from '../catalog/types.js'

const WIRE_TABLE = {
  '14': 'thhn-cu-14',
  '12': 'thhn-cu-12',
  '10': 'thhn-cu-10',
  '8': 'thhn-cu-8',
  '6': 'thhn-cu-6',
}

/**
 * Seed template #4: tomacorriente 240 V para estufa / secadora.
 * A 4-wire branch circuit (2 hots + neutral + EGC) to a NEMA 14-30/14-50
 * receptacle. The preset supplies the hand-derived branch demand (Table 120.55
 * Column C for the range, nameplate for the dryer — math in presets.ts) and
 * the minimum breaker (210.19(C): 40 A for ranges ≥ 8¾ kW). The receptacle
 * configuration derives from the breaker rating (210.21(B)). GFCI protection
 * ships in the BOM by default (210.8 — user decision).
 */
export const tomacorriente240vTemplate: JobTemplate = {
  id: 'tomacorriente-240v',
  version: 1,
  name: {
    es: 'Tomacorriente 240 V (estufa / secadora)',
    en: '240 V receptacle (range / dryer)',
  },
  synonyms: ['estufa', 'secadora', 'toma 240', 'tomacorriente de estufa', 'toma de secadora', 'range', 'dryer'],

  questions: [
    {
      id: 'device',
      type: 'preset',
      catalog: 'range-dryer-presets',
      default: 'estufa',
      sets: { demandA: 'demandA', minBreakerA: 'minBreakerA' },
      manualFields: [
        {
          id: 'demandA',
          label: { es: 'Demanda del circuito (A)', en: 'Circuit demand (A)' },
          default: 24,
          min: 10,
          max: 40,
          step: 0.1,
          unit: 'A',
          urlKey: 'da',
        },
        {
          id: 'minBreakerA',
          label: { es: 'Térmico mínimo (A)', en: 'Minimum breaker (A)' },
          default: 30,
          min: 30,
          max: 50,
          step: 10,
          unit: 'A',
          urlKey: 'mb',
        },
      ],
      presetNote: {
        es: 'Demanda derivada de la Tabla 120.55 / placa típica; verifique la placa de SU equipo.',
        en: 'Demand derived from Table 120.55 / typical nameplate; verify YOUR unit’s plate.',
      },
      label: { es: 'Aparato', en: 'Appliance' },
      urlKey: 'd',
    },
    {
      id: 'runLengthM',
      type: 'number',
      unit: 'm',
      min: 1,
      max: 30,
      step: 1,
      default: 6,
      label: { es: 'Distancia del panel a la toma (un solo sentido)', en: 'One-way run length from panel' },
      urlKey: 'l',
    },
    {
      id: 'ambientC',
      type: 'number',
      unit: '°C',
      min: 25,
      max: 50,
      step: 1,
      default: 35,
      label: { es: 'Temperatura donde pasa el cable', en: 'Ambient temperature along the run' },
      urlKey: 'amb',
      termId: 'temperaturaAmbiente',
    },
    {
      id: 'panelSlots',
      type: 'choice',
      default: 'si',
      choices: [
        { value: 'si', label: { es: 'Sí, hay 2 espacios', en: 'Yes, 2 slots free' } },
        { value: 'no', label: { es: 'No hay espacio', en: 'No space' } },
      ],
      label: { es: '¿Hay espacio en el panel para un térmico de 2 polos?', en: 'Panel space for a 2-pole breaker?' },
      urlKey: 'p',
    },
  ],

  options: [
    {
      id: 'proteccion',
      type: 'choice',
      default: 'gfci',
      choices: [
        { value: 'gfci', label: { es: 'Térmico GFCI (exigido)', en: 'GFCI breaker (required)' }, termId: 'gfci' },
        { value: 'estandar', label: { es: 'Térmico estándar', en: 'Standard breaker' } },
      ],
      label: { es: 'Protección del circuito', en: 'Circuit protection' },
      urlKey: 'gf',
    },
    {
      id: 'conduitType',
      type: 'choice',
      default: 'emt',
      choices: [
        { value: 'emt', label: { es: 'Tubo EMT', en: 'EMT' }, termId: 'emt' },
        { value: 'pvc', label: { es: 'PVC eléctrico', en: 'Electrical PVC' }, termId: 'pvcElectrico' },
        { value: 'lfnc', label: { es: 'Poliducto (manguera)', en: 'Flexible (LFNC)' }, termId: 'poliducto' },
      ],
      label: { es: 'Tipo de tubería', en: 'Conduit type' },
      urlKey: 'cd',
    },
    {
      id: 'bends',
      type: 'choice',
      default: 'curvas',
      choices: [
        { value: 'curvas', label: { es: 'Comprar curvas', en: 'Buy factory elbows' }, termId: 'curva' },
        { value: 'dobladora', label: { es: 'Doblar con dobladora', en: 'Field-bend with a bender' }, termId: 'dobladora' },
      ],
      disabledWhen: { ref: 'options.conduitType', in: ['lfnc', 'pvc'] },
      label: { es: 'Vueltas del recorrido', en: 'Bends' },
      urlKey: 'bd',
    },
    {
      id: 'bendCount',
      type: 'number',
      min: 0,
      max: 8,
      step: 1,
      default: 3,
      disabledWhen: { ref: 'options.conduitType', eq: 'lfnc' },
      label: { es: 'Número de vueltas de 90°', en: 'Number of 90° bends' },
      urlKey: 'bc',
    },
    {
      id: 'wastagePercent',
      type: 'number',
      unit: '%',
      min: 0,
      max: 30,
      step: 5,
      default: 10,
      label: { es: 'Desperdicio', en: 'Wastage' },
      urlKey: 'w',
      termId: 'desperdicio',
    },
  ],

  calls: [
    {
      // Neutral carries only the imbalance (310.15(E)) — cccCount stays 2.
      id: 'circuit',
      fn: 'sizeCircuit',
      input: {
        loadA: { $ref: 'answers.device.demandA' },
        continuous: false,
        lengthM: { $ref: 'answers.runLengthM' },
        systemVoltage: 240,
        material: 'copper',
        insulation: 'THHN',
        ambientC: { $ref: 'answers.ambientC' },
        cccCount: 2,
        minBreakerA: { $ref: 'answers.device.minBreakerA' },
      },
    },
    {
      id: 'egc',
      fn: 'egcSize',
      input: {
        ocpdA: { $ref: 'calls.circuit.breaker.rating' },
        material: 'copper',
        installedSize: { $ref: 'calls.circuit.conductor.size' },
        requiredSize: { $ref: 'calls.circuit.ampacityMinimumSize' },
      },
    },
    {
      id: 'conduit',
      fn: 'sizeConduit',
      input: {
        conduitType: {
          $cond: {
            if: { ref: 'options.conduitType', eq: 'emt' },
            then: 'EMT',
            else: {
              $cond: {
                if: { ref: 'options.conduitType', eq: 'pvc' },
                then: 'PVC-40',
                else: 'LFNC-B',
              },
            },
          },
        },
        minTradeSize: '1/2',
        conductors: [
          {
            // 2 hots + neutral, all the same size (220.61 simplification).
            size: { $ref: 'calls.circuit.conductor.size' },
            insulation: 'THHN',
            count: 3,
          },
          {
            size: { $ref: 'calls.egc.size' },
            insulation: 'THHN',
            count: 1,
          },
        ],
      },
    },
  ],

  derived: [
    {
      id: 'receptacle',
      kind: 'min-rating-at-least',
      ratings: [30, 50],
      atLeast: { $ref: 'calls.circuit.breaker.rating' },
      citations: ['nec2026.s210_21_b'],
      label: { es: 'Tomacorriente', en: 'Receptacle' },
    },
  ],

  parameters: [
    {
      id: 'demanda',
      label: { es: 'Demanda del circuito', en: 'Circuit demand' },
      value: { $ref: 'answers.device.demandA' },
      unit: 'A',
      citations: ['nec2026.t220_55', 'nec2026.s220_54'],
    },
    {
      id: 'conductor',
      label: { es: 'Calibre (cobre)', en: 'Conductor size (copper)' },
      value: { $ref: 'calls.circuit.conductor.size' },
      unit: 'AWG',
      citationsFrom: 'calls.circuit.conductor',
    },
    {
      id: 'breaker',
      label: { es: 'Térmico (2 polos)', en: 'Breaker (2-pole)' },
      value: { $ref: 'calls.circuit.breaker.rating' },
      unit: 'A',
      citationsFrom: 'calls.circuit.breaker',
      citations: ['nec2026.s210_19_c'],
    },
    {
      id: 'receptaculo',
      label: { es: 'Tomacorriente', en: 'Receptacle' },
      value: {
        $cond: { if: { ref: 'derived.receptacle.rating', eq: 30 }, then: 'NEMA 14-30', else: 'NEMA 14-50' },
      },
      citationsFrom: 'derived.receptacle',
    },
    {
      id: 'conduit',
      label: { es: 'Diámetro de tubería', en: 'Conduit trade size' },
      value: { $ref: 'calls.conduit.tradeSize' },
      unit: 'pulg',
      citationsFrom: 'calls.conduit',
    },
    {
      id: 'drop',
      label: { es: 'Caída de tensión a esa distancia', en: 'Voltage drop at that distance' },
      value: { $ref: 'calls.circuit.voltageDrop.dropPercent' },
      unit: '%',
      citationsFrom: 'calls.circuit.voltageDrop',
      format: 'percent',
    },
  ],

  bom: [
    {
      id: 'breaker-gfci',
      when: [{ ref: 'options.proteccion', eq: 'gfci' }],
      item: {
        map: {
          keys: ['calls.circuit.breaker.rating'],
          table: { '30': 'breaker-2p-gfci-30', '40': 'breaker-2p-gfci-40', '50': 'breaker-2p-gfci-50' },
        },
      },
      qty: { fixed: 1 },
      citations: ['nec2026.s210_8'],
      note: { es: 'protección GFCI exigida para tomas de secadora/estufa', en: 'GFCI protection required for dryer/range receptacles' },
    },
    {
      id: 'breaker-std',
      when: [{ ref: 'options.proteccion', eq: 'estandar' }],
      item: {
        map: {
          keys: ['calls.circuit.breaker.rating'],
          table: { '30': 'breaker-2p-30', '40': 'breaker-2p-40', '50': 'breaker-2p-50' },
        },
      },
      qty: { fixed: 1 },
    },
    {
      id: 'hots',
      item: { map: { keys: ['calls.circuit.conductor.size'], table: WIRE_TABLE } },
      qty: {
        lengthWithWastage: {
          lengthM: 'answers.runLengthM',
          wastagePercent: 'options.wastagePercent',
          multiplier: 2,
        },
      },
      note: { es: 'las 2 fases', en: 'the 2 hot conductors' },
    },
    {
      id: 'neutral',
      item: { map: { keys: ['calls.circuit.conductor.size'], table: WIRE_TABLE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
      citations: ['nec2026.s220_61'],
      note: { es: 'neutro (blanco) — la toma de 4 ranuras lo exige', en: 'neutral (white) — the 4-slot receptacle requires it' },
    },
    {
      id: 'egc-wire',
      item: { map: { keys: ['calls.egc.size'], table: WIRE_TABLE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
      citations: ['nec2026.t250_122'],
      note: { es: 'conductor de tierra (verde)', en: 'equipment grounding conductor (green)' },
    },
    {
      id: 'receptacle',
      item: {
        map: {
          keys: ['derived.receptacle.rating'],
          table: { '30': 'receptacle-nema-14-30', '50': 'receptacle-nema-14-50' },
        },
      },
      qty: { fixed: 1 },
      citations: ['nec2026.s210_21_b'],
    },
    {
      id: 'box',
      item: { itemId: 'box-2x4-deep' },
      qty: { fixed: 1 },
      citations: ['nec2026.t314_16_a'],
      note: { es: 'caja profunda para la toma', en: 'deep box for the receptacle' },
    },

    // -------- conduit run, per type (same rules as ac-minisplit) --------
    {
      id: 'conduit-emt',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'emt-tube-12', '3/4': 'emt-tube-34' } } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
    },
    {
      id: 'conduit-pvc',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'pvc-tube-12', '3/4': 'pvc-tube-34' } } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
    },
    {
      id: 'conduit-lfnc',
      when: [{ ref: 'options.conduitType', eq: 'lfnc' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'lfnc-12', '3/4': 'lfnc-34' } } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
    },
    {
      id: 'emt-connectors',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'emt-connector-12', '3/4': 'emt-connector-34' } } },
      qty: { fixed: 2 },
    },
    {
      id: 'emt-couplings',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'emt-coupling-12', '3/4': 'emt-coupling-34' } } },
      qty: { perInterval: { lengthM: 'answers.runLengthM', intervalM: 3.05, plus: 0 } },
      note: { es: 'una unión entre tramos de 10 pies', en: 'one coupling between 10-ft sticks' },
    },
    {
      id: 'emt-elbows',
      when: [
        { ref: 'options.conduitType', eq: 'emt' },
        { ref: 'options.bends', eq: 'curvas' },
      ],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'emt-elbow-12', '3/4': 'emt-elbow-34' } } },
      qty: { ref: 'options.bendCount' },
    },
    {
      id: 'pvc-elbows',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'pvc-elbow-12', '3/4': 'pvc-elbow-34' } } },
      qty: { ref: 'options.bendCount' },
    },
    {
      id: 'pvc-adapters',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'pvc-adapter-12', '3/4': 'pvc-adapter-34' } } },
      qty: { fixed: 2 },
    },
    {
      id: 'pvc-cement',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: { itemId: 'pvc-cement' },
      qty: { fixed: 1 },
    },
    {
      id: 'lfnc-connectors',
      when: [{ ref: 'options.conduitType', eq: 'lfnc' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'lfnc-connector-12', '3/4': 'lfnc-connector-34' } } },
      qty: { fixed: 2 },
    },
    {
      id: 'emt-straps',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'strap-12', '3/4': 'strap-34' } } },
      qty: { perInterval: { lengthM: 'answers.runLengthM', intervalM: 3, plus: 1 } },
      citations: ['nec2026.s358_30'],
    },
    {
      id: 'pvc-straps',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'strap-12', '3/4': 'strap-34' } } },
      qty: { perInterval: { lengthM: 'answers.runLengthM', intervalM: 0.9, plus: 1 } },
      citations: ['nec2026.s352_30'],
    },
    {
      id: 'lfnc-straps',
      when: [{ ref: 'options.conduitType', eq: 'lfnc' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'strap-12', '3/4': 'strap-34' } } },
      qty: { perInterval: { lengthM: 'answers.runLengthM', intervalM: 0.9, plus: 1 } },
      citations: ['nec2026.s356_30'],
    },
    {
      id: 'bender',
      when: [
        { ref: 'options.conduitType', eq: 'emt' },
        { ref: 'options.bends', eq: 'dobladora' },
      ],
      item: { itemId: 'bender-12' },
      qty: { fixed: 1 },
      optional: true,
      note: {
        es: 'herramienta — compra única; reemplaza las curvas de fábrica',
        en: 'tool — one-time purchase; replaces factory elbows',
      },
    },
  ],

  warnings: [
    {
      id: 'gfci-estandar',
      when: { ref: 'options.proteccion', eq: 'estandar' },
      severity: 'off-code',
      citations: ['nec2026.s210_8'],
      text: {
        es: 'El NEC exige protección GFCI para tomas de secadora y estufa. Con térmico estándar la instalación queda fuera de norma — verifique con electricista autorizado.',
        en: 'The NEC requires GFCI protection for dryer and range receptacles. A standard breaker leaves the install out of code — verify with a licensed electrician.',
      },
    },
    {
      id: 'panel-space',
      when: { ref: 'answers.panelSlots', eq: 'no' },
      text: {
        es: 'No hay espacio en el panel para un térmico de 2 polos: considere un subpanel o reorganizar circuitos (verificar con electricista autorizado).',
        en: 'No panel space for a 2-pole breaker: consider a subpanel or rearranging circuits (verify with a licensed electrician).',
      },
    },
  ],

  assumptions: [
    {
      key: 'toma240-neutral-full-size',
      en: 'The neutral is sized equal to the hots — 220.61 would allow a smaller one for ranges/dryers; equal size is the conservative local practice.',
      es: 'El neutro se dimensiona igual a las fases — 220.61 permitiría uno menor para estufas/secadoras; igualarlo es la práctica local conservadora.',
      citations: ['nec2026.s220_61'],
    },
    {
      key: 'toma240-cord-included',
      en: 'The appliance cord and plug come with the appliance; only the fixed installation is listed.',
      es: 'El cordón y la clavija vienen con el aparato; solo se lista la instalación fija.',
    },
  ],
}
