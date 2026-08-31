import type { JobTemplate, ValueSpec } from '../catalog/types.js'

const WIRE_TABLE = {
  '14': 'thhn-cu-14',
  '12': 'thhn-cu-12',
  '10': 'thhn-cu-10',
  '8': 'thhn-cu-8',
  '6': 'thhn-cu-6',
}

/** 15 A → circuito de iluminación típico; 20 A → tomas de uso general. */
const LOAD_BY_BREAKER: ValueSpec = {
  $cond: { if: { ref: 'answers.breakerA', eq: '15' }, then: 15, else: 20 },
}

/**
 * Seed template #5: circuito de tomacorrientes o iluminación adicional.
 * A 120 V branch circuit sized at its full breaker rating with a 5% total
 * voltage-drop allowance, N outlet/luminaire points, and a 314.16 box-fill
 * check per point (4 through-conductors + 2 EGCs + the device yoke) — the
 * check is honest: #12 singles through a typical device box genuinely
 * overflow it, and the warning says to use a square box with a mud ring.
 * GFCI arrives as a feed-through FIRST receptacle (cheaper than a GFCI
 * breaker, standard local practice) protecting the downstream ones (210.8).
 */
export const circuitoRamalTemplate: JobTemplate = {
  id: 'circuito-ramal',
  version: 1,
  name: {
    es: 'Tomacorrientes o iluminación adicional',
    en: 'Additional receptacles or lighting circuit',
  },
  synonyms: ['tomas', 'tomacorriente', 'luces', 'luminarias', 'iluminación', 'circuito nuevo', 'apagador', 'un circuito más'],

  questions: [
    {
      id: 'circuitKind',
      type: 'choice',
      default: 'tomas',
      choices: [
        { value: 'tomas', label: { es: 'Tomacorrientes', en: 'Receptacles' } },
        { value: 'iluminacion', label: { es: 'Iluminación', en: 'Lighting' } },
      ],
      label: { es: '¿Qué alimenta el circuito?', en: 'What does the circuit feed?' },
      urlKey: 'k',
    },
    {
      id: 'pointCount',
      type: 'number',
      unit: '',
      min: 1,
      max: 10,
      step: 1,
      default: 4,
      label: { es: '¿Cuántas tomas o luminarias?', en: 'How many outlets or luminaires?' },
      urlKey: 'n',
      ui: 'field',
    },
    {
      id: 'switchCount',
      type: 'number',
      unit: '',
      min: 0,
      max: 4,
      step: 1,
      default: {
        $cond: { if: { ref: 'answers.circuitKind', eq: 'iluminacion' }, then: 1, else: 0 },
      },
      label: { es: '¿Cuántos apagadores?', en: 'How many switches?' },
      urlKey: 'sw',
      ui: 'field',
    },
    {
      id: 'breakerA',
      type: 'choice',
      default: {
        $cond: { if: { ref: 'answers.circuitKind', eq: 'tomas' }, then: '20', else: '15' },
      },
      choices: [
        { value: '15', label: { es: '15 A (#14)', en: '15 A (#14)' } },
        { value: '20', label: { es: '20 A (#12)', en: '20 A (#12)' } },
      ],
      label: { es: 'Térmico del circuito', en: 'Circuit breaker' },
      urlKey: 'b',
      termId: 'breaker',
    },
    {
      id: 'runLengthM',
      type: 'number',
      unit: 'm',
      min: 5,
      max: 60,
      step: 1,
      default: 20,
      label: { es: 'Recorrido total (panel → última caja)', en: 'Total run (panel → last box)' },
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
        { value: 'si', label: { es: 'Sí, hay 1 espacio', en: 'Yes, 1 slot free' } },
        { value: 'no', label: { es: 'No hay espacio', en: 'No space' } },
      ],
      label: { es: '¿Hay espacio en el panel para un térmico de 1 polo?', en: 'Panel space for a 1-pole breaker?' },
      urlKey: 'p',
    },
  ],

  options: [
    {
      id: 'proteccion',
      type: 'choice',
      default: 'gfci',
      choices: [
        { value: 'gfci', label: { es: 'Primera toma GFCI (protege el resto)', en: 'First receptacle GFCI (feeds through)' }, termId: 'gfci' },
        { value: 'estandar', label: { es: 'Todas estándar', en: 'All standard' } },
      ],
      disabledWhen: { ref: 'answers.circuitKind', eq: 'iluminacion' },
      label: { es: 'Protección GFCI', en: 'GFCI protection' },
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
      // Sized at the full breaker rating (conservative for a multi-outlet
      // circuit) with the 5% TOTAL drop allowance of the 210.19 note.
      id: 'circuit',
      fn: 'sizeCircuit',
      input: {
        loadA: LOAD_BY_BREAKER,
        continuous: false,
        lengthM: { $ref: 'answers.runLengthM' },
        systemVoltage: 120,
        material: 'copper',
        insulation: 'THHN',
        ambientC: { $ref: 'answers.ambientC' },
        cccCount: 2,
        maxVoltageDropPercent: 5,
        minBreakerA: LOAD_BY_BREAKER,
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
            insulation: 'THHN',
            count: 2,
          },
          {
            size: { $ref: 'calls.egc.size' },
            insulation: 'THHN',
            count: 1,
          },
        ],
      },
    },
    {
      // 314.16 check for a mid-run point: 2 conductors in + 2 out + 2 EGCs,
      // plus the device yoke on receptacle circuits. Receptacles check the
      // large 100×54 device box; luminaires the 100×38 octagonal.
      id: 'boxfill',
      fn: 'boxFill',
      // A probe: this asks whether the typical device box would do, and the
      // 'box-fill' warning below phrases the answer («use a square box with a
      // mud ring»). Using a bigger box is the fix, so it is not a code failure.
      probe: true,
      input: {
        boxId: {
          $cond: { if: { ref: 'answers.circuitKind', eq: 'tomas' }, then: 'dev-100x54x54', else: 'oct-100x38' },
        },
        conductors: [{ size: { $ref: 'calls.circuit.conductor.size' }, count: 4 }],
        deviceYokes: {
          $cond: {
            if: { ref: 'answers.circuitKind', eq: 'tomas' },
            then: [{ count: 1, largestConductor: { $ref: 'calls.circuit.conductor.size' } }],
            else: [],
          },
        },
        egcCount: 2,
        largestEgc: { $ref: 'calls.egc.size' },
      },
    },
  ],

  derived: [],

  parameters: [
    {
      id: 'conductor',
      label: { es: 'Calibre (cobre)', en: 'Conductor size (copper)' },
      value: { $ref: 'calls.circuit.conductor.size' },
      unit: 'AWG',
      citationsFrom: 'calls.circuit.conductor',
    },
    {
      id: 'breaker',
      label: { es: 'Térmico (1 polo)', en: 'Breaker (1-pole)' },
      value: { $ref: 'calls.circuit.breaker.rating' },
      unit: 'A',
      citationsFrom: 'calls.circuit.breaker',
      citations: ['nec2026.s210_11'],
    },
    {
      id: 'puntos',
      label: { es: 'Puntos del circuito', en: 'Circuit points' },
      value: { $ref: 'answers.pointCount' },
      citations: ['nec2026.s210_52'],
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
      label: { es: 'Caída de tensión al final del recorrido', en: 'Voltage drop at the end of the run' },
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
          table: { '15': 'breaker-1p-15', '20': 'breaker-1p-20' },
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
      note: { es: 'fase + neutro', en: 'hot + neutral' },
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

    // -------- tomas branch --------
    {
      id: 'gfci-first',
      when: [
        { ref: 'answers.circuitKind', eq: 'tomas' },
        { ref: 'options.proteccion', eq: 'gfci' },
      ],
      item: { itemId: 'duplex-gfci' },
      qty: { fixed: 1 },
      citations: ['nec2026.s210_8'],
      note: { es: 'la primera toma protege a las siguientes (feed-through)', en: 'the first receptacle feeds through and protects the rest' },
    },
    {
      id: 'receptacles-rest',
      when: [
        { ref: 'answers.circuitKind', eq: 'tomas' },
        { ref: 'options.proteccion', eq: 'gfci' },
      ],
      item: { itemId: 'duplex-receptacle' },
      qty: { perCount: { count: 'answers.pointCount', plus: -1 } },
    },
    {
      id: 'receptacles-all',
      when: [
        { ref: 'answers.circuitKind', eq: 'tomas' },
        { ref: 'options.proteccion', eq: 'estandar' },
      ],
      item: { itemId: 'duplex-receptacle' },
      qty: { perCount: { count: 'answers.pointCount' } },
    },
    {
      id: 'plates-tomas',
      when: [{ ref: 'answers.circuitKind', eq: 'tomas' }],
      item: { itemId: 'plate-duplex' },
      qty: { perCount: { count: 'answers.pointCount' } },
    },
    {
      id: 'boxes-tomas',
      when: [{ ref: 'answers.circuitKind', eq: 'tomas' }],
      item: {
        map: {
          keys: ['options.conduitType'],
          table: { emt: 'box-2x4-metal', pvc: 'box-2x4-pvc', lfnc: 'box-2x4-pvc' },
        },
      },
      qty: { perCount: { count: 'answers.pointCount' } },
      citations: ['nec2026.t314_16_a'],
    },

    // -------- iluminación branch --------
    {
      id: 'boxes-luz',
      when: [{ ref: 'answers.circuitKind', eq: 'iluminacion' }],
      item: {
        map: {
          keys: ['options.conduitType'],
          table: { emt: 'box-octagonal-metal', pvc: 'box-octagonal-pvc', lfnc: 'box-octagonal-pvc' },
        },
      },
      qty: { perCount: { count: 'answers.pointCount' } },
      citations: ['nec2026.t314_16_a'],
    },
    {
      id: 'lampholders',
      when: [{ ref: 'answers.circuitKind', eq: 'iluminacion' }],
      item: { itemId: 'lampholder' },
      qty: { perCount: { count: 'answers.pointCount' } },
    },
    {
      id: 'switches',
      when: [{ ref: 'answers.circuitKind', eq: 'iluminacion' }],
      item: { itemId: 'switch-simple' },
      qty: { ref: 'answers.switchCount' },
    },
    {
      id: 'switch-plates',
      when: [{ ref: 'answers.circuitKind', eq: 'iluminacion' }],
      item: { itemId: 'plate-switch' },
      qty: { ref: 'answers.switchCount' },
    },
    {
      id: 'switch-boxes',
      when: [{ ref: 'answers.circuitKind', eq: 'iluminacion' }],
      item: {
        map: {
          keys: ['options.conduitType'],
          table: { emt: 'box-2x4-metal', pvc: 'box-2x4-pvc', lfnc: 'box-2x4-pvc' },
        },
      },
      qty: { ref: 'answers.switchCount' },
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
    {
      // One connector per box entry/exit (2 per point) plus the panel end.
      id: 'emt-connectors',
      when: [{ ref: 'options.conduitType', eq: 'emt' }],
      item: { map: { keys: ['calls.conduit.tradeSize'], table: { '1/2': 'emt-connector-12', '3/4': 'emt-connector-34' } } },
      qty: { perCount: { count: 'answers.pointCount', each: 2, plus: 1 } },
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
      qty: { perCount: { count: 'answers.pointCount', each: 2, plus: 1 } },
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
      qty: { perCount: { count: 'answers.pointCount', each: 2, plus: 1 } },
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
      id: 'box-fill',
      when: { ref: 'calls.boxfill.fits', eq: false },
      text: {
        es: 'El relleno de caja excede la caja de dispositivo típica con este calibre (314.16): use caja cuadrada con anillo de repello en cada punto, o verifique en la calculadora de relleno de cajas.',
        en: 'Box fill exceeds the typical device box at this conductor size (314.16): use a square box with a mud ring at each point, or verify in the box-fill calculator.',
      },
    },
    {
      id: 'gfci-estandar',
      when: [
        { ref: 'answers.circuitKind', eq: 'tomas' },
        { ref: 'options.proteccion', eq: 'estandar' },
      ],
      // 'conditional', not 'off-code': whether GFCI is required genuinely depends
      // on where the receptacles land, which the template cannot know.
      severity: 'conditional',
      citations: ['nec2026.s210_8'],
      text: {
        es: 'Según el lugar de las tomas (cocina, baño, exterior, lavandería, cochera), el NEC exige protección GFCI — verifique con electricista autorizado.',
        en: 'Depending on receptacle location (kitchen, bath, outdoors, laundry, garage), the NEC requires GFCI protection — verify with a licensed electrician.',
      },
    },
    {
      id: 'panel-space',
      when: { ref: 'answers.panelSlots', eq: 'no' },
      text: {
        es: 'No hay espacio en el panel para un térmico de 1 polo: considere un subpanel o reorganizar circuitos (verificar con electricista autorizado).',
        en: 'No panel space for a 1-pole breaker: consider a subpanel or rearranging circuits (verify with a licensed electrician).',
      },
    },
  ],

  assumptions: [
    {
      key: 'ramal-spacing-not-verified',
      en: 'Receptacle spacing/placement rules (210.52) are not verified by this app — lay out the points with a licensed electrician.',
      es: 'La app no verifica las reglas de ubicación de tomas (210.52) — distribuya los puntos con un electricista autorizado.',
      citations: ['nec2026.s210_52'],
    },
    {
      key: 'ramal-full-rating',
      en: 'The circuit is sized at the full breaker rating with the 5% total voltage-drop allowance — conservative for a multi-outlet circuit.',
      es: 'El circuito se dimensiona a la corriente completa del térmico con el límite de caída total del 5% — conservador para un circuito de varias tomas.',
      citations: ['nec2026.s210_11', 'nec2026.in210_19_vd'],
    },
    {
      key: 'ramal-switch-loop-wastage',
      en: 'Switch-loop and inter-box jumper wire is covered by the wastage allowance.',
      es: 'El alambre de los apagadores y puentes entre cajas queda cubierto por el desperdicio.',
    },
  ],
}
