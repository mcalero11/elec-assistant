import {
  BOX_CONDUCTOR_SIZES,
  boxAllowances,
  standardBoxes,
  type BoxConductorSize,
  type BoxShape,
  type StandardBox,
} from '@nec-assistant/data'
import { EngineError, type Assumption, type Deviation, type WithProvenance } from './types.js'

/**
 * Box fill per NEC 314.16(B)(1)–(5): volume allowances for conductors, internal
 * cable clamps, luminaire support fittings, device yokes, and equipment
 * grounding conductors, checked against a standard metal box (Table 314.16(A))
 * or a marked volume (nonmetallic/custom boxes, 314.16(A)(2)).
 *
 * Composition idiom: run `sizeCircuit` first, then bring its conductor size and
 * count here together with the devices and EGCs that land in the same box:
 *
 *   const circuit = sizeCircuit({...})
 *   const box = sizeBox({
 *     conductors: [{ size: circuit.conductor.size, count: 4 }],
 *     deviceYokes: [{ count: 1, largestConductor: circuit.conductor.size }],
 *     egcCount: 2, largestEgc: egc.size,
 *   })
 *
 * The caller applies the 314.16(B)(1) counting rules before calling (each
 * conductor terminating or spliced in the box = 1; passing through unbroken
 * = 1, or 2 when looped ≥ 300 mm; pigtails that never leave the box = 0) —
 * `ASSUME_COUNTING` restates them on every result.
 *
 * Non-goals: conductors 4 AWG and larger (314.28 pull-box sizing governs —
 * structurally excluded by `BoxConductorSize`), boxes with barriers, extension
 * rings or domed covers with marked volume, terminal-block fill (314.16(B)(6),
 * new in 2023), and conduit bodies (314.16(C)). Isolated EGCs per 250.146(D)
 * need no special handling: the pre-2020 extra-allowance clause was deleted
 * when the four-EGC/quarter-allowance rule of (B)(5) replaced it — they simply
 * count in `egcCount`.
 */

function deviationBoxFill(requiredCm3: number, boxVolumeCm3: number): Deviation {
  const need = requiredCm3.toFixed(1)
  const have = boxVolumeCm3.toFixed(1)
  return {
    key: 'box-fill-exceeds',
    en: `The contents need ${need} cm³ and the box holds ${have} cm³. Packing it in anyway is outside the code — use a larger box or split the splices.`,
    es: `El contenido necesita ${need} cm³ y la caja tiene ${have} cm³. Meterlo así queda fuera de norma: use una caja más grande o reparta los empalmes.`,
    citations: ['nec2026.t314_16_b', 'nec2026.s314_16_b_1'],
    severity: 'off-code',
  }
}

const ASSUME_COUNTING: Assumption = {
  key: 'box-fill-counting',
  en: 'Conductor counts follow the 314.16(B)(1) rules: each wire that ends or splices in the box counts once; a wire passing through unbroken counts once (twice if it leaves a loop of 300 mm or more); short pigtails that never leave the box, wire nuts, and locknuts count zero.',
  es: 'El conteo de conductores sigue las reglas de 314.16(B)(1): cada alambre que termina o se empalma en la caja cuenta una vez; el que pasa sin cortarse cuenta una vez (dos si deja un bucle de 300 mm o más); las colas cortas que no salen de la caja, los conectores de empalme (wire nuts) y las contratuercas cuentan cero.',
  citations: ['nec2026.s314_16_b_1'],
}

const ASSUME_NO_BARRIERS: Assumption = {
  key: 'box-no-barriers',
  en: 'The box is assumed to have no internal barriers; a barrier splits the box into separately calculated volumes.',
  es: 'Se asume que la caja no tiene barreras internas; una barrera divide la caja en volúmenes que se calculan por separado.',
}

