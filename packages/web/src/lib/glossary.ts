/**
 * Seed mini-glossary for tooltips: plain-Spanish definition, regional synonyms
 * (El Salvador first), and the English name.
 *
 * TODO: migrate into @elec-assistant/data when the full glossary (PRD US-5,
 * ~100 terms with photos) lands — this file only covers what the current UI uses.
 */
export interface GlossaryEntry {
  id: string
  es: string
  en: string
  synonyms: string[]
  definition: { es: string; en: string }
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  breaker: {
    id: 'breaker',
    es: 'térmico',
    en: 'circuit breaker',
    synonyms: ['flipón', 'dado', 'interruptor termomagnético', 'breaker'],
    definition: {
      es: 'Interruptor automático que corta la corriente cuando pasa del límite, para proteger el alambre.',
      en: 'Automatic switch that opens the circuit when current exceeds its rating, protecting the wire.',
    },
  },
  calibre: {
    id: 'calibre',
    es: 'calibre',
    en: 'wire gauge (AWG)',
    synonyms: ['AWG', 'grosor del alambre', 'número del alambre'],
    definition: {
      es: 'Grosor del conductor. En AWG, número menor = alambre más grueso (el 10 es más grueso que el 14).',
      en: 'Conductor thickness. In AWG, a smaller number means a thicker wire (10 is thicker than 14).',
    },
  },
  ampacidad: {
    id: 'ampacidad',
    es: 'ampacidad',
    en: 'ampacity',
    synonyms: ['capacidad de corriente'],
    definition: {
      es: 'Cuánta corriente puede llevar un conductor sin pasarse de temperatura, según las tablas del NEC.',
      en: 'How much current a conductor can carry without overheating, per NEC tables.',
    },
  },
  caidaDeTension: {
    id: 'caidaDeTension',
    es: 'caída de tensión',
    en: 'voltage drop',
    synonyms: ['caída de voltaje'],
    definition: {
      es: 'Voltaje que se pierde en el camino por la resistencia del alambre. Con mucha distancia toca subir el calibre.',
      en: 'Voltage lost along the run due to wire resistance. Long runs force a larger conductor.',
    },
  },
  aislamiento: {
    id: 'aislamiento',
    es: 'aislamiento',
    en: 'insulation type',
    synonyms: ['tipo de forro', 'THHN', 'THWN'],
    definition: {
      es: 'El forro del alambre (THHN, THWN-2, TW…). Define su temperatura máxima y si sirve en lugares húmedos.',
      en: 'The wire jacket (THHN, THWN-2, TW…). Sets its temperature rating and wet-location suitability.',
    },
  },
  poliducto: {
    id: 'poliducto',
    es: 'poliducto',
    en: 'flexible nonmetallic conduit (LFNC)',
    synonyms: ['manguera eléctrica', 'tubo flexible', 'LFNC'],
    definition: {
      es: 'Tubería flexible no metálica para proteger conductores; muy usada en instalaciones residenciales.',
      en: 'Flexible nonmetallic raceway protecting conductors; very common in residential work.',
    },
  },
  emt: {
    id: 'emt',
    es: 'tubo EMT',
    en: 'electrical metallic tubing (EMT)',
    synonyms: ['tubo conduit', 'tubería metálica'],
    definition: {
      es: 'Tubería metálica liviana que se dobla con dobladora; el estándar para instalaciones a la vista.',
      en: 'Light metal tubing bent with a bender; the standard for exposed runs.',
    },
  },
  curva: {
    id: 'curva',
    es: 'curva',
    en: 'factory elbow',
    synonyms: ['codo', 'vuelta'],
    definition: {
      es: 'Codo prefabricado de 90° para tubería. Se compra hecho, o se dobla el tubo con dobladora y se ahorra la pieza.',
      en: 'Prefabricated 90° bend for conduit. Bought ready-made, or field-bent with a bender to skip the part.',
    },
  },
  dobladora: {
    id: 'dobladora',
    es: 'dobladora',
    en: 'conduit bender',
    synonyms: ['grifa', 'bender'],
    definition: {
      es: 'Herramienta para doblar tubo EMT en el sitio. Compra única: reemplaza las curvas de fábrica.',
      en: 'Tool for bending EMT on site. One-time purchase that replaces factory elbows.',
    },
  },
  desconectador: {
    id: 'desconectador',
    es: 'desconectador',
    en: 'disconnect switch',
    synonyms: ['caja de seguridad', 'switch de aire', 'disconnect'],
    definition: {
      es: 'Interruptor junto al equipo (como el aire acondicionado) para cortar la corriente al darle servicio.',
      en: 'Switch next to the equipment (like an A/C) to cut power during servicing.',
    },
  },
  cargaContinua: {
    id: 'cargaContinua',
    es: 'carga continua',
    en: 'continuous load',
    synonyms: ['carga de 3 horas'],
    definition: {
      es: 'Carga que trabaja 3 horas o más sin parar. El NEC exige dimensionar al 125% de esa corriente.',
      en: 'A load running 3+ hours nonstop. The NEC requires sizing at 125% of that current.',
    },
  },
  terminales: {
    id: 'terminales',
    es: 'temperatura de terminales',
    en: 'terminal temperature rating',
    synonyms: ['bornes', 'terminales del térmico'],
    definition: {
      es: 'Límite de temperatura de los tornillos/bornes del equipo (60 °C o 75 °C); puede limitar más que el alambre.',
      en: 'Temperature limit of the equipment lugs (60 °C or 75 °C); can govern below the wire rating.',
    },
  },
}
