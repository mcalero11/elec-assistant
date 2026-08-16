import { egcTable, type ConductorMaterial, type ConductorSize } from '@elec-assistant/data'
import { EngineError, type Assumption, type WithProvenance } from './types.js'

const ASSUME_NOT_UPSIZED: Assumption = {
  key: 'egc-not-upsized',
  en: 'EGC taken straight from Table 250.122; the 250.122(B) proportional increase for circuit conductors upsized (e.g., for voltage drop) is not applied.',
  es: 'El conductor de puesta a tierra se tomó directamente de la Tabla 250.122; no se aplicó el aumento proporcional de 250.122(B) cuando los conductores del circuito se agrandan (p. ej., por caída de tensión).',
}

export interface EgcInput {
  /** Rating of the overcurrent device protecting the circuit, in amperes. */
  ocpdA: number
  material: ConductorMaterial
}

export interface EgcResult extends WithProvenance {
  size: ConductorSize
  ocpdA: number
  material: ConductorMaterial
}

/** Minimum wire-type equipment grounding conductor per Table 250.122. */
export function egcSize(input: EgcInput): EgcResult {
  if (!(input.ocpdA > 0)) {
    throw new EngineError(
      `Overcurrent device rating must be positive (got ${input.ocpdA} A)`,
      `El valor nominal del dispositivo de sobrecorriente debe ser positivo (se recibió ${input.ocpdA} A)`,
    )
  }
  const row = egcTable.rows.find((r) => input.ocpdA <= r.maxOcpdA)
  if (!row) {
    const last = egcTable.rows[egcTable.rows.length - 1]
    throw new EngineError(
      `No EGC entry for an overcurrent device over ${last?.maxOcpdA} A (transcribed Table 250.122 range)`,
      `No hay entrada de conductor de puesta a tierra para un dispositivo de sobrecorriente mayor a ${last?.maxOcpdA} A (rango transcrito de la Tabla 250.122)`,
    )
  }
  return {
    size: input.material === 'copper' ? row.copper : row.aluminum,
    ocpdA: input.ocpdA,
    material: input.material,
    citations: ['nec2026.t250_122'],
    assumptions: [ASSUME_NOT_UPSIZED],
  }
}
