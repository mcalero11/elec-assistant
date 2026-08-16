/**
 * Spanish (es-SV) dictionary — the source of truth. Every UI string lives here;
 * `en.ts` must mirror this shape (`satisfies Messages`), so a missing key fails typecheck.
 */
export const es = {
  common: {
    appName: 'Asistente Eléctrico',
    disclaimer:
      'Resultados estimados, sujetos a inspección; verificar por electricista autorizado.',
    assumptions: 'Supuestos',
    citations: 'Citas NEC',
    moreOptions: 'Más opciones',
    imperialUnits: 'Unidades imperiales',
    meters: 'm',
    feet: 'ft',
    degreesC: '°C',
    degreesF: '°F',
    amps: 'A',
    volts: 'V',
    percent: '%',
  },
  home: {
    tagline: 'Calculadoras NEC en español, hechas para el trabajo real.',
    calculators: 'Calculadoras',
    jobs: 'Trabajos',
  },
  calibre: {
    title: 'Calibre de conductor',
    subtitle:
      'Mueva los controles y vea el calibre, el térmico y la caída de tensión al instante.',
    load: 'Carga',
    length: 'Distancia (un solo sentido)',
    ambient: 'Temperatura ambiente',
    continuous: 'Carga continua (3 h o más)',
    material: 'Material',
    copper: 'Cobre',
    aluminum: 'Aluminio',
    insulation: 'Aislamiento',
    voltage: 'Tensión',
    cccCount: 'Conductores portadores en la tubería',
    terminalRating: 'Temperatura de terminales',
    terminalAuto: 'Automática (110.14(C))',
    maxDrop: 'Caída de tensión máxima',
    fixSize: 'Fijar calibre',
    autoSize: 'Automático (mínimo que cumple)',
    results: 'Resultados',
    conductor: 'Calibre',
    deratedAmpacity: 'Ampacidad derrateada',
    breaker: 'Térmico',
    breakerNextUp: 'valor estándar inmediato superior (240.4(B))',
    voltageDrop: 'Caída de tensión',
    governedBy: 'Limitado por',
    governedAmpacity: 'ampacidad',
    governedVoltageDrop: 'caída de tensión',
    governedProtection: 'protección',
    dropChartTitle: 'Caída de tensión vs distancia',
    dropChartCurrent: 'distancia actual',
    limitExceeded: 'Se cruzó el límite recomendado de caída de tensión',
    doesNotSatisfy: 'Este calibre NO cumple con la carga en estas condiciones',
    engineErrorTitle: 'Sin solución en estas condiciones',
    ambientFactor: 'factor por temperatura',
    cccFactor: 'factor por agrupamiento',
    baseAmpacity: 'ampacidad base',
  },
} as const satisfies Record<string, Record<string, string>>

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> }
export type Messages = DeepString<typeof es>