const ASSUME_WIDE_DEVICES: Assumption = {
  key: 'box-standard-width-devices',
  en: 'Devices are assumed to be standard width; a device or utilization equipment wider than 50 mm (2 in.) requires a double volume allowance for each gang it occupies — verify unusually wide devices.',
  es: 'Se asume que los dispositivos son de ancho estándar; un dispositivo más ancho de 50 mm (2 pulg) exige doble volumen por cada espacio (gang) que ocupa — verifique dispositivos anchos.',
  citations: ['nec2026.s314_16_b_4'],
}

const ASSUME_MARKED_VOLUME: Assumption = {
  key: 'box-marked-volume',
  en: 'The entered volume must be the volume durably marked on the box by the manufacturer (required for nonmetallic and nonstandard boxes).',
  es: 'El volumen ingresado debe ser el que el fabricante marcó de forma durable en la caja (obligatorio para cajas no metálicas y no estándar).',
  citations: ['nec2026.t314_16_a'],
}

/** Kill float noise from summing decimal cm³ allowances before comparing. */
const exact = (n: number): number => Number(n.toFixed(6))

export interface BoxConductorEntry {
  size: BoxConductorSize
  count: number
}

export interface BoxDeviceYokeEntry {
  count: number
  /** Largest conductor connected to a device on this yoke — the 314.16(B)(4) allowance basis. */
  largestConductor: BoxConductorSize
}

/** The countable box contents — shared by the check and size directions. */
export interface BoxFillItemsInput {
  /** Conductors counted per 314.16(B)(1) — apply the counting rules first (see ASSUME_COUNTING). */
  conductors: BoxConductorEntry[]
  /** One or more internal cable clamps: single allowance at the largest conductor in the box. Default false. */
  internalClamps?: boolean
  /** 314.16(B)(3): single allowance per type of luminaire support fitting present. Default false. */
  luminaireStud?: boolean
  hickey?: boolean
  /** 314.16(B)(4): each yoke/strap takes a double allowance at its largest connected conductor. */
  deviceYokes?: BoxDeviceYokeEntry[]
  /** 314.16(B)(5): total EGCs/bonding jumpers entering the box. Default 0. */
  egcCount?: number
  /** Required when egcCount ≥ 1 — the largest EGC ENTERING the box, the 314.16(B)(5) allowance basis. */
  largestEgc?: BoxConductorSize
}

export interface BoxFillInput extends BoxFillItemsInput {
  /** Exactly one of boxId (a Table 314.16(A) standard box) or volumeCm3 (marked volume). */
  boxId?: string
  volumeCm3?: number
}

export interface SizeBoxInput extends BoxFillItemsInput {
  /** Restrict the standard-box search to one shape (e.g. octagonal ceiling boxes). */
  shape?: BoxShape
}

export interface BoxFillBreakdown {
  conductorsCm3: number
  clampsCm3: number
  supportFittingsCm3: number
  devicesCm3: number
  egcCm3: number
}

export interface BoxFillResult extends WithProvenance {
  /** null in marked-volume mode. */
  boxId: string | null
  boxLabel: { es: string; en: string } | null
  shape: BoxShape | null
  boxVolumeCm3: number
  /** Exact sum of the breakdown categories. */
  requiredVolumeCm3: number
  fits: boolean
  /** requiredVolumeCm3 / boxVolumeCm3 × 100. */
  fillPercent: number
  breakdown: BoxFillBreakdown
  countedConductors: number
  /** 2 × Σ yoke counts. */
  deviceAllowances: number
  /** 1 for 1–4 EGCs; +0.25 per EGC beyond four; 0 when none. */
  egcAllowances: number
  /** True when the quarter-allowance rule for a fifth-plus EGC changed the count. */
  egcQuarterRuleApplied: boolean
  /** Basis for the clamp and support-fitting allowances: largest conductor present in the box. */
  largestConductor: BoxConductorSize
}

const sizeIndex = (size: BoxConductorSize): number => BOX_CONDUCTOR_SIZES.indexOf(size)

