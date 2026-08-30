import type { JobTemplate, ValueSpec } from '../catalog/types.js'

/** Wet-location rule: bathroom (wet) routing switches to a wet-rated 90 °C insulation. */
const INSULATION_BY_LOCATION: ValueSpec = {
  $cond: {
    if: { ref: 'answers.location', eq: 'humedo' },
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
 * Seed template #2: circuito para ducha eléctrica / calentador de paso.
 * Dedicated appliance circuit (422.10): amps = watts ÷ voltage via $calc, the
 * manufacturer's marked minimum breaker as the `minBreakerA` floor (422.11 —
 * also keeps picks on ratings ferreterías sell), GFCI protection in the BOM by
 * default (210.8/422.5 — user decision), swap-to-standard raises a warning.
 */
export const duchaElectricaTemplate: JobTemplate = {
  id: 'ducha-electrica',
  version: 1,
  name: {
    es: 'Ducha eléctrica / calentador de paso',
    en: 'Electric shower / tankless heater',
  },
  synonyms: ['ducha', 'ducha eléctrica', 'regadera', 'calentador', 'calentador de paso', 'water heater', 'shower'],

  questions: [
    {
      id: 'device',
      type: 'preset',
      catalog: 'heater-presets',
      default: 'ducha-4400',
      sets: { watts: 'watts', voltage: 'voltage', minBreakerA: 'minBreakerA' },
      manualFields: [
        {
          id: 'watts',
          label: { es: 'Potencia de placa (W)', en: 'Nameplate power (W)' },
          default: 4400,
          min: 1500,
          max: 11000,
          step: 100,
          unit: 'W',
          urlKey: 'wt',
        },
        {
          id: 'voltage',
          label: { es: 'Tensión (120 o 240 V)', en: 'Voltage (120 or 240 V)' },
          default: 120,
          min: 120,
          max: 240,
          step: 120,
          unit: 'V',
          urlKey: 'v',
        },
        {
          id: 'minBreakerA',
          label: { es: 'Térmico mínimo del fabricante (A)', en: 'Manufacturer minimum breaker (A)' },
          default: 30,
          min: 15,
          max: 60,
          step: 5,
          unit: 'A',
          urlKey: 'mb',
        },
      ],
      presetNote: {
        es: 'Valores típicos de placa; verifique la placa de SU equipo.',
        en: 'Typical nameplate values; verify YOUR unit’s plate.',
      },
      label: { es: 'Equipo', en: 'Unit' },
      urlKey: 'd',
      termId: 'duchaElectrica',
    },
    {
      id: 'runLengthM',
      type: 'number',
      unit: 'm',
      min: 1,
      max: 40,
      step: 1,
      default: 8,
      label: { es: 'Distancia del panel a la ducha (un solo sentido)', en: 'One-way run length from panel' },
      urlKey: 'l',
    },
    {
      id: 'location',
      type: 'choice',
      default: 'humedo',
      choices: [
        { value: 'humedo', label: { es: 'Baño / zona húmeda', en: 'Bathroom / wet area' } },
        { value: 'seco', label: { es: 'Recorrido seco', en: 'Dry route' } },
      ],
      label: { es: 'Recorrido del circuito', en: 'Circuit routing' },
      urlKey: 'loc',
    },
    {
      // El Salvador runs hot: 30°C (the NEC table basis) undersizes real installs.
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
        { value: 'si', label: { es: 'Sí, hay espacio', en: 'Yes, space free' } },
        { value: 'no', label: { es: 'No hay espacio', en: 'No space' } },
      ],
      label: { es: '¿Hay espacio en el panel para el térmico?', en: 'Panel space for the breaker?' },
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
      id: 'circuit',
      fn: 'sizeCircuit',
      input: {
        loadA: { $calc: { op: 'div', args: [{ $ref: 'answers.device.watts' }, { $ref: 'answers.device.voltage' }] } },
        continuous: false,
        lengthM: { $ref: 'answers.runLengthM' },
        systemVoltage: { $ref: 'answers.device.voltage' },
        material: 'copper',
        insulation: INSULATION_BY_LOCATION,
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
      id: 'amps',
      kind: 'value',
      value: {
        $calc: {
          op: 'round',
          args: [
            { $calc: { op: 'div', args: [{ $ref: 'answers.device.watts' }, { $ref: 'answers.device.voltage' }] } },
            1,
          ],
        },
      },
      citations: ['nec2026.s422_10'],
      label: { es: 'Corriente del equipo', en: 'Unit current' },
    },
  ],

  parameters: [
    {
      id: 'corriente',
      label: { es: 'Corriente del equipo', en: 'Unit current' },
      value: { $ref: 'derived.amps.value' },
      unit: 'A',
      citationsFrom: 'derived.amps',
    },
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
      label: { es: 'Térmico', en: 'Breaker' },
      value: { $ref: 'calls.circuit.breaker.rating' },
      unit: 'A',
      citationsFrom: 'calls.circuit.breaker',
      citations: ['nec2026.s422_11'],
    },
    {
      id: 'polos',
      label: { es: 'Polos del térmico', en: 'Breaker poles' },
      value: {
        $cond: { if: { ref: 'answers.device.voltage', eq: 120 }, then: '1 polo', else: '2 polos' },
      },
      citations: ['nec2026.s422_10'],
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
          keys: ['answers.device.voltage', 'calls.circuit.breaker.rating'],
          table: {
            '120|30': 'breaker-1p-gfci-30',
            '120|40': 'breaker-1p-gfci-40',
            '240|40': 'breaker-2p-gfci-40',
            '240|50': 'breaker-2p-gfci-50',
          },
        },
      },
      qty: { fixed: 1 },
      citations: ['nec2026.s210_8', 'nec2026.s422_5'],
      note: { es: 'protección GFCI exigida en zona de baño', en: 'GFCI protection required in bathroom areas' },
    },
    {
      id: 'breaker-std',
      when: [{ ref: 'options.proteccion', eq: 'estandar' }],
      item: {
        map: {
          keys: ['answers.device.voltage', 'calls.circuit.breaker.rating'],
          table: {
            '120|15': 'breaker-1p-15',
            '120|20': 'breaker-1p-20',
            '120|30': 'breaker-1p-30',
            '120|40': 'breaker-1p-40',
            '120|50': 'breaker-1p-50',
            '240|30': 'breaker-2p-30',
            '240|40': 'breaker-2p-40',
            '240|50': 'breaker-2p-50',
            '240|60': 'breaker-2p-60',
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
      note: { es: 'los 2 conductores del circuito', en: 'the 2 circuit conductors' },
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
      text: {
        es: 'El NEC exige protección GFCI para duchas y calentadores en zona de baño (210.8, 422.5). Con térmico estándar la instalación queda fuera de norma — verifique con electricista autorizado.',
        en: 'The NEC requires GFCI protection for showers and heaters in bathroom areas (210.8, 422.5). A standard breaker leaves the install out of code — verify with a licensed electrician.',
      },
    },
    {
      id: 'high-amps-120',
      when: [
        { ref: 'answers.device.voltage', eq: 120 },
        { ref: 'derived.amps.value', gte: 40 },
      ],
      text: {
        es: 'Una ducha tan potente a 120 V exige conductores muy gruesos; considere un equipo de 240 V.',
        en: 'A shower this powerful at 120 V demands very thick conductors; consider a 240 V unit.',
      },
    },
    {
      id: 'panel-space',
      when: { ref: 'answers.panelSlots', eq: 'no' },
      text: {
        es: 'No hay espacio en el panel para el térmico: considere un subpanel o reorganizar circuitos (verificar con electricista autorizado).',
        en: 'No panel space for the breaker: consider a subpanel or rearranging circuits (verify with a licensed electrician).',
      },
    },
  ],

  assumptions: [
    {
      key: 'ducha-gfci-required',
      en: 'GFCI protection is required for this equipment in bathroom areas; the GFCI breaker in the list satisfies it.',
      es: 'La protección GFCI es obligatoria para este equipo en zona de baño; el térmico GFCI del listado la cumple.',
      citations: ['nec2026.s210_8', 'nec2026.s422_5'],
    },
    {
      key: 'ducha-dedicated-circuit',
      en: 'Dedicated circuit sized to the nameplate current; the manufacturer’s marked minimum breaker governs when larger.',
      es: 'Circuito dedicado dimensionado a la corriente de la placa de datos; el térmico mínimo marcado por el fabricante manda cuando es mayor.',
      citations: ['nec2026.s422_10', 'nec2026.s422_11'],
    },
  ],
}
