import {
  CONDUCTOR_SIZES,
  gecTable,
  type ConductorMaterial,
  type ConductorSize,
} from '@nec-assistant/data'
import { EngineError, type Assumption, type WithProvenance } from './types.js'

/**
 * Grounding electrode conductor per Table 250.66, with the 250.66(A) cap for
 * connections whose sole destination is rod/pipe/plate electrodes (never
 * required larger than 6 AWG Cu / 4 AWG Al). Distinct from `egcSize`: the EGC
 * (Table 250.122) follows circuit protection; the GEC follows the largest
 * ungrounded service/feeder conductor.
 *
 * Non-goals: parallel service conductors (enter the equivalent single size),
 * the 250.66(B) concrete-encased and (C) ground-ring caps, and services above
 * 600 kcmil (outside the transcribed table range).
 */

const ASSUME_PROTECTION: Assumption = {
  key: 'gec-physical-protection',
  en: 'A GEC smaller than 6 AWG must be run in a raceway or cable armor for physical protection (250.64(B)); 6 AWG and larger may run exposed where not subject to damage.',
  es: 'Un conductor al electrodo menor que #6 debe ir en tubería o armadura por protección física (250.64(B)); del #6 en adelante puede ir expuesto donde no sufra daño.',
}

const ASSUME_ROD_CAP: Assumption = {
  key: 'gec-rod-cap',
  en: 'The conductor goes ONLY to rod/pipe/plate electrodes, so it is capped at 6 AWG copper (4 AWG aluminum); if it continues to other electrode types, the full table size applies.',
  es: 'El conductor va SOLO a varillas/tubos/placas, por eso se limita a #6 de cobre (#4 de aluminio); si sigue hacia otros electrodos, aplica el calibre completo de la tabla.',
  citations: ['nec2026.s250_66_a'],
}

export interface GecInput {
  /** Largest ungrounded service/feeder conductor (equivalent single size for parallel sets). */
  largestUngroundedSize: ConductorSize
  /** Material of the SERVICE conductors — selects the lookup column. */
  serviceMaterial: ConductorMaterial
  /** Material of the GEC itself. */
  material: ConductorMaterial
  /** 'rod' = sole connection to rod/pipe/plate electrodes (250.66(A) cap). Default 'other'. */
  electrode?: 'rod' | 'other'
}

export interface GecResult extends WithProvenance {
  size: ConductorSize
  /** The plain Table 250.66 size, before the 250.66(A) cap. */
  tableSize: ConductorSize
  rodCapApplied: boolean
  electrode: 'rod' | 'other'
}

const idx = (size: ConductorSize): number => CONDUCTOR_SIZES.indexOf(size)

export function gecSize(input: GecInput): GecResult {
  const electrode = input.electrode ?? 'other'

  const row = gecTable.rows.find(
    (r) =>
      idx(input.largestUngroundedSize) <=
      idx(input.serviceMaterial === 'copper' ? r.maxServiceCopper : r.maxServiceAluminum),
  )
  if (!row) {
    const last = gecTable.rows[gecTable.rows.length - 1]
    throw new EngineError(
      `No Table 250.66 row for service conductors over ${last?.maxServiceCopper} — outside the range transcribed into this app`,
      `No hay fila de la Tabla 250.66 para conductores de acometida mayores a ${last?.maxServiceCopper}: queda fuera del rango que tiene cargado la app.`,
      'coverage',
    )
  }
  const tableSize = input.material === 'copper' ? row.gecCopper : row.gecAluminum

  const cap: ConductorSize = input.material === 'copper' ? '6' : '4'
  const rodCapApplied = electrode === 'rod' && idx(tableSize) > idx(cap)
  const size = rodCapApplied ? cap : tableSize

  const citations: GecResult['citations'] = ['nec2026.t250_66']
  if (rodCapApplied) citations.push('nec2026.s250_66_a')

  const assumptions: Assumption[] = []
  if (electrode === 'rod') assumptions.push(ASSUME_ROD_CAP)
  if (idx(size) < idx('6')) assumptions.push(ASSUME_PROTECTION)

  return { size, tableSize, rodCapApplied, electrode, citations, assumptions, deviations: [] }
}