function allowanceCm3(size: BoxConductorSize): number {
  const row = boxAllowances.allowances.find((a) => a.size === size)
  if (!row) {
    throw new EngineError(
      `No Table 314.16(B)(1) volume allowance for size ${size}`,
      `No hay volumen por conductor en la Tabla 314.16(B)(1) para el calibre ${size}`,
    )
  }
  return row.cm3
}

function validateItems(input: BoxFillItemsInput): void {
  if (input.conductors.length === 0) {
    throw new EngineError(
      'Box fill requires at least one conductor entry',
      'El cálculo de relleno de caja requiere al menos un conductor',
    )
  }
  for (const entry of input.conductors) {
    if (!Number.isInteger(entry.count) || entry.count < 1) {
      throw new EngineError(
        `Conductor count must be a whole number ≥ 1 (got ${entry.count})`,
        `La cantidad de conductores debe ser un número entero ≥ 1 (se recibió ${entry.count})`,
      )
    }
  }
  for (const yoke of input.deviceYokes ?? []) {
    if (!Number.isInteger(yoke.count) || yoke.count < 1) {
      throw new EngineError(
        `Device yoke count must be a whole number ≥ 1 (got ${yoke.count})`,
        `La cantidad de yugos de dispositivos debe ser un número entero ≥ 1 (se recibió ${yoke.count})`,
      )
    }
  }
  const egcCount = input.egcCount ?? 0
  if (!Number.isInteger(egcCount) || egcCount < 0) {
    throw new EngineError(
      `EGC count must be a whole number ≥ 0 (got ${egcCount})`,
      `La cantidad de conductores de tierra debe ser un número entero ≥ 0 (se recibió ${egcCount})`,
    )
  }
  if (egcCount >= 1 && input.largestEgc == null) {
    throw new EngineError(
      'largestEgc is required when egcCount ≥ 1 (the 314.16(B)(5) allowance basis)',
      'Se requiere largestEgc cuando egcCount ≥ 1 (es la base del volumen según 314.16(B)(5))',
    )
  }
}

