import {
  CONDUCTOR_SIZES,
  conductorResistance,
  egcTable,
  type ConductorMaterial,
  type ConductorSize,
} from '@elec-assistant/data'
import { EngineError, type Assumption, type WithProvenance } from './types.js'

const ASSUME_NOT_UPSIZED: Assumption = {
  key: 'egc-not-upsized',
  en: 'EGC taken straight from Table 250.122; the 250.122(B) proportional increase for circuit conductors upsized (e.g., for voltage drop) is not applied — pass installedSize/requiredSize to apply it.',
  es: 'El conductor de puesta a tierra se tomó directamente de la Tabla 250.122; no se aplicó el aumento proporcional de 250.122(B) cuando los conductores del circuito se agrandan (p. ej., por caída de tensión).',
}

const ASSUME_UPSIZED: Assumption = {
  key: 'egc-upsized-250-122b',
  en: 'Circuit conductors are larger than their ampacity minimum, so the EGC was increased in proportion to the circular-mil area ratio per 250.122(B) (capped at the circuit-conductor size per 250.122(A)).',
  es: 'Los conductores del circuito son mayores que el mínimo por ampacidad, así que el conductor de tierra se aumentó en proporción al área en circular mils según 250.122(B) (limitado al calibre de los conductores del circuito según 250.122(A)).',
}

export interface EgcInput {
  /** Rating of the overcurrent device protecting the circuit, in amperes. */
  ocpdA: number
  material: ConductorMaterial
  /**
   * The circuit-conductor size actually installed. Provide together with
   * `requiredSize` to apply the 250.122(B) proportional increase.
   */
  installedSize?: ConductorSize
  /** The ampacity-only minimum size (CircuitResult.ampacityMinimumSize). */
  requiredSize?: ConductorSize
}

export interface EgcResult extends WithProvenance {
  size: ConductorSize
  /** The plain Table 250.122 size, before any 250.122(B) increase. */
  tableSize: ConductorSize
  /** True when 250.122(B) proportional upsizing changed the size. */
  upsized: boolean
  ocpdA: number
  material: ConductorMaterial
}

const cmil = (size: ConductorSize): number => conductorResistance.areaCmil[size]

/**
 * Minimum wire-type equipment grounding conductor per Table 250.122 (Table
 * 250.122(A) in the 2026 numbering), with the proportional increase of
 * 250.122(B) (250.122(D) in 2026) when the circuit conductors were upsized
 * beyond their code-required minimum (voltage drop, protection). Increases
 * forced by 310.15(B)/(C) derating are excluded by the 2023+ rule text.
 *
 * Baseline choice: `requiredSize` is the FULL code-required minimum
 * (`CircuitResult.ampacityMinimumSize` — includes 210.19 125%, 110.14(C)
 * terminations, and 310.15 derating). A hyper-literal 2023 reading would also
 * ratio termination-driven increases; that contradicts universal practice and
 * the pre-2023 wording ("minimum size that has sufficient ampacity for the
 * intended installation"), so the practice-aligned baseline is used. Wire-type
 * EGCs only; the 250.4(A)(5) engineered-sizing exception is not modeled.
 */
export function egcSize(input: EgcInput): EgcResult {
  if (!(input.ocpdA > 0)) {
    throw new EngineError(
      `Overcurrent device rating must be positive (got ${input.ocpdA} A)`,
      `El valor nominal del dispositivo de sobrecorriente debe ser positivo (se recibió ${input.ocpdA} A)`,
    )
  }
  if ((input.installedSize == null) !== (input.requiredSize == null)) {
    throw new EngineError(
      'Provide both installedSize and requiredSize (or neither) for 250.122(B) evaluation',
      'Proporcione installedSize y requiredSize juntos (o ninguno) para evaluar 250.122(B)',
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
  const tableSize = input.material === 'copper' ? row.copper : row.aluminum

  if (input.installedSize == null || input.requiredSize == null) {
    return {
      size: tableSize,
      tableSize,
      upsized: false,
      ocpdA: input.ocpdA,
      material: input.material,
      citations: ['nec2026.t250_122'],
      assumptions: [ASSUME_NOT_UPSIZED],
    }
  }

  const tableIdx = CONDUCTOR_SIZES.indexOf(tableSize)
  const installedIdx = CONDUCTOR_SIZES.indexOf(input.installedSize)

  let finalIdx = tableIdx
  let upsized = false
  if (cmil(input.installedSize) > cmil(input.requiredSize)) {
    // Smallest size whose area satisfies cmil(egc) ≥ cmil(table) × installed/required.
    // Integer cross-multiplication — float division can miss exact boundaries
    // (max product 6e5 × 6e5 = 3.6e11, exact in doubles).
    const upsizedIdx = CONDUCTOR_SIZES.findIndex(
      (size) => cmil(size) * cmil(input.requiredSize!) >= cmil(tableSize) * cmil(input.installedSize!),
    )
    if (upsizedIdx === -1) {
      throw new EngineError(
        `No conductor size up to 600 kcmil satisfies the 250.122(B) increase`,
        `Ningún calibre hasta 600 kcmil satisface el aumento de 250.122(B)`,
      )
    }
    // 250.122(A): never larger than the circuit conductors; never below the table value.
    finalIdx = Math.max(tableIdx, Math.min(upsizedIdx, installedIdx))
    upsized = finalIdx !== tableIdx
  }

  const size = CONDUCTOR_SIZES[finalIdx]
  if (!size) {
    throw new EngineError('EGC size resolution failed', 'Falló la resolución del calibre de tierra')
  }

  return {
    size,
    tableSize,
    upsized,
    ocpdA: input.ocpdA,
    material: input.material,
    citations: upsized ? ['nec2026.t250_122', 'nec2026.s250_122_b'] : ['nec2026.t250_122'],
    assumptions: upsized ? [ASSUME_UPSIZED] : [],
  }
}
