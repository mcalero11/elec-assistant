import type { JobTemplate, ValueSpec } from '../catalog/types.js'

const CU_WIRE = {
  '10': 'thhn-cu-10',
  '8': 'thhn-cu-8',
  '6': 'thhn-cu-6',
  '4': 'thhn-cu-4',
}

const AL_WIRE = {
  '8': 'wire-al-8',
  '6': 'wire-al-6',
  '4': 'wire-al-4',
  '3': 'wire-al-3',
  '2': 'wire-al-2',
}

const FEEDER_A: ValueSpec = {
  $cond: {
    if: { ref: 'answers.feederA', eq: '40' },
    then: 40,
    else: { $cond: { if: { ref: 'answers.feederA', eq: '50' }, then: 50, else: 60 } },
  },
}

const MATERIAL: ValueSpec = {
  $cond: { if: { ref: 'options.material', eq: 'cobre' }, then: 'copper', else: 'aluminum' },
}

/**
 * Seed template #3: alimentador a construcción separada (bodega/anexo) — the
 * long-run voltage-drop case of the PRD. A 240 V feeder (2 hots + full-size
 * neutral + EGC) sized to the chosen breaker (215.2), with the Cu/Al material
 * toggle (long runs are where aluminum wins on cost), a configurable drop
 * limit (3% recommended / 5% max, 210.19 note), and the separate-structure
 * grounding package of 250.32: subpanel with isolated neutral, GEC per Table
 * 250.66 to two ground rods (250.53(A)(2)).
 */