/** Check a specific box volume against the contents (interactive-calculator direction). */
export function boxFill(input: BoxFillInput): BoxFillResult {
  validateItems(input)

  const hasBoxId = input.boxId != null
  const hasVolume = input.volumeCm3 != null
  if (hasBoxId === hasVolume) {
    throw new EngineError(
      'Provide exactly one of boxId (standard box) or volumeCm3 (marked volume)',
      'Proporcione exactamente uno: boxId (caja estándar) o volumeCm3 (volumen marcado)',
    )
  }

  let box: StandardBox | null = null
  let boxVolumeCm3: number
  if (hasBoxId) {
    box = standardBoxes.boxes.find((b) => b.id === input.boxId) ?? null
    if (!box) {
      throw new EngineError(
        `Unknown standard box id "${input.boxId}" (Table 314.16(A))`,
        `Caja estándar desconocida: "${input.boxId}" (Tabla 314.16(A))`,
      )
    }
    boxVolumeCm3 = box.volumeCm3
  } else {
    if (!(input.volumeCm3! > 0)) {
      throw new EngineError(
        `Marked box volume must be positive (got ${input.volumeCm3} cm³)`,
        `El volumen marcado de la caja debe ser positivo (se recibió ${input.volumeCm3} cm³)`,
      )
    }
    boxVolumeCm3 = input.volumeCm3!
  }

  // Largest conductor present in the box — basis for clamp and support-fitting allowances.
  let largestConductor = input.conductors[0]!.size
  for (const entry of input.conductors) {
    if (sizeIndex(entry.size) > sizeIndex(largestConductor)) largestConductor = entry.size
  }
  if (input.largestEgc != null && sizeIndex(input.largestEgc) > sizeIndex(largestConductor)) {
    largestConductor = input.largestEgc
  }

  const conductorsCm3 = input.conductors.reduce(
    (sum, entry) => sum + entry.count * allowanceCm3(entry.size),
    0,
  )
  const countedConductors = input.conductors.reduce((sum, entry) => sum + entry.count, 0)

  const clampsCm3 = input.internalClamps ? allowanceCm3(largestConductor) : 0

  const fittingTypes = (input.luminaireStud ? 1 : 0) + (input.hickey ? 1 : 0)
  const supportFittingsCm3 = fittingTypes * allowanceCm3(largestConductor)

  const yokes = input.deviceYokes ?? []
  const deviceAllowances = 2 * yokes.reduce((sum, yoke) => sum + yoke.count, 0)
  const devicesCm3 = yokes.reduce(
    (sum, yoke) => sum + 2 * yoke.count * allowanceCm3(yoke.largestConductor),
    0,
  )

  const egcCount = input.egcCount ?? 0
  const egcQuarterRuleApplied = egcCount > 4
  const egcAllowances = egcCount === 0 ? 0 : 1 + (egcQuarterRuleApplied ? 0.25 * (egcCount - 4) : 0)
  const egcCm3 = egcCount === 0 ? 0 : egcAllowances * allowanceCm3(input.largestEgc!)

  const breakdown: BoxFillBreakdown = {
    conductorsCm3: exact(conductorsCm3),
    clampsCm3: exact(clampsCm3),
    supportFittingsCm3: exact(supportFittingsCm3),
    devicesCm3: exact(devicesCm3),
    egcCm3: exact(egcCm3),
  }
  const requiredVolumeCm3 = exact(
    conductorsCm3 + clampsCm3 + supportFittingsCm3 + devicesCm3 + egcCm3,
  )

  // Conditional citations: each 314.16(B) subsection is cited only when its
  // category is actually present; Table 314.16(A) only when a standard box is used.
  const citations: BoxFillResult['citations'] = ['nec2026.t314_16_b', 'nec2026.s314_16_b_1']
  if (box) citations.unshift('nec2026.t314_16_a')
  if (input.internalClamps) citations.push('nec2026.s314_16_b_2')
  if (fittingTypes > 0) citations.push('nec2026.s314_16_b_3')
  if (yokes.length > 0) citations.push('nec2026.s314_16_b_4')
  if (egcCount >= 1) citations.push('nec2026.s314_16_b_5')

  const assumptions: Assumption[] = [ASSUME_COUNTING, ASSUME_NO_BARRIERS]
  if (yokes.length > 0) assumptions.push(ASSUME_WIDE_DEVICES)
  if (!box) assumptions.push(ASSUME_MARKED_VOLUME)

  const fits = requiredVolumeCm3 <= boxVolumeCm3

  return {
    boxId: box?.id ?? null,
    boxLabel: box?.label ?? null,
    shape: box?.shape ?? null,
    boxVolumeCm3,
    requiredVolumeCm3,
    fits,
    fillPercent: (requiredVolumeCm3 / boxVolumeCm3) * 100,
    breakdown,
    countedConductors,
    deviceAllowances,
    egcAllowances,
    egcQuarterRuleApplied,
    largestConductor,
    citations,
    assumptions,
    deviations: fits ? [] : [deviationBoxFill(requiredVolumeCm3, boxVolumeCm3)],
  }
}

/** Smallest Table 314.16(A) box that accepts the contents (job-flow direction). */
export function sizeBox(input: SizeBoxInput): BoxFillResult {
  validateItems(input)

  const candidates = standardBoxes.boxes.filter(
    (box) => input.shape == null || box.shape === input.shape,
  )
  if (candidates.length === 0) {
    throw new EngineError(
      `No standard boxes of shape "${input.shape}" in Table 314.16(A)`,
      `No hay cajas estándar de forma "${input.shape}" en la Tabla 314.16(A)`,
    )
  }

  // Rows are ordered ascending by volume (asserted by the data-sanity property
  // test), so the first fit is the minimum box. When nothing fits, the largest
  // candidate is returned with `fits: false` and boxFill's own deviation — the
  // same shape `boxFill` has always returned, rather than a refusal to answer.
  let last: BoxFillResult | undefined
  for (const box of candidates) {
    last = boxFill({ ...input, boxId: box.id })
    if (last.fits) return last
  }
  return last!
}
