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
  cablePv: {
    es: 'cable fotovoltaico (PV)',
    en: 'PV wire (UL 4703)',
    synonyms: ['cable solar', 'PV wire', 'cable para paneles'],
    definition: {
      es: 'Cable para paneles solares: resistente al sol y a la intemperie, aislamiento XLPE de 90 °C en mojado; su relleno de tubería se calcula con las dimensiones del fabricante.',
      en: 'Solar-panel wire: sunlight- and weather-resistant, 90 °C wet XLPE insulation; conduit fill uses the manufacturer’s actual dimensions.',
    },
    necArticles: ['nec2026.ch9_note5'],
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
  kcmil: {
    es: 'kcmil',
    en: 'kcmil (thousand circular mils)',
    synonyms: ['MCM', 'circular mils'],
    definition: {
      es: 'Unidad para calibres más gruesos que el 4/0 AWG: mil «circular mils» de área. Aparece en tramos largos o cargas grandes.',
      en: 'Unit for sizes above 4/0 AWG: one thousand circular mils of area. Shows up on long runs or big loads.',
    },
    necArticles: ['nec2026.t310_16'],
  },
  btu: {
    es: 'BTU',
    en: 'BTU (British thermal unit)',
    synonyms: ['BTU/h', 'capacidad de enfriamiento'],
    definition: {
      es: 'Capacidad de enfriamiento del aire acondicionado; 12,000 BTU ≈ 1 tonelada. A más BTU, más corriente pide el equipo.',
      en: 'Cooling capacity of the A/C; 12,000 BTU ≈ 1 ton. More BTU means the unit draws more current.',
    },
  },
  thwn2: {
    es: 'THWN-2',
    en: 'THWN-2 insulation',
    synonyms: ['tipo -2', 'apto para mojado'],
    definition: {
      es: 'Forro que aguanta 90 °C incluso mojado — el sufijo -2 (o la W) indica que sirve en intemperie; es el que se usa en recorridos exteriores.',
      en: 'Jacket rated 90 °C even when wet — the -2 suffix (or the W) marks wet-location suitability; the pick for outdoor runs.',
    },
    necArticles: ['nec2026.t310_16'],
  },
  cajaOctagonal: {
    es: 'caja octagonal',
    en: 'octagonal (ceiling) box',
    synonyms: ['caja de techo', 'octogonal', 'caja redonda'],
    definition: {
      es: 'Caja de ocho lados que va en el techo para colgar lámparas o plafoneras y hacer empalmes.',
      en: 'Eight-sided ceiling box used to hang luminaires and make splices.',
    },
    necArticles: ['nec2026.t314_16_a'],
  },
  volumenDeCaja: {
    es: 'volumen de caja',
    en: 'box volume (fill)',
    synonyms: ['capacidad de la caja', 'relleno de caja', 'cm³ de la caja'],
    definition: {
      es: 'Espacio interno de la caja en cm³. Cada alambre, dispositivo y prensacable «gasta» volumen; el total no puede pasar del marcado.',
      en: 'Internal space of the box in cm³. Every wire, device and clamp “spends” volume; the total cannot exceed the marked capacity.',
    },
    necArticles: ['nec2026.t314_16_a', 'nec2026.t314_16_b'],
  },
  prensacable: {
    es: 'prensacable',
    en: 'internal cable clamp',
    synonyms: ['grapa interna', 'clamp', 'sujetacable de caja'],
    definition: {
      es: 'Mordaza dentro de la caja que sujeta el cable al entrar. Si la caja trae una o más, se descuenta un volumen adicional.',
      en: 'Clamp inside the box that grips the cable where it enters. One or more inside the box costs one extra volume allowance.',
    },
    necArticles: ['nec2026.s314_16_b_2'],
  },
  yugo: {
    es: 'yugo',
    en: 'device yoke (strap)',
    synonyms: ['montura del dispositivo', 'strap', 'marco del tomacorriente'],
    definition: {
      es: 'La pieza metálica que sostiene un tomacorriente o apagador en la caja. Cada yugo descuenta el doble del volumen de su alambre más grueso.',
      en: 'The metal frame that mounts a receptacle or switch in the box. Each yoke costs double the allowance of its largest connected wire.',
    },
    necArticles: ['nec2026.s314_16_b_4'],
  },
  alimentador: {
    es: 'alimentador',
    en: 'feeder',
    synonyms: ['línea al subpanel', 'acometida interna', 'feeder'],
    definition: {
      es: 'Los conductores que llevan la energía del panel principal a un subpanel (p. ej. en una bodega o anexo).',
      en: 'The conductors carrying power from the main panel to a subpanel (e.g. in a shed or annex).',
    },
    necArticles: ['nec2026.s215_2'],
  },
  centroDeCarga: {
    es: 'centro de carga',
    en: 'load center (subpanel)',
    synonyms: ['subpanel', 'caja de térmicos', 'tablero'],
    definition: {
      es: 'La caja con espacios para térmicos que reparte los circuitos; en construcción separada su neutro va aislado de la tierra.',
      en: 'The breaker box distributing the circuits; at a separate structure its neutral is isolated from ground.',
    },
    necArticles: ['nec2026.s250_32'],
  },
  varillaDeTierra: {
    es: 'varilla de tierra',
    en: 'ground rod',
    synonyms: ['copperweld', 'electrodo de tierra', 'varilla polarizada'],
    definition: {
      es: 'Varilla de acero cobrizado (5/8″ × 8 pies) que se entierra como electrodo; se instalan dos salvo medir ≤ 25 Ω.',
      en: 'Copper-clad steel rod (5/8″ × 8 ft) driven as an electrode; two are installed unless one measures ≤ 25 Ω.',
    },
    necArticles: ['nec2026.s250_53'],
  },
  gec: {
    es: 'conductor al electrodo (GEC)',
    en: 'grounding electrode conductor',
    synonyms: ['bajada a la varilla', 'cable a tierra física'],
    definition: {
      es: 'El conductor que une el panel con las varillas de tierra; distinto del conductor de tierra de equipos (EGC).',
      en: 'The conductor bonding the panel to the ground rods; distinct from the equipment grounding conductor (EGC).',
    },
    necArticles: ['nec2026.t250_66'],
  },
  cajaRectangular: {
    es: 'caja rectangular (2×4)',
    en: 'device box (2×4)',
    synonyms: ['caja de apagador', 'caja de toma', 'caja chalupa'],
    definition: {
      es: 'La caja de pared donde va un tomacorriente o apagador; su volumen limita cuántos alambres caben (314.16).',
      en: 'The wall box that holds a receptacle or switch; its volume limits how many wires fit (314.16).',
    },
    necArticles: ['nec2026.t314_16_a'],
  },
  plafonera: {
    es: 'plafonera',
    en: 'lampholder',
    synonyms: ['portalámparas', 'plafón', 'rosetón', 'socket de foco'],
    definition: {
      es: 'La base de techo donde se enrosca el foco; se monta sobre una caja octagonal.',
      en: 'The ceiling base the bulb screws into; mounts on an octagonal box.',
    },
  },
  apagador: {
    es: 'apagador',
    en: 'switch',
    synonyms: ['interruptor de luz', 'switch', 'suiche'],
    definition: {
      es: 'El interruptor de pared que prende y apaga las luces.',
      en: 'The wall switch that turns the lights on and off.',
    },
  },
  placa: {
    es: 'placa',
    en: 'wall plate',
    synonyms: ['tapa', 'tapadera de toma', 'chapa'],
    definition: {
      es: 'La tapa decorativa que cierra la caja del tomacorriente o apagador.',
      en: 'The cover plate that closes the receptacle or switch box.',
    },
  },
  neutro: {
    es: 'neutro',
    en: 'neutral conductor',
    synonyms: ['blanco', 'conductor puesto a tierra', 'neutral'],
    definition: {
      es: 'El conductor blanco que regresa la corriente; en circuitos de 120/240 V lleva solo el desbalance entre las dos fases.',
      en: 'The white return conductor; on 120/240 V circuits it carries only the imbalance between the two hots.',
    },
    necArticles: ['nec2026.s220_61'],
  },
  nema1430: {
    es: 'NEMA 14-30',
    en: 'NEMA 14-30 receptacle',
    synonyms: ['toma de secadora', 'toma 30 amperios 240'],
    definition: {
      es: 'Tomacorriente de 4 ranuras para secadora: dos fases, neutro y tierra, 30 A a 125/250 V.',
      en: 'Four-slot dryer receptacle: two hots, neutral, and ground, 30 A at 125/250 V.',
    },
    necArticles: ['nec2026.s210_21_b'],
  },
  nema1450: {
    es: 'NEMA 14-50',
    en: 'NEMA 14-50 receptacle',
    synonyms: ['toma de estufa', 'toma 50 amperios 240'],
    definition: {
      es: 'Tomacorriente de 4 ranuras para estufa: dos fases, neutro y tierra, 50 A a 125/250 V.',
      en: 'Four-slot range receptacle: two hots, neutral, and ground, 50 A at 125/250 V.',
    },
    necArticles: ['nec2026.s210_21_b'],
  },
  gfci: {
    es: 'GFCI',
    en: 'GFCI (ground-fault circuit interrupter)',
    synonyms: ['interruptor de falla a tierra', 'breaker de baño', 'diferencial'],
    definition: {
      es: 'Protección que corta en milisegundos cuando la corriente se fuga (p. ej. por el cuerpo de una persona); obligatoria en baños, cocinas y exteriores.',
      en: 'Protection that trips in milliseconds when current leaks (e.g. through a person); required in bathrooms, kitchens, and outdoors.',
    },
    necArticles: ['nec2026.s210_8'],
  },
  factorDemanda: {
    es: 'factor de demanda',
    en: 'demand factor',
    synonyms: ['demanda', 'porcentaje de demanda'],
    definition: {
      es: 'Porcentaje que el NEC permite descontar porque no todo se usa a la vez; la demanda es menor que la suma de las placas.',
      en: 'Percentage the NEC lets you discount because not everything runs at once; demand is less than the nameplate sum.',
    },
    necArticles: ['nec2026.t220_45', 'nec2026.t220_55'],
  },
  acometida: {
    es: 'acometida',
    en: 'service (entrance)',
    synonyms: ['servicio', 'alimentación principal', 'toma de la calle'],
    definition: {
      es: 'La alimentación principal que entra de la calle a la casa: sus conductores y el interruptor principal. Mínimo 100 A en vivienda.',
      en: 'The main supply entering the house from the street: its conductors and main disconnect. 100 A minimum for a dwelling.',
    },
    necArticles: ['nec2026.s230_79'],
  },
  cargaConectada: {
    es: 'carga conectada',
    en: 'connected load',
    synonyms: ['carga instalada', 'suma de placas'],
    definition: {
      es: 'La suma de todo lo instalado según sus placas, antes de aplicar factores de demanda.',
      en: 'The sum of everything installed per its nameplates, before demand factors.',
    },
  },
  voltamperio: {
    es: 'voltamperio (VA)',
    en: 'volt-ampere (VA)',
    synonyms: ['VA', 'vatios para cálculo'],
    definition: {
      es: 'Unidad de los cálculos de carga del NEC; en cargas residenciales típicas se toma igual al vatio (W) de la placa.',
      en: 'The unit of NEC load calculations; for typical residential loads it is taken equal to the nameplate watt.',
    },
  },
  metodoOpcional: {
    es: 'método opcional',
    en: 'optional method (120.82)',
    synonyms: ['cálculo simplificado', '120.82', '220.82'],
    definition: {
      es: 'Cálculo simplificado para viviendas con servicio de 100 A o más: 100% de los primeros 8,000 VA y 40% del resto.',
      en: 'Simplified dwelling calculation for services of 100 A or more: 100% of the first 8,000 VA plus 40% of the remainder.',
    },
    necArticles: ['nec2026.s220_82'],
  },
  duchaElectrica: {
    es: 'ducha eléctrica',
    en: 'electric shower head',
    synonyms: ['regadera eléctrica', 'calentador de paso', 'ducha'],
    definition: {
      es: 'Regadera con resistencia que calienta el agua al pasar; consume mucho (3,500–5,500 W) y exige su propio circuito.',
      en: 'Shower head with a heating element that warms water on the fly; draws a lot (3,500–5,500 W) and needs its own circuit.',
    },
  },
  placaDeDatos: {
    es: 'placa de datos',
    en: 'nameplate',
    synonyms: ['placa del equipo', 'placa de características', 'datos de placa'],
    definition: {
      es: 'La etiqueta del aparato con sus datos eléctricos (W, V, MCA/MOCP); de ahí salen los valores reales del cálculo.',
      en: 'The label on the equipment with its electrical data (W, V, MCA/MOCP); the real values for the calculation come from it.',
    },
    necArticles: ['nec2026.s440_4_b'],
  },
  fase: {
    es: 'fase',
    en: 'hot conductor (line)',
    synonyms: ['línea', 'vivo', 'línea viva'],
    definition: {
      es: 'El conductor que trae el voltaje (normalmente negro o rojo); el servicio residencial tiene dos fases de 120 V.',
      en: 'The conductor carrying voltage (usually black or red); residential service has two 120 V hot legs.',
    },
  },
  circuitoRamal: {
    es: 'circuito ramal',
    en: 'branch circuit',
    synonyms: ['ramal', 'circuito derivado'],
    definition: {
      es: 'El circuito desde el último térmico hasta las tomas o luces: lo que sale del panel a los puntos de uso.',
      en: 'The circuit from the final breaker to the outlets or lights: what leaves the panel toward the points of use.',
    },
    necArticles: ['nec2026.s210_11'],
  },
  circuitoDedicado: {
    es: 'circuito dedicado',
    en: 'dedicated (individual) circuit',
    synonyms: ['circuito individual', 'línea exclusiva'],
    definition: {
      es: 'Circuito que alimenta un solo aparato (ducha, aire, estufa) con su propio térmico, sin compartir con nada más.',
      en: 'A circuit feeding a single appliance (shower, A/C, range) with its own breaker, shared with nothing else.',
    },
    necArticles: ['nec2026.s422_10'],
  },
  polo: {
    es: 'polo',
    en: 'pole (breaker)',
    synonyms: ['polos del térmico', 'un polo', 'dos polos'],
    definition: {
      es: 'Cuántas fases corta el térmico: 1 polo para circuitos de 120 V, 2 polos para 240 V.',
      en: 'How many hot legs the breaker opens: 1 pole for 120 V circuits, 2 poles for 240 V.',
    },
  },
  metodoEstandar: {
    es: 'método estándar',
    en: 'standard method (Art. 120)',
    synonyms: ['cálculo estándar', 'método general'],
    definition: {
      es: 'El cálculo de carga general del NEC: suma por categorías y aplica a cada una su factor de demanda.',
      en: 'The general NEC load calculation: sums by category and applies each category’s demand factor.',
    },
    necArticles: ['nec2026.t220_45'],
  },
  circuitosPequenosArtefactos: {
    es: 'circuitos de pequeños artefactos',
    en: 'small-appliance branch circuits',
    synonyms: ['circuitos de cocina', 'pequeños artefactos'],
    definition: {
      es: 'Los 2 circuitos de 20 A obligatorios para las tomas de cocina y comedor; cada uno entra al cálculo con 1,500 VA.',
      en: 'The 2 mandatory 20 A circuits for kitchen and dining receptacles; each enters the calculation at 1,500 VA.',
    },
    necArticles: ['nec2026.s220_52', 'nec2026.s210_11'],
  },
  circuitoLavanderia: {
    es: 'circuito de lavandería',
    en: 'laundry branch circuit',
    synonyms: ['circuito de lavadora', 'lavandería'],
    definition: {
      es: 'El circuito de 20 A obligatorio para el área de lavado; entra al cálculo con 1,500 VA.',
      en: 'The mandatory 20 A circuit for the laundry area; enters the calculation at 1,500 VA.',
    },
    necArticles: ['nec2026.s220_52'],
  },
  alumbradoGeneral: {
    es: 'alumbrado general',
    en: 'general lighting load',
    synonyms: ['carga general de iluminación', 'iluminación y tomas generales'],
    definition: {
      es: 'La carga de luces y tomas comunes estimada por área: 22 VA por m² de vivienda, antes del factor de demanda.',
      en: 'The lighting and general-receptacle load estimated by area: 22 VA per m² of dwelling, before the demand factor.',
    },
    necArticles: ['nec2026.s220_41', 'nec2026.t220_45'],
  },
  feedThrough: {
    es: 'feed-through',
    en: 'feed-through wiring',
    synonyms: ['toma de paso', 'puenteado en la toma'],
    definition: {
      es: 'Conexión donde el cable sigue de una toma a la siguiente; en un GFCI, protege también todo lo que sigue aguas abajo.',
      en: 'Wiring where the cable continues from one receptacle to the next; on a GFCI it also protects everything downstream.',
    },
    necArticles: ['nec2026.s210_8'],
  },
  cobre: {
    es: 'cobre',
    en: 'copper (Cu)',
    synonyms: ['Cu', 'alambre de cobre'],
    definition: {
      es: 'El material estándar del conductor residencial: más caro que el aluminio pero conduce más con menos calibre.',
      en: 'The standard residential conductor material: pricier than aluminum but carries more with a smaller size.',
    },
    necArticles: ['nec2026.t310_16'],
  },
  aluminio: {
    es: 'aluminio',
    en: 'aluminum (Al)',
    synonyms: ['Al', 'alambre de aluminio'],
    definition: {
      es: 'Conductor más barato y liviano, común en alimentadores; pide calibre mayor, conectores aptos y antioxidante.',
      en: 'Cheaper, lighter conductor common in feeders; needs a larger size, rated connectors, and antioxidant paste.',
    },
    necArticles: ['nec2026.t310_16'],
  },
  xhhw2: {
    es: 'XHHW-2',
    en: 'XHHW-2 insulation',
    synonyms: ['XLPE', 'forro XHHW'],
    definition: {
      es: 'Forro de polietileno reticulado que aguanta 90 °C seco y mojado; el usual en alimentadores de aluminio.',
      en: 'Cross-linked polyethylene jacket rated 90 °C dry and wet; the usual pick on aluminum feeders.',
    },
    necArticles: ['nec2026.t310_16'],
  },
  ccc: {
    es: 'conductor portador de corriente',
    en: 'current-carrying conductor (CCC)',
    synonyms: ['CCC', 'portadores de corriente'],
    definition: {
      es: 'Conductor que lleva corriente en uso normal (las fases y, a veces, el neutro); su cuenta decide el ajuste por agrupamiento.',
      en: 'A conductor carrying current in normal use (hots and sometimes the neutral); the count drives the bundling adjustment.',
    },
    necArticles: ['nec2026.t310_15_c_1'],
  },
  antioxidante: {
    es: 'antioxidante',
    en: 'antioxidant joint compound',
    synonyms: ['pasta antioxidante', 'inhibidor de óxido'],
    definition: {
      es: 'Pasta para terminales de aluminio: evita la capa de óxido que afloja y sobrecalienta la conexión.',
      en: 'Paste for aluminum terminations: prevents the oxide layer that loosens and overheats the joint.',
    },
  },
  alambreDesnudo: {
    es: 'alambre desnudo',
    en: 'bare conductor',
    synonyms: ['cobre desnudo', 'sin forro'],
    definition: {
      es: 'Conductor sin aislamiento; se usa para tierras (GEC y puentes) donde el forro no hace falta.',
      en: 'Uninsulated conductor; used for grounding (GEC and bonding jumpers) where a jacket isn’t needed.',
    },
    necArticles: ['nec2026.t250_66'],
  },
  tomacorriente: {
    es: 'tomacorriente',
    en: 'receptacle (outlet)',
    synonyms: ['toma', 'enchufe', 'contacto'],
    definition: {
      es: 'El punto donde se conecta un aparato; su amperaje y forma deben corresponder al circuito que lo alimenta.',
      en: 'The point where an appliance plugs in; its rating and pattern must match the circuit feeding it.',
    },
    necArticles: ['nec2026.s210_21_b'],
  },
  luminaria: {
    es: 'luminaria',
    en: 'luminaire (light fixture)',
    synonyms: ['lámpara', 'lámpara de techo'],
    definition: {
      es: 'El aparato de iluminación completo (lámpara, plafonera o panel LED), montado sobre una caja o riel.',
      en: 'The complete lighting unit (fixture, lampholder, or LED panel), mounted on a box or track.',
    },
  },
  clavija: {
    es: 'clavija',
    en: 'attachment plug',
    synonyms: ['plug', 'enchufe macho'],
    definition: {
      es: 'La pieza al final del cordón del aparato que se mete al tomacorriente.',
      en: 'The piece at the end of the appliance cord that goes into the receptacle.',
    },
  },
  cordon: {
    es: 'cordón',
    en: 'flexible cord',
    synonyms: ['cable del aparato', 'cordón flexible'],
    definition: {
      es: 'El cable flexible que trae el aparato hasta la toma; no sustituye el alambrado fijo de la casa.',
      en: 'The flexible cable from the appliance to the outlet; not a substitute for the fixed wiring.',
    },
  },
  condensador: {
    es: 'condensador',
    en: 'condensing unit (A/C outdoor)',
    synonyms: ['unidad exterior', 'compresor del aire'],
    definition: {
      es: 'La unidad exterior del mini-split; su placa de datos (MCA/MOCP) manda el calibre y el térmico del circuito.',
      en: 'The mini-split outdoor unit; its nameplate (MCA/MOCP) drives the circuit’s conductor and breaker.',
    },
    necArticles: ['nec2026.s440_4_b'],
  },
  miniSplit: {
    es: 'mini-split',
    en: 'mini-split A/C',
    synonyms: ['split', 'aire de dos unidades'],
    definition: {
      es: 'Aire acondicionado de dos unidades (evaporadora adentro, condensador afuera) sin ductos; pide circuito dedicado de 240 V y desconectador.',
      en: 'Ductless two-unit A/C (indoor evaporator, outdoor condenser); needs a dedicated 240 V circuit and a disconnect.',
    },
    necArticles: ['nec2026.s440_14'],
  },
  barraDeTierra: {
    es: 'barra de tierra',
    en: 'ground bar',
    synonyms: ['bornera de tierras', 'barra de tierras'],
    definition: {
      es: 'La regleta del panel donde se rematan los conductores de tierra de equipos (EGC).',
      en: 'The panel bar where the equipment grounding conductors (EGC) terminate.',
    },
    necArticles: ['nec2026.s250_32'],
  },
  barraDeNeutros: {
    es: 'barra de neutros',
    en: 'neutral bar',
    synonyms: ['bornera de neutros'],
    definition: {
      es: 'La regleta de los blancos; en un subpanel va aislada del gabinete y separada de la barra de tierra.',
      en: 'The bar for the whites; in a subpanel it is isolated from the enclosure and kept separate from the ground bar.',
    },
    necArticles: ['nec2026.s250_32'],
  },
  afci: {
    es: 'AFCI',
    en: 'AFCI (arc-fault circuit interrupter)',
    synonyms: ['interruptor de falla de arco', 'antiarco'],
    definition: {
      es: 'Protección que detecta arcos por cables dañados o conexiones flojas y corta antes de que inicien fuego; complementa al GFCI.',
      en: 'Protection that detects arcing from damaged cables or loose joints and trips before a fire starts; complements the GFCI.',
    },
  },
  hickey: {
    es: 'hickey',
    en: 'fixture hickey',
    synonyms: ['adaptador de lámpara', 'soporte roscado de lámpara'],
    definition: {
      es: 'Adaptador roscado dentro de la caja de techo para colgar lámparas de tubo; igual que el espárrago, suma al relleno de la caja.',
      en: 'Threaded adapter inside the ceiling box for hanging stem fixtures; like the stud, it counts toward box fill.',
    },
    necArticles: ['nec2026.s314_16_b_3'],
  },
  esparrago: {
    es: 'espárrago de luminaria',
    en: 'fixture stud',
    synonyms: ['stud', 'perno central de la caja'],
    definition: {
      es: 'El perno central de la caja octagonal del que cuelga la lámpara; cuenta un volumen en el relleno de la caja.',
      en: 'The center bolt of the octagonal box the fixture hangs from; counts one volume allowance in box fill.',
    },
    necArticles: ['nec2026.s314_16_b_3'],
  },
  cajaCuadrada: {
    es: 'caja cuadrada',
    en: 'square box (4″)',
    synonyms: ['caja 4×4', 'cuadrada de 4'],
    definition: {
      es: 'Caja de 4″ con más volumen que la rectangular; para dispositivos se cubre con anillo de repello.',
      en: 'A 4″ box with more volume than a device box; covered with a plaster ring when it holds devices.',
    },
    necArticles: ['nec2026.t314_16_a'],
  },
  cajaMamposteria: {
    es: 'caja de mampostería',
    en: 'masonry box',
    synonyms: ['caja para bloque', 'caja de concreto'],
    definition: {
      es: 'Caja profunda hecha para empotrarse en pared de bloque o concreto.',
      en: 'A deep box made to be set into block or concrete walls.',
    },
    necArticles: ['nec2026.t314_16_a'],
  },
  cajaFsFd: {
    es: 'caja FS/FD',
    en: 'FS/FD box',
    synonyms: ['caja fundida', 'caja de sobreponer roscada'],
    definition: {
      es: 'Caja metálica fundida con entradas roscadas, para instalación superficial o a la intemperie.',
      en: 'Cast metal box with threaded hubs, for surface or weather-exposed installs.',
    },
  },
  anilloDeRepello: {
    es: 'anillo de repello',
    en: 'plaster (mud) ring',
    synonyms: ['mud ring', 'suplemento de caja'],
    definition: {
      es: 'Tapa elevada para caja cuadrada que deja el dispositivo al ras del acabado; si trae volumen marcado, se suma al de la caja.',
      en: 'Raised cover for a square box that brings the device flush with the finish; marked volume adds to the box’s.',
    },
  },
  empalme: {
    es: 'empalme',
    en: 'splice',
    synonyms: ['unión de alambres', 'colas'],
    definition: {
      es: 'La unión de dos o más alambres dentro de una caja, rematada con conector de empalme (wire nut).',
      en: 'The joint of two or more wires inside a box, finished with a wire nut.',
    },
    necArticles: ['nec2026.s314_16_b_1'],
  },
  contratuerca: {
    es: 'contratuerca',
    en: 'locknut',
    synonyms: ['tuerca de conector', 'locknut'],
    definition: {
      es: 'La tuerca que asegura el conector del tubo a la caja por dentro.',
      en: 'The nut that secures the conduit connector to the box from the inside.',
    },
  },
  amperio: {
    es: 'amperio (A)',
    en: 'ampere (A)',
    synonyms: ['amperaje', 'amperios', 'amp'],
    definition: {
      es: 'La unidad de corriente: térmicos, tablas de ampacidad y placas de datos se expresan en amperios.',
      en: 'The unit of current: breakers, ampacity tables, and nameplates are all expressed in amperes.',
    },
  },
  vatio: {
    es: 'vatio (W)',
    en: 'watt (W)',
    synonyms: ['watts', 'vatios'],
    definition: {
      es: 'La unidad de potencia de las placas de los aparatos; en cargas residenciales típicas se toma 1 W = 1 VA para el cálculo (motores y electrónica pueden diferir).',
      en: 'The power unit on appliance nameplates; typical residential loads are taken at 1 W = 1 VA for the calculation (motors and electronics can differ).',
    },
  },
  ohm: {
    es: 'ohmio (Ω)',
    en: 'ohm (Ω)',
    synonyms: ['ohm', 'ohmios'],
    definition: {
      es: 'La unidad de resistencia; una varilla de tierra que mida 25 Ω o menos puede ir sola, si no se instalan dos.',
      en: 'The unit of resistance; a ground rod measuring 25 Ω or less may stand alone, otherwise two are installed.',
    },
    necArticles: ['nec2026.s250_53'],
  },
  hp: {
    es: 'caballo de fuerza (HP)',
    en: 'horsepower (HP)',
    synonyms: ['HP', 'caballos'],
    definition: {
      es: 'Unidad de potencia de motores como bombas de agua (1 HP ≈ 746 W mecánicos); el consumo eléctrico real lo da la placa de datos.',
      en: 'Motor power unit for loads like water pumps (1 HP ≈ 746 mechanical W); the real electrical draw comes from the nameplate.',
    },
    necArticles: ['nec2026.s220_50'],
  },
  tonelada: {
    es: 'tonelada (de refrigeración)',
    en: 'ton of refrigeration',
    synonyms: ['ton', 'tonelada de aire'],
    definition: {
      es: 'Medida de capacidad de enfriamiento del aire acondicionado: 1 tonelada = 12,000 BTU/h.',
      en: 'A/C cooling-capacity measure: 1 ton = 12,000 BTU/h.',
    },
  },
  cedula80: {
    es: 'cédula 80',
    en: 'Schedule 80 PVC',
    synonyms: ['Sch 80', 'PVC pesado'],
    definition: {
      es: 'PVC eléctrico de pared gruesa para zonas expuestas a golpes; deja menos área interna que la cédula 40.',
      en: 'Thick-wall electrical PVC for damage-exposed areas; leaves less internal area than Schedule 40.',
    },
    necArticles: ['nec2026.ch9_t4'],
  },
  enterramiento: {
    es: 'enterramiento',
    en: 'burial depth (Table 300.5)',
    synonyms: ['zanja', 'profundidad mínima'],
    definition: {
      es: 'La profundidad mínima de la zanja para tubería o cable enterrado, según la Tabla 300.5 (típico 450–600 mm).',
      en: 'The minimum trench depth for buried raceway or cable, per Table 300.5 (typically 450–600 mm).',
    },
    necArticles: ['nec2026.t300_5'],
  },
  puestaATierra: {
    es: 'puesta a tierra',
    en: 'grounding system',
    synonyms: ['sistema de tierra', 'aterrizaje'],
    definition: {
      es: 'El conjunto que conecta la instalación a la tierra física: las varillas, el conductor al electrodo (GEC) y las tierras de equipos.',
      en: 'Everything bonding the installation to earth: the rods, the grounding electrode conductor (GEC), and the equipment grounds.',
    },
    necArticles: ['nec2026.t250_66', 'nec2026.s250_53'],
  },
} as const satisfies Record<string, GlossaryEntry>

export type GlossaryId = keyof typeof glossary
