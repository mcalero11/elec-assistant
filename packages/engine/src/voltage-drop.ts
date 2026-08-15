import {
  CONDUCTOR_SIZES,
  conductorResistance,
  type ConductorMaterial,
  type ConductorSize,
} from '@elec-assistant/data'
import { EngineError, type Assumption, type WithProvenance } from './types.js'

const ASSUME_DC_RESISTANCE: Assumption = {
  key: 'dc-resistance-pf1',
  en: 'Voltage drop uses DC resistance (Ch. 9 Table 8, 75°C) with power factor 1.0; AC impedance (Ch. 9 Table 9) is a refinement for large sizes/long runs.',
  es: 'La caída de tensión usa resistencia DC (Cap. 9 Tabla 8, 75°C) con factor de potencia 1.0; la impedancia AC (Cap. 9 Tabla 9) es un refinamiento para calibres grandes/tramos largos.',
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
  return {
    size: input.size,
    resistanceOhmPerKm: resistance,
    dropVolts,
    dropPercent: (dropVolts / input.systemVoltage) * 100,
    citations: ['nec2026.ch9_t8', 'nec2026.in210_19_vd'],
    assumptions: [ASSUME_DC_RESISTANCE],
  }
}

export interface MinSizeForVoltageDropInput extends Omit<VoltageDropInput, 'size'> {
  /** Maximum allowed voltage drop in percent. Default 3 (branch-circuit recommendation). */
  maxDropPercent?: number
}

/** Smallest conductor keeping voltage drop at or under the target percent. */
export function minSizeForVoltageDrop(input: MinSizeForVoltageDropInput): VoltageDropResult {
  const maxDropPercent = input.maxDropPercent ?? 3
  for (const size of CONDUCTOR_SIZES) {
    if (conductorResistance[input.material][size] == null) continue
    const result = voltageDrop({ ...input, size })
    if (result.dropPercent <= maxDropPercent) return result
  }
  throw new EngineError(
    `No conductor size up to 600 kcmil keeps voltage drop under ${maxDropPercent}% for this run`,
    `Ningún calibre hasta 600 kcmil mantiene la caída de tensión bajo ${maxDropPercent}% en este tramo`,
  )
}
