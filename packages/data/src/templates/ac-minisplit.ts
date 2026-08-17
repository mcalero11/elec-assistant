import type { JobTemplate, ValueSpec } from '../catalog/types.js'

/** Wet-location rule (PRD US-1): outdoor routing switches to a wet-rated 90 °C insulation. */
const INSULATION_BY_LOCATION: ValueSpec = {
  $cond: {
    if: { ref: 'answers.location', eq: 'exterior' },
    then: 'THWN-2',
    else: 'THHN',
  },
}

const WIRE_TABLE = {
  '14': 'thhn-cu-14',
  '12': 'thhn-cu-12',
  '10': 'thhn-cu-10',
  '8': 'thhn-cu-8',
  '6': 'thhn-cu-6',
}

/**
 * Seed template #1: aire acondicionado mini-split (240 V circuit + disconnect + whip).
 * Declarative data interpreted by @elec-assistant/engine runTemplate — the engine-call
 * graph chains sizeCircuit → egcSize → sizeConduit exactly like the composition idiom
 * documented in conduit-fill.ts.
 */
export const acMinisplitTemplate: JobTemplate = {
  id: 'ac-minisplit',
  version: 1,
  name: {
    es: 'Aire acondicionado mini-split',
    en: 'Mini-split air conditioner',
  },
  synonyms: ['aire', 'ac', 'a/c', 'minisplit', 'mini split', 'split', 'aire acondicionado'],

  questions: [
    {
      id: 'device',
      type: 'preset',
      catalog: 'ac-presets',
      default: 'ac-12k',
      manualFields: ['mcaA', 'mocpA'],
      label: { es: 'Capacidad del equipo (BTU)', en: 'Unit capacity (BTU)' },
    },
    {
      id: 'runLengthM',
      type: 'number',
      unit: 'm',
      min: 1,
      max: 60,
      step: 1,
      default: 10,
      label: { es: 'Distancia del panel al equipo (un solo sentido)', en: 'One-way run length from panel' },
    },
    {
      id: 'location',
      type: 'choice',
      default: 'exterior',
      choices: [
        { value: 'interior', label: { es: 'Interior (seco)', en: 'Indoor (dry)' } },
        { value: 'exterior', label: { es: 'Exterior (intemperie)', en: 'Outdoor (wet)' } },
      ],
      label: { es: 'Recorrido de la tubería', en: 'Conduit routing' },
    },
    {
      id: 'panelSlots',
      type: 'choice',
      default: '2polos',
      choices: [
        { value: '2polos', label: { es: 'Sí, hay 2 espacios', en: 'Yes, 2 slots free' } },
        { value: 'ninguno', label: { es: 'No hay espacio', en: 'No space' } },
      ],
      label: { es: '¿Hay espacio en el panel para un térmico de 2 polos?', en: 'Panel space for a 2-pole breaker?' },
    },
  ],

  options: [
    {
      id: 'conduitType',
      type: 'choice',
      default: 'emt',
      choices: [
        { value: 'emt', label: { es: 'Tubo EMT', en: 'EMT' } },
        { value: 'pvc', label: { es: 'PVC eléctrico', en: 'Electrical PVC' } },
        { value: 'lfnc', label: { es: 'Poliducto (manguera)', en: 'Flexible (LFNC)' } },
      ],
      label: { es: 'Tipo de tubería', en: 'Conduit type' },
    },
    {
      id: 'bends',
      type: 'choice',
      default: 'curvas',
      choices: [
        { value: 'curvas', label: { es: 'Comprar curvas', en: 'Buy factory elbows' } },
        { value: 'dobladora', label: { es: 'Doblar con dobladora', en: 'Field-bend with a bender' } },
      ],
      disabledWhen: { ref: 'options.conduitType', in: ['lfnc', 'pvc'] },
      label: { es: 'Vueltas del recorrido', en: 'Bends' },
    },
    {
      id: 'bendCount',
      type: 'number',
      min: 0,
      max: 8,
      step: 1,
      default: 3,
      label: { es: 'Número de vueltas de 90°', en: 'Number of 90° bends' },
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
    },
  ],

  calls: [
    {
      id: 'circuit',
      fn: 'sizeCircuit',
      input: {
        loadA: { $ref: 'answers.device.mcaA' },
        continuous: true,
        lengthM: { $ref: 'answers.runLengthM' },
        systemVoltage: 240,
        material: 'copper',
        insulation: INSULATION_BY_LOCATION,
        cccCount: 2,
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
            size: { $ref: 'calls.circuit.conductor.size' },
            insulation: INSULATION_BY_LOCATION,
            count: 2,
          },
          {
            size: { $ref: 'calls.egc.size' },
            insulation: INSULATION_BY_LOCATION,
            count: 1,
          },
        ],
      },
    },
  ],

  derived: [
    {
      id: 'disconnect',
      kind: 'min-rating-at-least',
      ratings: [30, 60],
      atLeast: { $ref: 'calls.circuit.breaker.rating' },
      citations: ['nec2026.s440_14'],
      assumption: {
        key: 'disconnect-nonfused',
        en: 'Non-fused disconnect sized to the smallest standard rating at or above the breaker; NEMA 3R housing suits outdoor mounting.',
        es: 'Desconectador sin fusibles dimensionado al valor estándar más pequeño igual o mayor al térmico; caja NEMA 3R apta para exterior.',
      },
      label: { es: 'Desconectador', en: 'Disconnect' },
    },
  ],

  parameters: [
    {
      id: 'conductor',
      label: { es: 'Calibre (cobre)', en: 'Conductor size (copper)' },
      value: { $ref: 'calls.circuit.conductor.size' },
      unit: 'AWG',
      citationsFrom: 'calls.circuit.conductor',
    },
    {
      id: 'insulation',
      label: { es: 'Aislamiento', en: 'Insulation' },
      value: INSULATION_BY_LOCATION,
      citations: ['nec2026.s110_14_c'],
    },
    {
      id: 'breaker',
      label: { es: 'Térmico (2 polos)', en: 'Breaker (2-pole)' },
      value: { $ref: 'calls.circuit.breaker.rating' },
      unit: 'A',
      citationsFrom: 'calls.circuit.breaker',
    },
    {
      id: 'mocp',
      label: { es: 'MOCP de placa (máximo permitido)', en: 'Nameplate MOCP (maximum permitted)' },
      value: { $ref: 'answers.device.mocpA' },
      unit: 'A',
      citations: ['nec2026.s440_4_b', 'nec2026.s440_22'],
    },
    {
      id: 'disconnect',
      label: { es: 'Desconectador (sin fusibles)', en: 'Disconnect (non-fused)' },
      value: { $ref: 'derived.disconnect.rating' },
      unit: 'A',
      citationsFrom: 'derived.disconnect',
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
    },
  ],

  bom: [
    {
      id: 'breaker',
      item: {
        map: {
          keys: ['calls.circuit.breaker.rating'],
          table: {
            '15': 'breaker-2p-15',
            '20': 'breaker-2p-20',
            '25': 'breaker-2p-25',
            '30': 'breaker-2p-30',
            '40': 'breaker-2p-40',
          },
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
      note: { es: 'los 2 conductores de fase', en: 'the 2 hot conductors' },
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

    // -------- conduit run, per type --------
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

    // -------- fittings, per type --------
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

    // -------- securing straps, per type (different NEC spacing) --------
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

    // -------- equipment + tool --------
    {
      id: 'disconnect',
      item: { itemId: 'disconnect-60-3r' },
      qty: { fixed: 1 },
      citations: ['nec2026.s440_14'],
      note: { es: 'NEMA 3R — apto para intemperie', en: 'NEMA 3R — weather-rated' },
    },
    {
      id: 'whip',
      item: { itemId: 'ac-whip-12' },
      qty: { fixed: 1 },
      note: { es: 'conexión flexible del desconectador al condensador', en: 'flexible connection from disconnect to condenser' },
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
      id: 'panel-space',
      when: { ref: 'answers.panelSlots', eq: 'ninguno' },
      text: {
        es: 'No hay espacio en el panel para un térmico de 2 polos: considere un subpanel o reorganizar circuitos (verificar con electricista autorizado).',
        en: 'No panel space for a 2-pole breaker: consider a subpanel or rearranging circuits (verify with a licensed electrician).',
      },
    },
  ],
}
