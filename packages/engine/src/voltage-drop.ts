import {
  CONDUCTOR_SIZES,
  conductorResistance,
  type ConductorMaterial,
  type ConductorSize,
} from '@nec-assistant/data'
import { EngineError, type Assumption, type Deviation, type WithProvenance } from './types.js'

function deviationVoltageDrop(dropPercent: number, limit: number): Deviation {
  const got = dropPercent.toFixed(1)
  return {
    key: 'voltage-drop-over-limit',
    en: `Voltage drop is ${got}%, above the ${limit}% recommended for this run. This is not an NEC violation — the limit is an Informational Note — but the equipment gets less voltage and works harder.`,
    es: `La caída de tensión es de ${got}%, arriba del ${limit}% recomendado para este tramo. No es una violación del NEC (el límite es una Nota Informativa), pero el equipo recibe menos voltaje y trabaja forzado.`,
    citations: ['nec2026.in210_19_vd'],
    severity: 'recommendation',
  }
}

const ASSUME_DC_RESISTANCE: Assumption = {
  key: 'dc-resistance-pf1',
  en: 'Voltage drop was calculated with the wire’s DC resistance (sufficient for residential sizes); on very thick wires or very long runs the real value can differ a bit.',
  es: 'La caída de tensión se calculó con la resistencia del alambre en corriente directa (suficiente para calibres residenciales); en calibres muy gruesos o tramos muy largos el valor real puede variar un poco.',
  citations: ['nec2026.ch9_t8'],
}

export interface VoltageDropInput {
  /** Load current in amperes. */
  currentA: number
  /** One-way circuit length in meters. */
  lengthM: number
  size: ConductorSize
  material: ConductorMaterial
  /** System voltage (e.g. 120, 240, 208). */
  systemVoltage: number
  /** 1 = single-phase (default), 3 = three-phase. */
  phase?: 1 | 3
  /**
   * Drop percentage the run is measured against. Default 3 (the branch-circuit
   * recommendation). Exceeding it is reported as a `recommendation` deviation,
   * never an error: 210.19's voltage-drop guidance is an Informational Note and
   * is explicitly not enforceable.
   */
  maxDropPercent?: number
}

export interface VoltageDropResult extends WithProvenance {
  size: ConductorSize
  resistanceOhmPerKm: number
  dropVolts: number
  dropPercent: number
}

export function voltageDrop(input: VoltageDropInput): VoltageDropResult {
  const resistance = conductorResistance[input.material][input.size]
  if (resistance == null) {
    throw new EngineError(
      `No ${input.material} resistance entry for size ${input.size}`,
      `No hay resistencia de ${input.material === 'copper' ? 'cobre' : 'aluminio'} para el calibre ${input.size}`,
    )
  }
  const phase = input.phase ?? 1
  const multiplier = phase === 3 ? Math.sqrt(3) : 2
  const dropVolts = multiplier * input.currentA * resistance * (input.lengthM / 1000)
  const dropPercent = (dropVolts / input.systemVoltage) * 100
  // Always measured against a limit (default 3) rather than only when one is
  // supplied — a check that silently skips itself is worse than no check.
  const limit = input.maxDropPercent ?? 3
  return {
    size: input.size,
    resistanceOhmPerKm: resistance,
    dropVolts,
    dropPercent,
    citations: ['nec2026.ch9_t8', 'nec2026.in210_19_vd'],
    assumptions: [ASSUME_DC_RESISTANCE],
    deviations: dropPercent > limit ? [deviationVoltageDrop(dropPercent, limit)] : [],
  }
}

export type MinSizeForVoltageDropInput = Omit<VoltageDropInput, 'size'>

/**
 * Smallest conductor keeping voltage drop at or under the target percent.
 * When even 600 kcmil cannot, the largest size is returned carrying the
 * `voltage-drop-over-limit` deviation — the honest answer is «this is the best
 * you can do and it is still over», not a refusal to answer.
 */
export function minSizeForVoltageDrop(input: MinSizeForVoltageDropInput): VoltageDropResult {
  const maxDropPercent = input.maxDropPercent ?? 3
  let last: VoltageDropResult | undefined
  for (const size of CONDUCTOR_SIZES) {
    if (conductorResistance[input.material][size] == null) continue
    last = voltageDrop({ ...input, size })
    if (last.dropPercent <= maxDropPercent) return last
  }
  if (!last) {
    throw new EngineError(
      `No Chapter 9 Table 8 resistance entries for ${input.material}`,
      `No hay entradas de resistencia de la Tabla 8 del Capítulo 9 para ${input.material === 'copper' ? 'cobre' : 'aluminio'}`,
      'coverage',
    )
  }
  return last
}
