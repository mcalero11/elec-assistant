/**
 * El Salvador field practice, keyed by the engine's `Deviation.key`.
 *
 * NOT normative and NOT part of any code: this records what is commonly
 * INSTALLED locally, shown as context inside an off-code warning so the reader
 * can tell «the NEC requires X» from «around here people do Y». Without it a
 * memoria handed to a client reads as an accusation; with it, it reads as an
 * explanation plus a recommendation.
 *
 * The engine stays country-neutral — it only emits the key. This is the single
 * place in a calculation path where a country is named.
 */
export interface LocalPracticeNote {
  /** Must match an engine Deviation.key (lint-enforced in the engine tests). */
  key: string
  es: string
  en: string
  /** Where the claim comes from — field observation, distributor practice, a norm. */
  source?: { es: string; en: string }
}

export const LOCAL_PRACTICE_REGION = 'SV'

/**
 * Keys here are NOT emitted by the engine — they are minted by the web layer for
 * conditions the engine does not model. Listed explicitly so the coverage lint
 * (which otherwise requires every key to exist in the engine's DEVIATION_KEYS)
 * can tell «owned by the UI» from «typo that will never render».
 */
export const UI_OWNED_PRACTICE_KEYS = ['no-main-disconnect', 'service-100a-floor'] as const

export const localPracticeNotes = {
  'ampacity-insufficient': {
    key: 'ampacity-insufficient',
    es: 'En El Salvador es común ver la acometida hecha con cable 6 AWG desde el medidor hasta el tablero: unos 55 a 65 A de ampacidad según el aislamiento y la temperatura, muy por debajo de los 100 A que el NEC pide como mínimo en vivienda. Funciona mientras la casa consuma poco, pero no deja margen para la ducha eléctrica, el aire acondicionado ni ninguna ampliación futura.',
    en: 'In El Salvador the service is commonly run in 6 AWG from the meter to the panel: roughly 55 to 65 A of ampacity depending on insulation and temperature, well under the 100 A minimum the NEC requires for a dwelling. It works while the house draws little, but leaves no headroom for an electric shower, air conditioning, or any future expansion.',
    source: {
      es: 'Práctica de campo observada; la ampacidad sale de la Tabla 310.16.',
      en: 'Observed field practice; ampacity from Table 310.16.',
    },
  },
  // Standing context on the load calculator, where «Acometida sugerida: 100 A»
  // is read. Not a deviation: the 100 A floor is compliant, and the calculator
  // cannot know what conductor is actually installed. But leaving the reader with
  // «100 A» and no mention of the 6 AWG reality is what made the number feel
  // wrong to people whose service is exactly that.
  'service-100a-floor': {
    key: 'service-100a-floor',
    es: 'En El Salvador la acometida se hace muy seguido con 6 AWG del medidor al tablero: unos 55 a 65 A, bastante menos que los 100 A que el NEC pide como mínimo en vivienda. Si esa es su instalación, este número es lo que el código pediría, no lo que usted tiene: arriba puede poner su calibre real y ver si aguanta la carga calculada.',
    en: 'In El Salvador the service is very often run in 6 AWG from the meter to the panel: roughly 55 to 65 A, well under the 100 A the NEC requires as a dwelling minimum. If that is your installation, this figure is what the code would ask for, not what you have: enter your actual conductor above to see whether it carries the calculated load.',
    source: {
      es: 'Práctica de campo observada; la ampacidad sale de la Tabla 310.16.',
      en: 'Observed field practice; ampacity from Table 310.16.',
    },
  },
  'no-main-disconnect': {
    key: 'no-main-disconnect',
    es: 'Muchos tableros residenciales en El Salvador se instalan sin interruptor principal: la acometida llega directo a las barras y cada circuito se corta con su propio térmico. El NEC exige un medio de desconexión de la acometida y protección del tablero, entre otras razones para poder cortar toda la casa de un solo golpe en una emergencia.',
    en: 'Many residential panels in El Salvador are installed with no main breaker: the service lands straight on the bus bars and each circuit is switched by its own breaker. The NEC requires a service disconnecting means and panelboard protection — among other reasons so the whole house can be de-energized in one motion in an emergency.',
    source: { es: 'Práctica de campo observada.', en: 'Observed field practice.' },
  },
  'small-appliance-below-minimum': {
    key: 'small-appliance-below-minimum',
    es: 'Es normal encontrar cocinas salvadoreñas con un solo circuito de tomas, o con las tomas de la cocina colgadas del mismo circuito de la iluminación. El cálculo de abajo usa lo que usted ingresó, pero tome en cuenta que dos circuitos de 20 A son justamente lo que evita que la licuadora y el microondas boten el térmico al mismo tiempo.',
    en: 'Salvadoran kitchens are commonly found with a single receptacle circuit, or with the kitchen receptacles hanging off the lighting circuit. The calculation below uses what you entered, but note that two 20 A circuits are exactly what keeps the blender and the microwave from tripping the breaker together.',
    source: { es: 'Práctica de campo observada.', en: 'Observed field practice.' },
  },
} as const satisfies Record<string, LocalPracticeNote>

export type LocalPracticeKey = keyof typeof localPracticeNotes

export function localPracticeNote(key: string): LocalPracticeNote | undefined {
  return localPracticeNotes[key as LocalPracticeKey]
}
