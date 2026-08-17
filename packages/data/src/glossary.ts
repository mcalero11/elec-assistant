import type { CitationKey } from './index.js'

/**
 * Glossary / regional terminology DB (PRD US-5, «never blocked by a name»):
 * plain-Spanish one-line definition, es-SV regional synonyms, English name,
 * related NEC articles (reusing the citation system), and a photo slot.
 * Photos are deliberately unpopulated — sourcing/licensing is its own task.
 *
 * Coverage is CI-enforced: packages/engine/test/glossary-coverage.test.ts
 * scans the web UI for <Term id> usages and checks a required-terms inventory.
 */
export interface GlossaryEntry {
  readonly es: string
  readonly en: string
  readonly synonyms: readonly string[]
  readonly definition: { readonly es: string; readonly en: string }
  readonly necArticles?: readonly CitationKey[]
  /** Asset path once photos land — kept in the schema so entries can grow into it. */
  readonly photo?: string
}

export const glossary = {
  breaker: {
    es: 'térmico',
    en: 'circuit breaker',
    synonyms: ['flipón', 'dado', 'interruptor termomagnético', 'breaker'],
    definition: {
      es: 'Interruptor automático que corta la corriente cuando pasa del límite, para proteger el alambre.',
      en: 'Automatic switch that opens the circuit when current exceeds its rating, protecting the wire.',
    },
    necArticles: ['nec2026.s240_6_a'],
  },
  calibre: {
    es: 'calibre',
    en: 'wire gauge (AWG)',
    synonyms: ['AWG', 'grosor del alambre', 'número del alambre'],
    definition: {
      es: 'Grosor del conductor. En AWG, número menor = alambre más grueso (el 10 es más grueso que el 14).',
      en: 'Conductor thickness. In AWG, a smaller number means a thicker wire (10 is thicker than 14).',
    },
    necArticles: ['nec2026.t310_16'],
  },
  ampacidad: {
    es: 'ampacidad',
    en: 'ampacity',
    synonyms: ['capacidad de corriente'],
    definition: {
      es: 'Cuánta corriente puede llevar un conductor sin pasarse de temperatura, según las tablas del NEC.',
      en: 'How much current a conductor can carry without overheating, per NEC tables.',
    },
    necArticles: ['nec2026.t310_16', 'nec2026.s110_14_c'],
  },
  caidaDeTension: {
    es: 'caída de tensión',
    en: 'voltage drop',
    synonyms: ['caída de voltaje'],
    definition: {
      es: 'Voltaje que se pierde en el camino por la resistencia del alambre. Con mucha distancia toca subir el calibre.',
      en: 'Voltage lost along the run due to wire resistance. Long runs force a larger conductor.',
    },
    necArticles: ['nec2026.in210_19_vd', 'nec2026.ch9_t8'],
  },
  aislamiento: {
    es: 'aislamiento',
    en: 'insulation type',
    synonyms: ['tipo de forro', 'THHN', 'THWN'],
    definition: {
      es: 'El forro del alambre (THHN, THWN-2, TW…). Define su temperatura máxima y si sirve en lugares húmedos.',
      en: 'The wire jacket (THHN, THWN-2, TW…). Sets its temperature rating and wet-location suitability.',
    },
    necArticles: ['nec2026.t310_16'],
  },
  poliducto: {
    es: 'poliducto',
    en: 'flexible nonmetallic conduit (LFNC)',
    synonyms: ['manguera eléctrica', 'tubo flexible', 'LFNC'],
    definition: {
      es: 'Tubería flexible no metálica para proteger conductores; muy usada en instalaciones residenciales.',
      en: 'Flexible nonmetallic raceway protecting conductors; very common in residential work.',
    },
    necArticles: ['nec2026.ch9_t4', 'nec2026.s356_30'],
  },
  emt: {
    es: 'tubo EMT',
    en: 'electrical metallic tubing (EMT)',
    synonyms: ['tubo conduit', 'tubería metálica'],
    definition: {
      es: 'Tubería metálica liviana que se dobla con dobladora; el estándar para instalaciones a la vista.',
      en: 'Light metal tubing bent with a bender; the standard for exposed runs.',
    },
    necArticles: ['nec2026.ch9_t4', 'nec2026.s358_30'],
  },
  curva: {
    es: 'curva',
    en: 'factory elbow',
    synonyms: ['codo', 'vuelta'],
    definition: {
      es: 'Codo prefabricado de 90° para tubería. Se compra hecho, o se dobla el tubo con dobladora y se ahorra la pieza.',
      en: 'Prefabricated 90° bend for conduit. Bought ready-made, or field-bent with a bender to skip the part.',
    },
  },
  dobladora: {
    es: 'dobladora',
    en: 'conduit bender',
    synonyms: ['grifa', 'bender'],
    definition: {
      es: 'Herramienta para doblar tubo EMT en el sitio. Compra única: reemplaza las curvas de fábrica.',
      en: 'Tool for bending EMT on site. One-time purchase that replaces factory elbows.',
    },
  },
  desconectador: {
    es: 'desconectador',
    en: 'disconnect switch',
    synonyms: ['caja de seguridad', 'switch de aire', 'disconnect'],
    definition: {
      es: 'Interruptor junto al equipo (como el aire acondicionado) para cortar la corriente al darle servicio.',
      en: 'Switch next to the equipment (like an A/C) to cut power during servicing.',
    },
    necArticles: ['nec2026.s440_14'],
  },
  cargaContinua: {
    es: 'carga continua',
    en: 'continuous load',
    synonyms: ['carga de 3 horas'],
    definition: {
      es: 'Carga que trabaja 3 horas o más sin parar. El NEC exige dimensionar al 125% de esa corriente.',
      en: 'A load running 3+ hours nonstop. The NEC requires sizing at 125% of that current.',
    },
    necArticles: ['nec2026.s210_19', 'nec2026.s210_20'],
  },
  terminales: {
    es: 'temperatura de terminales',
    en: 'terminal temperature rating',
    synonyms: ['bornes', 'terminales del térmico'],
    definition: {
      es: 'Límite de temperatura de los tornillos/bornes del equipo (60 °C o 75 °C); puede limitar más que el alambre.',
      en: 'Temperature limit of the equipment lugs (60 °C or 75 °C); can govern below the wire rating.',
    },
    necArticles: ['nec2026.s110_14_c'],
  },
  conector: {
    es: 'conector',
    en: 'conduit connector',
    synonyms: ['conector recto', 'terminal de tubo'],
    definition: {
      es: 'Pieza que remata el tubo y lo fija a una caja o gabinete, protegiendo el alambre en la entrada.',
      en: 'Fitting that terminates the conduit at a box or enclosure, protecting the wire at the entry.',
    },
  },
  union: {
    es: 'unión',
    en: 'conduit coupling',
    synonyms: ['copla', 'cople'],
    definition: {
      es: 'Pieza que junta dos tramos de tubo en línea recta.',
      en: 'Fitting that joins two conduit sticks end to end.',
    },
  },
  adaptadorTerminal: {
    es: 'adaptador terminal',
    en: 'PVC terminal adapter',
    synonyms: ['conector PVC', 'adaptador macho'],
    definition: {
      es: 'Remate cementado que conecta el tubo PVC a una caja o gabinete.',
      en: 'Cemented fitting that connects PVC conduit to a box or enclosure.',
    },
  },
  pegamentoPvc: {
    es: 'pegamento PVC',
    en: 'PVC cement',
    synonyms: ['cemento PVC', 'pega de tubo'],
    definition: {
      es: 'Adhesivo que suelda químicamente las uniones y curvas del tubo PVC.',
      en: 'Adhesive that chemically welds PVC conduit joints and elbows.',
    },
  },
  abrazadera: {
    es: 'abrazadera',
    en: 'conduit strap',
    synonyms: ['grapa', 'gaza', 'fleje'],
    definition: {
      es: 'Pieza que fija la tubería a la pared o techo; el NEC exige una separación máxima entre soportes.',
      en: 'Clamp securing the raceway to the wall or ceiling; the NEC sets a maximum support spacing.',
    },
    necArticles: ['nec2026.s358_30', 'nec2026.s356_30', 'nec2026.s352_30'],
  },
  whip: {
    es: 'whip para A/C',
    en: 'A/C whip',
    synonyms: ['conexión flexible del aire', 'látigo'],
    definition: {
      es: 'Tramo corto de manguera con conectores y conductores, del desconectador al condensador del aire.',
      en: 'Short flexible conduit kit with conductors, from the disconnect to the A/C condenser.',
    },
  },
  nema3r: {
    es: 'NEMA 3R',
    en: 'NEMA 3R rating',
    synonyms: ['apto para intemperie', 'a prueba de lluvia'],
    definition: {
      es: 'Grado de gabinete que resiste lluvia: lo mínimo para cajas y desconectadores instalados a la intemperie.',
      en: 'Enclosure rating that sheds rain: the minimum for boxes and disconnects mounted outdoors.',
    },
  },
  tramo: {
    es: 'tramo',
    en: 'conduit stick (10 ft)',
    synonyms: ['lance', 'tubo de 10 pies', 'tira'],
    definition: {
      es: 'La pieza de tubería tal como se vende: normalmente 10 pies (unos 3 m).',
      en: 'Conduit as sold: normally a 10-ft (≈3 m) length.',
    },
  },
  niple: {
    es: 'niple',
    en: 'conduit nipple',
    synonyms: ['tramo corto entre cajas'],
    definition: {
      es: 'Tramo de tubería de 600 mm o menos entre cajas: el NEC permite llenarlo hasta el 60%.',
      en: 'A raceway run of 600 mm or less between enclosures: the NEC allows filling it to 60%.',
    },
    necArticles: ['nec2026.ch9_note4'],
  },
  pvcElectrico: {
    es: 'PVC eléctrico',
    en: 'rigid PVC conduit (Sch 40)',
    synonyms: ['tubo conduit PVC', 'PVC gris', 'cédula 40'],
    definition: {
      es: 'Tubería plástica rígida gris para instalaciones eléctricas; se une con pegamento y resiste la intemperie.',
      en: 'Gray rigid plastic conduit for electrical work; cemented joints, weather-resistant.',
    },
    necArticles: ['nec2026.ch9_t4', 'nec2026.s352_30'],
  },
  mca: {
    es: 'MCA',
    en: 'minimum circuit ampacity (MCA)',
    synonyms: ['corriente mínima del circuito', 'amperaje mínimo de placa'],
    definition: {
      es: 'Dato de placa del equipo: la corriente mínima que el circuito debe soportar. Con ella se elige el calibre.',
      en: 'Nameplate value: the minimum current the circuit must carry. It drives the conductor size.',
    },
    necArticles: ['nec2026.s440_4_b'],
  },
  mocp: {
    es: 'MOCP',
    en: 'maximum overcurrent protection (MOCP)',
    synonyms: ['protección máxima de placa', 'breaker máximo'],
    definition: {
      es: 'Dato de placa del equipo: el térmico o fusible más grande permitido para ese circuito.',
      en: 'Nameplate value: the largest breaker or fuse permitted for that circuit.',
    },
    necArticles: ['nec2026.s440_4_b', 'nec2026.s440_22'],
  },
  derrateo: {
    es: 'derrateo',
    en: 'derating',
    synonyms: ['corrección de ampacidad', 'ajuste por condiciones'],
    definition: {
      es: 'Reducción de la ampacidad del alambre por calor ambiente o por ir muchos conductores juntos.',
      en: 'Reducing a wire’s ampacity for ambient heat or for many conductors run together.',
    },
    necArticles: ['nec2026.t310_15_b_1', 'nec2026.t310_15_c_1'],
  },
  agrupamiento: {
    es: 'agrupamiento',
    en: 'conductor bundling',
    synonyms: ['conductores juntos en la tubería', 'factor de ajuste'],
    definition: {
      es: 'Cuando van más de 3 conductores portadores en una tubería, todos disipan menos calor y su ampacidad baja.',
      en: 'With more than 3 current-carrying conductors in a raceway, heat builds up and ampacity drops.',
    },
    necArticles: ['nec2026.t310_15_c_1'],
  },
  temperaturaAmbiente: {
    es: 'temperatura ambiente',
    en: 'ambient temperature',
    synonyms: ['calor del lugar'],
    definition: {
      es: 'La temperatura del lugar donde va el alambre; arriba de 30 °C la ampacidad se corrige hacia abajo.',
      en: 'The temperature where the wire runs; above 30 °C ampacity is corrected downward.',
    },
    necArticles: ['nec2026.t310_15_b_1'],
  },
  awg: {
    es: 'AWG / kcmil',
    en: 'AWG / kcmil',
    synonyms: ['número americano', 'circular mils'],
    definition: {
      es: 'Escalas de grosor de conductores: AWG hasta el 4/0 y kcmil (miles de circular mils) de 250 en adelante.',
      en: 'Conductor size scales: AWG through 4/0, then kcmil (thousands of circular mils) from 250 up.',
    },
    necArticles: ['nec2026.ch9_t8'],
  },
  tierra: {
    es: 'conductor de tierra (EGC)',
    en: 'equipment grounding conductor (EGC)',
    synonyms: ['tierra física', 'alambre verde', 'polarización'],
    definition: {
      es: 'El conductor (normalmente verde) que conecta las carcasas al sistema de tierra para que el térmico dispare ante una falla.',
      en: 'The (usually green) conductor bonding enclosures to ground so the breaker trips on a fault.',
    },
    necArticles: ['nec2026.t250_122', 'nec2026.s250_122_b'],
  },
  valorEstandar: {
    es: 'valor estándar',
    en: 'standard rating',
    synonyms: ['amperaje comercial', 'tamaño estándar de térmico'],
    definition: {
      es: 'Los amperajes de térmico que existen en el mercado (15, 20, 30, 40…); el NEC define la lista.',
      en: 'The breaker ampere ratings actually manufactured (15, 20, 30, 40…); the NEC defines the list.',
    },
    necArticles: ['nec2026.s240_6_a'],
  },
  diametroComercial: {
    es: 'diámetro comercial',
    en: 'trade size',
    synonyms: ['medida nominal', 'pulgadas del tubo'],
    definition: {
      es: 'El nombre comercial del tubo (½", ¾"…); no es la medida interna exacta, esa la dan las tablas.',
      en: 'The conduit’s commercial name (½", ¾"…); not the exact internal size — tables give that.',
    },
    necArticles: ['nec2026.ch9_t4'],
  },
  rellenoTuberia: {
    es: 'relleno de tubería',
    en: 'conduit fill',
    synonyms: ['ocupación del tubo', 'porcentaje de llenado'],
    definition: {
      es: 'Qué porcentaje del área interna del tubo ocupan los conductores; el NEC fija el máximo (40% para 3 o más).',
      en: 'How much of the conduit’s internal area the conductors occupy; the NEC caps it (40% for 3+).',
    },
    necArticles: ['nec2026.ch9_t1', 'nec2026.ch9_t5'],
  },
  proteccion: {
    es: 'protección contra sobrecorriente',
    en: 'overcurrent protection',
    synonyms: ['sobrecorriente', 'protección del circuito'],
    definition: {
      es: 'El térmico o fusible que limita la corriente del circuito para que el alambre nunca trabaje por encima de lo seguro.',
      en: 'The breaker or fuse limiting circuit current so the wire never operates beyond its safe rating.',
    },
    necArticles: ['nec2026.s240_4_b', 'nec2026.s240_4_d'],
  },
  tension: {
    es: 'tensión',
    en: 'voltage',
    synonyms: ['voltaje', 'voltios'],
    definition: {
      es: 'El «empuje» eléctrico del circuito; en El Salvador lo común es 120 V y 240 V residencial.',
      en: 'The electrical “push” of the circuit; 120 V and 240 V are the residential norm in El Salvador.',
    },
  },
  monofasico: {
    es: 'monofásico 120/240 V',
    en: 'single-phase 120/240 V',
    synonyms: ['dos líneas y neutro', 'fase partida'],
    definition: {
      es: 'El servicio residencial típico: dos líneas de 120 V que juntas dan 240 V para cargas grandes como el aire.',
      en: 'Typical residential service: two 120 V legs that combine to 240 V for large loads like A/C.',
    },
  },
  desperdicio: {
    es: 'desperdicio',
    en: 'wastage allowance',
    synonyms: ['margen de material', 'sobrante'],
    definition: {
      es: 'Porcentaje extra de material que se compra para cubrir cortes, puntas y errores (típico 10%).',
      en: 'Extra material bought to cover cuts, tails, and mistakes (typically 10%).',
    },
  },
} as const satisfies Record<string, GlossaryEntry>

export type GlossaryId = keyof typeof glossary