export const alimentadorBodegaTemplate: JobTemplate = {
  id: 'alimentador-bodega',
  version: 1,
  name: {
    es: 'Alimentador a bodega o anexo',
    en: 'Feeder to a shed or annex',
  },
  synonyms: ['bodega', 'anexo', 'alimentador', 'subpanel', 'cuarto aparte', 'feeder', 'construcción separada'],

  questions: [
    {
      id: 'feederA',
      type: 'choice',
      // Capped at 60 A to keep the reachable wire/conduit set closed (v1 scope).
      default: '60',
      choices: [
        { value: '40', label: { es: '40 A', en: '40 A' } },
        { value: '50', label: { es: '50 A', en: '50 A' } },
        { value: '60', label: { es: '60 A', en: '60 A' } },
      ],
      label: { es: 'Térmico del alimentador en el panel principal', en: 'Feeder breaker at the main panel' },
      urlKey: 'fa',
      termId: 'alimentador',
    },
    {
      id: 'runLengthM',
      type: 'number',
      unit: 'm',
      min: 5,
      max: 50,
      step: 1,
      default: 30,
      label: { es: 'Distancia del panel principal a la bodega (un solo sentido)', en: 'One-way run to the structure' },
      urlKey: 'l',
    },
    {
      id: 'routing',
      type: 'choice',
      default: 'subterraneo',
      choices: [
        { value: 'subterraneo', label: { es: 'Enterrado (zanja)', en: 'Underground (trench)' } },
        { value: 'superficial', label: { es: 'Superficial (pared/cerco)', en: 'Surface (wall/fence)' } },
      ],
      label: { es: 'Recorrido del alimentador', en: 'Feeder routing' },
      urlKey: 'rt',
    },
    {
      // Buried runs stay cooler; surface runs get the hot-country default.
      id: 'ambientC',
      type: 'number',
      unit: '°C',
      min: 25,
      max: 50,
      step: 1,
      default: {
        $cond: { if: { ref: 'answers.routing', eq: 'subterraneo' }, then: 30, else: 35 },
      },
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
      label: { es: '¿Hay espacio en el panel principal para un térmico de 2 polos?', en: 'Main-panel space for a 2-pole breaker?' },
      urlKey: 'p',
    },
  ],

  options: [
    {
      id: 'material',
      type: 'choice',
      default: 'cobre',
      choices: [
        { value: 'cobre', label: { es: 'Cobre', en: 'Copper' } },
        { value: 'aluminio', label: { es: 'Aluminio (más barato en tramos largos)', en: 'Aluminum (cheaper on long runs)' } },
      ],
      label: { es: 'Material de los conductores', en: 'Conductor material' },
      urlKey: 'mat',
    },
    {
      id: 'dropLimit',
      type: 'choice',
      default: '3',
      choices: [
        { value: '3', label: { es: '3% (recomendado)', en: '3% (recommended)' } },
        { value: '5', label: { es: '5% (máximo total)', en: '5% (total maximum)' } },
      ],
      label: { es: 'Límite de caída de tensión', en: 'Voltage-drop limit' },
      urlKey: 'dl',
      termId: 'caidaDeTension',
    },
    {
      id: 'subpanelSpaces',
      type: 'choice',
      default: '8',
      choices: [
        { value: '4', label: { es: '4 espacios', en: '4 spaces' } },
        { value: '8', label: { es: '8 espacios', en: '8 spaces' } },
      ],
      label: { es: 'Centro de carga en la bodega', en: 'Load center at the structure' },
      urlKey: 'sp',
      termId: 'centroDeCarga',
    },
    {
      id: 'conduitType',
      type: 'choice',
      default: 'pvc',
      choices: [
        { value: 'emt', label: { es: 'Tubo EMT', en: 'EMT' }, termId: 'emt' },
        { value: 'pvc', label: { es: 'PVC eléctrico', en: 'Electrical PVC' }, termId: 'pvcElectrico' },
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
      disabledWhen: { ref: 'options.conduitType', eq: 'pvc' },
      label: { es: 'Vueltas del recorrido', en: 'Bends' },
      urlKey: 'bd',
    },
    {
      id: 'bendCount',
      type: 'number',
      min: 0,
      max: 8,
      step: 1,
      default: 4,
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
      // Feeder sized to its breaker (215.2); neutral carries imbalance only → 2 CCC.
      id: 'circuit',
      fn: 'sizeCircuit',
      input: {
        loadA: FEEDER_A,
        continuous: false,
        lengthM: { $ref: 'answers.runLengthM' },
        systemVoltage: 240,
        material: MATERIAL,
        insulation: 'THWN-2',
        ambientC: { $ref: 'answers.ambientC' },
        cccCount: 2,
        maxVoltageDropPercent: {
          $cond: { if: { ref: 'options.dropLimit', eq: '3' }, then: 3, else: 5 },
        },
        minBreakerA: FEEDER_A,
      },
    },
    {
      id: 'egc',
      fn: 'egcSize',
      input: {
        ocpdA: { $ref: 'calls.circuit.breaker.rating' },
        material: MATERIAL,
        installedSize: { $ref: 'calls.circuit.conductor.size' },
        requiredSize: { $ref: 'calls.circuit.ampacityMinimumSize' },
      },
    },
    {
      // GEC at the separate structure: bare copper to two rods (250.32, 250.66(A)).
      id: 'gec',
      fn: 'gecSize',
      input: {
        largestUngroundedSize: { $ref: 'calls.circuit.conductor.size' },
        serviceMaterial: MATERIAL,
        material: 'copper',
        electrode: 'rod',
      },
    },
    {
      id: 'conduit',
      fn: 'sizeConduit',
      input: {
        conduitType: {
          $cond: { if: { ref: 'options.conduitType', eq: 'emt' }, then: 'EMT', else: 'PVC-40' },
        },
        minTradeSize: '1/2',
        conductors: [
          {
            // 2 hots + full-size neutral (220.61 simplification).
            size: { $ref: 'calls.circuit.conductor.size' },
            insulation: 'THWN-2',
            count: 3,
          },
          {
            size: { $ref: 'calls.egc.size' },
            insulation: 'THWN-2',
            count: 1,
          },
        ],
      },
    },
  ],

  derived: [],

  parameters: [
    {
      id: 'fases',
      label: { es: 'Fases (2)', en: 'Hots (2)' },
      value: { $ref: 'calls.circuit.conductor.size' },
      unit: 'AWG',
      citationsFrom: 'calls.circuit.conductor',
      citations: ['nec2026.s215_2'],
    },
    {
      id: 'material',
      label: { es: 'Material', en: 'Material' },
      value: {
        $cond: { if: { ref: 'options.material', eq: 'cobre' }, then: 'cobre', else: 'aluminio' },
      },
      citations: ['nec2026.t310_16'],
    },
    {
      id: 'neutro',
      label: { es: 'Neutro (mismo calibre)', en: 'Neutral (same size)' },
      value: { $ref: 'calls.circuit.conductor.size' },
      unit: 'AWG',
      citations: ['nec2026.s220_61'],
    },
    {
      id: 'breaker',
      label: { es: 'Térmico (2 polos, panel principal)', en: 'Breaker (2-pole, main panel)' },
      value: { $ref: 'calls.circuit.breaker.rating' },
      unit: 'A',
      citationsFrom: 'calls.circuit.breaker',
    },
    {
      id: 'egc',
      label: { es: 'Tierra del alimentador (EGC)', en: 'Feeder grounding conductor (EGC)' },
      value: { $ref: 'calls.egc.size' },
      unit: 'AWG',
      citationsFrom: 'calls.egc',
    },
    {
      id: 'gec',
      label: { es: 'Conductor a las varillas (GEC)', en: 'Grounding electrode conductor (GEC)' },
      value: { $ref: 'calls.gec.size' },
      unit: 'AWG',
      citationsFrom: 'calls.gec',
      citations: ['nec2026.s250_32'],
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
      id: 'breaker',
      item: {
        map: {
          keys: ['calls.circuit.breaker.rating'],
          table: { '40': 'breaker-2p-40', '50': 'breaker-2p-50', '60': 'breaker-2p-60' },
        },
      },
      qty: { fixed: 1 },
    },
    {
      id: 'hots-cu',
      when: [{ ref: 'options.material', eq: 'cobre' }],
      item: { map: { keys: ['calls.circuit.conductor.size'], table: CU_WIRE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent', multiplier: 2 },
      },
      note: { es: 'las 2 fases', en: 'the 2 hot conductors' },
    },
    {
      id: 'hots-al',
      when: [{ ref: 'options.material', eq: 'aluminio' }],
      item: { map: { keys: ['calls.circuit.conductor.size'], table: AL_WIRE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent', multiplier: 2 },
      },
      note: { es: 'las 2 fases (aluminio: use conectores y antioxidante aptos)', en: 'the 2 hots (aluminum: use rated connectors and antioxidant)' },
    },
    {
      id: 'neutral-cu',
      when: [{ ref: 'options.material', eq: 'cobre' }],
      item: { map: { keys: ['calls.circuit.conductor.size'], table: CU_WIRE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
      citations: ['nec2026.s220_61'],
      note: { es: 'neutro (blanco)', en: 'neutral (white)' },
    },
    {
      id: 'neutral-al',
      when: [{ ref: 'options.material', eq: 'aluminio' }],
      item: { map: { keys: ['calls.circuit.conductor.size'], table: AL_WIRE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
      citations: ['nec2026.s220_61'],
      note: { es: 'neutro (blanco)', en: 'neutral (white)' },
    },
    {
      id: 'egc-cu',
      when: [{ ref: 'options.material', eq: 'cobre' }],
      item: { map: { keys: ['calls.egc.size'], table: CU_WIRE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
      citations: ['nec2026.t250_122'],
      note: { es: 'tierra del alimentador (verde)', en: 'feeder EGC (green)' },
    },
    {
      id: 'egc-al',
      when: [{ ref: 'options.material', eq: 'aluminio' }],
      item: { map: { keys: ['calls.egc.size'], table: AL_WIRE } },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
      citations: ['nec2026.t250_122'],
      note: { es: 'tierra del alimentador (verde)', en: 'feeder EGC (green)' },
    },
    {
      // The calc can ask for #8; #6 bare is the local practical minimum and
      // avoids the 250.64(B) protection requirement for smaller GECs.
      id: 'gec-wire',
      item: { map: { keys: ['calls.gec.size'], table: { '8': 'wire-cu-bare-6', '6': 'wire-cu-bare-6' } } },
      qty: { fixed: 3 },
      citations: ['nec2026.t250_66'],
      note: {
        es: 'bajada a las varillas — se usa #6 desnudo como mínimo práctico (menor exigiría protección física, 250.64(B))',
        en: 'run to the rods — #6 bare used as the practical minimum (smaller would need physical protection, 250.64(B))',
      },
    },
    {
      id: 'ground-rods',
      item: { itemId: 'ground-rod-58' },
      qty: { fixed: 2 },
      citations: ['nec2026.s250_53', 'nec2026.s250_32'],
      note: { es: 'dos varillas salvo medir ≤ 25 Ω con una', en: 'two rods unless one measures ≤ 25 Ω' },
    },
    {
      id: 'rod-clamps',
      item: { itemId: 'rod-clamp-58' },
      qty: { fixed: 2 },
    },
    {
      id: 'loadcenter',
      item: {
        map: { keys: ['options.subpanelSpaces'], table: { '4': 'loadcenter-4', '8': 'loadcenter-8' } },
      },
      qty: { fixed: 1 },
      citations: ['nec2026.s250_32'],
      note: { es: 'neutro aislado de la barra de tierra en el subpanel', en: 'neutral isolated from the ground bar at the subpanel' },
    },

    // -------- conduit run, per type --------
    {
      id: 'conduit-emt',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'emt-tube-12', '3/4': 'emt-tube-34', '1': 'emt-tube-1' },
        },
      },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
    },
    {
      id: 'conduit-pvc',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'pvc-tube-12', '3/4': 'pvc-tube-34', '1': 'pvc-tube-1' },
        },
      },
      qty: {
        lengthWithWastage: { lengthM: 'answers.runLengthM', wastagePercent: 'options.wastagePercent' },
      },
    },
    {
      id: 'emt-connectors',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'emt-connector-12', '3/4': 'emt-connector-34', '1': 'emt-connector-1' },
        },
      },
      qty: { fixed: 2 },
    },
    {
      id: 'emt-couplings',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'emt-coupling-12', '3/4': 'emt-coupling-34', '1': 'emt-coupling-1' },
        },
      },
      qty: { perInterval: { lengthM: 'answers.runLengthM', intervalM: 3.05, plus: 0 } },
      note: { es: 'una unión entre tramos de 10 pies', en: 'one coupling between 10-ft sticks' },
    },
    {
      id: 'emt-elbows',
      when: [
        { ref: 'options.conduitType', eq: 'emt' },
        { ref: 'options.bends', eq: 'curvas' },
      ],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'emt-elbow-12', '3/4': 'emt-elbow-34', '1': 'emt-elbow-1' },
        },
      },
      qty: { ref: 'options.bendCount' },
    },
    {
      id: 'pvc-elbows',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'pvc-elbow-12', '3/4': 'pvc-elbow-34', '1': 'pvc-elbow-1' },
        },
      },
      qty: { ref: 'options.bendCount' },
    },
    {
      id: 'pvc-adapters',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'pvc-adapter-12', '3/4': 'pvc-adapter-34', '1': 'pvc-adapter-1' },
        },
      },
      qty: { fixed: 2 },
    },
    {
      id: 'pvc-cement',
      when: [{ ref: 'options.conduitType', eq: 'pvc' }],
      item: { itemId: 'pvc-cement' },
      qty: { fixed: 1 },
    },
    {
      // Surface EMT gets strapped; a buried PVC run doesn't need straps along the trench.
      id: 'emt-straps',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'strap-12', '3/4': 'strap-34', '1': 'strap-1' },
        },
      },
      qty: { perInterval: { lengthM: 'answers.runLengthM', intervalM: 3, plus: 1 } },
      citations: ['nec2026.s358_30'],
    },
    {
      id: 'pvc-straps',
      when: [
        { ref: 'options.conduitType', eq: 'pvc' },
        { ref: 'answers.routing', eq: 'superficial' },
      ],
      item: {
        map: {
          keys: ['calls.conduit.tradeSize'],
          table: { '1/2': 'strap-12', '3/4': 'strap-34', '1': 'strap-1' },
        },
      },
      qty: { perInterval: { lengthM: 'answers.runLengthM', intervalM: 0.9, plus: 1 } },
      citations: ['nec2026.s352_30'],
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
      id: 'burial-depth',
      when: { ref: 'answers.routing', eq: 'subterraneo' },
      text: {
        es: 'Recorrido enterrado: la tubería debe ir a la profundidad mínima de la Tabla 300.5 (típicamente ≥ 45 cm en PVC bajo tierra); la zanja no está incluida en la lista de materiales.',
        en: 'Buried run: the raceway needs the Table 300.5 minimum depth (typically ≥ 45 cm for buried PVC); trenching is not in the materials list.',
      },
    },
    {
      id: 'panel-space',
      when: { ref: 'answers.panelSlots', eq: 'no' },
      text: {
        es: 'No hay espacio en el panel principal para un térmico de 2 polos: considere reorganizar circuitos (verificar con electricista autorizado).',
        en: 'No main-panel space for a 2-pole breaker: consider rearranging circuits (verify with a licensed electrician).',
      },
    },
  ],

  assumptions: [
    {
      key: 'feeder-sized-to-breaker',
      en: 'The feeder is sized to the chosen breaker rating, not to a load calculation — run the load calculator if the structure carries heavy loads.',
      es: 'El alimentador se dimensiona al térmico elegido, no a un cálculo de carga — use la calculadora de carga si la bodega llevará cargas grandes.',
      citations: ['nec2026.s215_2'],
    },
    {
      key: 'feeder-neutral-full-size',
      en: 'The neutral is sized equal to the hots (a 220.61 simplification, conservative).',
      es: 'El neutro se dimensiona igual a las fases (simplificación conservadora de 220.61).',
      citations: ['nec2026.s220_61'],
    },
    {
      key: 'feeder-subpanel-isolation',
      en: 'At the separate structure the neutral bar must be isolated from the ground bar, with its own grounding electrode system (250.32).',
      es: 'En la construcción separada el neutro va aislado de la barra de tierra, con su propio sistema de electrodos (250.32).',
      citations: ['nec2026.s250_32'],
    },
  ],
}
