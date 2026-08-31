import {
  appliancePresets,
  article220,
  lightingDemand,
  rangeDemand,
  standardBreakers,
  type ApplianceCategory,
  type CitationKey,
} from '@nec-assistant/data'
import {
  EngineError,
  mergeAssumptions,
  mergeCitations,
  mergeDeviations,
  type Assumption,
  type Deviation,
  type WithProvenance,
} from './types.js'

/**
 * Residential load calculation for a single dwelling unit on a 120/240 V
 * single-phase service, per NEC 2026 Article 120 (the 2026 relocation of
 * Article 220 — identifiers here keep the familiar 220 names): the standard
 * method (general lighting pool at 22 VA/m² with Table 120.45 demand, ranges
 * per Table 120.55 Column C, dryers per 120.54 with the revised 2026 count
 * factors, the 120.53 75% appliance demand, largest-motor 25%, and the 120.6
 * noncoincident A/C-vs-heat pick) and the optional method (120.82 — 100% of
 * the first 8 kVA plus 40% of the remainder, HVAC per (C)). Both methods are
 * always computed together so the UI can show the honest comparison; neither
 * always wins.
 *
 * Non-goals: multifamily (120.84/85), Table 120.55 Columns A/B (demand is
 * capped at connected nameplate instead), feeder-neutral sizing, more than
 * 6 ranges or 5 dryers, heat pumps with supplemental heat and the per-room
 * heating options of 120.82(C) (heat is modeled as central at 65%),
 * EVSE (120.57/120.82(D)), and three-phase services. The 120.13 branch-circuit
 * counting value (33 VA/m²) is not used here — this calc sizes the service.
 */

const ASSUME_240V: Assumption = {
  key: 'load-240v-service',
  en: `Amps are computed at ${article220.nominalServiceVoltage} V on a single-phase three-wire service. The service is nominally 120/240 V, but it measures nearer ${article220.nominalServiceVoltage} V at the panel here, and the lower figure is the conservative one — it reports more amps, not fewer.`,
  es: `Los amperios se calculan a ${article220.nominalServiceVoltage} V, con servicio monofásico de tres hilos. El servicio es nominalmente de 120/240 V, pero en el tablero se mide más cerca de ${article220.nominalServiceVoltage} V, y el número más bajo es el conservador: reporta más amperios, no menos.`,
}

const ASSUME_TYPICAL_WATTAGES: Assumption = {
  key: 'load-typical-wattages',
  en: 'Preset appliance wattages are typical values — verify the nameplate of YOUR equipment.',
  es: 'Los vatajes predefinidos son valores típicos — verifique la placa de datos de SUS equipos.',
}

const ASSUME_RANGE_COLUMN_C: Assumption = {
  key: 'range-column-c',
  en: 'Range demand uses Table 120.55 Column C, capped at the connected nameplate; Columns A/B for small ranges are not modeled.',
  es: 'La demanda de estufas usa la Columna C de la Tabla 120.55, limitada a la placa de datos; las columnas A/B para estufas pequeñas no están modeladas.',
  citations: ['nec2026.t220_55'],
}

const ASSUME_COVERED: Assumption = {
  key: 'load-covered-devices',
  en: 'Plug-in devices (fridge, microwave, TV…) are already inside the general lighting and small-appliance/laundry circuit loads; they add no extra VA.',
  es: 'Los aparatos enchufados (refri, micro, TV…) ya están contados en la carga general y los circuitos de cocina/lavandería; no suman aparte.',
  citations: ['nec2026.s220_52'],
}

const ASSUME_NO_LAUNDRY: Assumption = {
  key: 'load-no-laundry',
  en: 'No laundry circuit was included — 120.52(B) requires one where a laundry area exists.',
  es: 'No se incluyó circuito de lavandería — 120.52(B) lo exige cuando hay área de lavandería.',
  citations: ['nec2026.s220_52'],
}

const ASSUME_OPTIONAL_APPLICABILITY: Assumption = {
  key: 'optional-method-applicability',
  en: 'The optional method (120.82) applies to a dwelling served by a single 120/240 V three-wire service of at least 100 A.',
  es: 'El método opcional (120.82) aplica a viviendas con un solo servicio de 120/240 V de tres hilos, de al menos 100 A.',
  citations: ['nec2026.s220_82'],
}

const ASSUME_HEAT_CENTRAL_65: Assumption = {
  key: 'heat-central-65',
  en: 'Heating is modeled as central space heating at 65% in the optional method; other heating arrangements use different percentages.',
  es: 'La calefacción se modela como calefacción central al 65% en el método opcional; otros arreglos usan otros porcentajes.',
  citations: ['nec2026.s220_82'],
}

export interface LoadDeviceInput {
  /** Either a catalog preset id… */
  presetId?: string
  /** …or a custom device: nameplate VA plus its Article 220 category. */
  va?: number
  category?: ApplianceCategory
  label?: { es: string; en: string }
  /** Integer ≥ 1. Default 1. */
  qty?: number
}

export interface ResidentialLoadInput {
  areaM2: number
  /** 220.52(A) requires at least 2. Default 2. */
  smallApplianceCircuits?: number
  /** 0 allowed (surfaces an assumption). Default 1. */
  laundryCircuits?: number
  devices?: LoadDeviceInput[]
}

export interface ResolvedLoadDevice {
  label: { es: string; en: string }
  va: number
  qty: number
  category: ApplianceCategory
}

export interface LoadLine {
  key: string
  label: { es: string; en: string }
  connectedVa: number
  /** null when the factor is not a flat percentage (tiers, Column C, max-of). */
  demandFactorPercent: number | null
  demandVa: number
  citations: CitationKey[]
  /** The arithmetic, for the UI detail row. */
  detail?: { es: string; en: string }
}

export interface LoadMethodResult extends WithProvenance {
  method: 'standard' | 'optional'
  lines: LoadLine[]
  generalLightingVa: number
  smallApplianceVa: number
  laundryVa: number
  totalConnectedVa: number
  totalDemandVa: number
  amps: number
  /** First 240.6(A) rating ≥ max(amps, 100 A per 230.79(C)). */
  serviceA: number
  serviceFlooredTo100: boolean
  applianceDemand75Applied: boolean
  dryerMinApplied: boolean
  rangeNote1Applied: boolean
  rangeCappedAtNameplate: boolean
  heatGovernsOverAc: boolean
}

export interface ResidentialLoadResult extends WithProvenance {
  standard: LoadMethodResult
  optional: LoadMethodResult
  /** Method yielding the smaller service — NOT guaranteed to be 'optional'. */
  governingMethod: 'standard' | 'optional'
  minServiceA: number
  devices: ResolvedLoadDevice[]
}

/** Plain rounded number for engine-owned detail prose (the UI formats totals itself). */
const n = (x: number): number => Math.round(x * 100) / 100

function resolveDevices(inputs: LoadDeviceInput[]): { devices: ResolvedLoadDevice[]; usedPresets: boolean } {
  let usedPresets = false
  const devices = inputs.map((d) => {
    const qty = d.qty ?? 1
    if (!Number.isInteger(qty) || qty < 1) {
      throw new EngineError(
        `Device quantity must be a whole number ≥ 1 (got ${qty})`,
        `La cantidad de aparatos debe ser un número entero ≥ 1 (se recibió ${qty})`,
      )
    }
    if (d.presetId != null) {
      if (d.va != null || d.category != null) {
        throw new EngineError(
          `Device "${d.presetId}": provide either presetId or va+category, not both`,
          `Aparato "${d.presetId}": proporcione presetId o va+categoría, no ambos`,
        )
      }
      const preset = appliancePresets.find((p) => p.id === d.presetId)
      if (!preset) {
        throw new EngineError(
          `Unknown appliance preset "${d.presetId}"`,
          `Aparato predefinido desconocido: "${d.presetId}"`,
        )
      }
      usedPresets = true
      return { label: preset.label, va: preset.typicalVa, qty, category: preset.category }
    }
    if (d.va == null || !(d.va > 0) || d.category == null) {
      throw new EngineError(
        'Custom devices need a positive va and a category',
        'Los aparatos manuales necesitan un va positivo y una categoría',
      )
    }
    return {
      label: d.label ?? { es: `Aparato de ${d.va} VA`, en: `${d.va} VA appliance` },
      va: d.va,
      qty,
      category: d.category,
    }
  })
  return { devices, usedPresets }
}

const sumVa = (devices: ResolvedLoadDevice[], category: ApplianceCategory): number =>
  devices.filter((d) => d.category === category).reduce((sum, d) => sum + d.va * d.qty, 0)

const countOf = (devices: ResolvedLoadDevice[], category: ApplianceCategory): number =>
  devices.filter((d) => d.category === category).reduce((sum, d) => sum + d.qty, 0)

/** Marginal application of the Table 220.45 dwelling tiers. */
function tieredLightingDemand(connectedVa: number): number {
  let demand = 0
  let previousCap = 0
  for (const tier of lightingDemand.tiers) {
    const cap = tier.upToVa ?? Number.POSITIVE_INFINITY
    const portion = Math.max(0, Math.min(connectedVa, cap) - previousCap)
    demand += (portion * tier.percent) / 100
    previousCap = cap
  }
  return demand
}

/**
 * The 230.79(C) 100 A floor here is a floor on the RESULT, not a gate on the
 * input: a 100 A service on a 20 A calculated load is perfectly compliant, and
 * the true figure stays visible on `amps`. It therefore emits no deviation —
 * please don't "fix" that.
 */
function serviceFor(totalDemandVa: number): {
  amps: number
  serviceA: number
  flooredTo100: boolean
  deviations: Deviation[]
} {
  const amps = totalDemandVa / article220.nominalServiceVoltage
  const required = Math.max(amps, article220.minDwellingServiceA)
  const ratings = standardBreakers.ratings
  const rating = ratings.find((r) => r >= required)
  const largest = ratings[ratings.length - 1]!
  const flooredTo100 = amps < article220.minDwellingServiceA
  if (rating == null) {
    return {
      amps,
      serviceA: largest,
      flooredTo100,
      deviations: [
        {
          key: 'service-above-standard-ratings',
          en: `The calculated service of ${n(amps)} A is above the largest standard rating (${largest} A). ${largest} A is shown; at that scale the job needs engineering design.`,
          es: `La acometida calculada de ${n(amps)} A supera el valor estándar más grande (${largest} A). Se muestra ${largest} A; a esa escala el trabajo requiere diseño de ingeniería.`,
          citations: ['nec2026.s240_6_a'],
          severity: 'off-code',
        },
      ],
    }
  }
  return { amps, serviceA: rating, flooredTo100, deviations: [] }
}

interface PoolBreakdown {
  lightingVa: number
  smallApplianceVa: number
  laundryVa: number
}

function buildStandard(
  pool: PoolBreakdown,
  areaM2: number,
  devices: ResolvedLoadDevice[],
): LoadMethodResult {
  const lines: LoadLine[] = []
  const a220 = article220
  const poolConnected = pool.lightingVa + pool.smallApplianceVa + pool.laundryVa

  // 1. General lighting + small-appliance + laundry pool, tiered demand.
  const poolDemand = tieredLightingDemand(poolConnected)
  const firstTier = lightingDemand.tiers[0]?.upToVa ?? 3000
  lines.push({
    key: 'general-pool',
    label: {
      es: 'Carga general (alumbrado + cocina + lavandería)',
      en: 'General load (lighting + small-appliance + laundry)',
    },
    connectedVa: poolConnected,
    demandFactorPercent: null,
    demandVa: poolDemand,
    citations: ['nec2026.s220_41', 'nec2026.s220_52', 'nec2026.t220_45'],
    detail: {
      es: `${a220.generalLightingVaPerM2} VA/m² × ${n(areaM2)} m² = ${n(pool.lightingVa)} VA + ${n(pool.smallApplianceVa + pool.laundryVa)} VA de circuitos; primeros ${firstTier} VA al 100% y el resto con factor de demanda = ${n(poolDemand)} VA`,
      en: `${a220.generalLightingVaPerM2} VA/m² × ${n(areaM2)} m² = ${n(pool.lightingVa)} VA + ${n(pool.smallApplianceVa + pool.laundryVa)} VA of circuits; first ${firstTier} VA at 100% and the rest at the demand factors = ${n(poolDemand)} VA`,
    },
  })

  // 2. Ranges — Table 220.55 Column C + Note 1, capped at nameplate.
  const rangeDevices = devices.filter((d) => d.category === 'range')
  const rangeCount = countOf(devices, 'range')
  let rangeNote1Applied = false
  let rangeCappedAtNameplate = false
  if (rangeCount > 0) {
    const maxRow = rangeDemand.columnC[rangeDemand.columnC.length - 1]
    if (maxRow == null || rangeCount > maxRow.appliances) {
      throw new EngineError(
        `More than ${maxRow?.appliances} cooking appliances is outside the Table 120.55 Column C rows transcribed into this app`,
        `Más de ${maxRow?.appliances} aparatos de cocción queda fuera de las filas de la Columna C de la Tabla 120.55 que tiene cargadas la app. No es que incumpla: falta el dato.`,
        'coverage',
      )
    }
    const connected = sumVa(devices, 'range')
    const maxUnitKw = Math.max(...rangeDevices.map((d) => d.va)) / 1000
    if (maxUnitKw > rangeDemand.note1MaxKw) {
      throw new EngineError(
        `Ranges over ${rangeDemand.note1MaxKw} kW are outside the Table 120.55 Note 1 range transcribed into this app`,
        `Estufas de más de ${rangeDemand.note1MaxKw} kW quedan fuera del rango de la Nota 1 de la Tabla 120.55 que tiene cargado la app. No es que incumpla: falta el dato.`,
        'coverage',
      )
    }
    const baseKw = rangeDemand.columnC.find((r) => r.appliances === rangeCount)!.demandKw
    let demandKw = baseKw
    if (maxUnitKw > rangeDemand.columnCMaxKw) {
      const extra = maxUnitKw - rangeDemand.columnCMaxKw
      const steps = Math.floor(extra) + (extra - Math.floor(extra) >= 0.5 ? 1 : 0)
      demandKw = baseKw * (1 + (steps * rangeDemand.note1PercentPerKw) / 100)
      rangeNote1Applied = true
    }
    let demandVa = demandKw * 1000
    if (demandVa > connected) {
      demandVa = connected
      rangeCappedAtNameplate = true
    }
    lines.push({
      key: 'ranges',
      label: { es: 'Estufas / hornos', en: 'Ranges / ovens' },
      connectedVa: connected,
      demandFactorPercent: null,
      demandVa,
      citations: ['nec2026.t220_55'],
      detail: {
        es: `Columna C para ${rangeCount}: ${baseKw} kW${rangeNote1Applied ? ` +${rangeDemand.note1PercentPerKw}%/kW sobre ${rangeDemand.columnCMaxKw} kW (Nota 1) = ${n(demandKw)} kW` : ''}${rangeCappedAtNameplate ? ` → limitado a la placa (${n(connected)} VA)` : ''}`,
        en: `Column C for ${rangeCount}: ${baseKw} kW${rangeNote1Applied ? ` +${rangeDemand.note1PercentPerKw}%/kW above ${rangeDemand.columnCMaxKw} kW (Note 1) = ${n(demandKw)} kW` : ''}${rangeCappedAtNameplate ? ` → capped at nameplate (${n(connected)} VA)` : ''}`,
      },
    })
  }

  // 3. Dryers — 5 kVA floor per dryer, then the revised 2026 count factors.
  const dryerDevices = devices.filter((d) => d.category === 'dryer')
  const dryerCount = countOf(devices, 'dryer')
  let dryerMinApplied = false
  if (dryerCount > 0) {
    const factorRow = article220.dryerDemandFactors.find((r) => dryerCount <= r.maxCount)
    if (!factorRow) {
      const last = article220.dryerDemandFactors[article220.dryerDemandFactors.length - 1]
      throw new EngineError(
        `More than ${last?.maxCount} dryers needs the full 120.54 count table, which is not transcribed into this app`,
        `Más de ${last?.maxCount} secadoras requiere la tabla completa de conteo de 120.54, que la app todavía no tiene cargada. No es que incumpla: falta el dato.`,
        'coverage',
      )
    }
    const connected = sumVa(devices, 'dryer')
    const floored = dryerDevices.reduce(
      (sum, d) => sum + Math.max(d.va, article220.dryerMinVa) * d.qty,
      0,
    )
    const demand = (floored * factorRow.percent) / 100
    dryerMinApplied = dryerDevices.some((d) => d.va < article220.dryerMinVa)
    lines.push({
      key: 'dryers',
      label: { es: 'Secadoras', en: 'Dryers' },
      connectedVa: connected,
      demandFactorPercent: factorRow.percent,
      demandVa: demand,
      citations: ['nec2026.s220_54'],
      ...(dryerMinApplied || factorRow.percent !== 100
        ? {
            detail: {
              es: `${dryerMinApplied ? `Mínimo de ${article220.dryerMinVa} VA por secadora aunque la placa sea menor` : ''}${dryerMinApplied && factorRow.percent !== 100 ? '; ' : ''}${factorRow.percent !== 100 ? `${dryerCount} secadoras → ${factorRow.percent}%` : ''}`,
              en: `${dryerMinApplied ? `${article220.dryerMinVa} VA minimum per dryer even when the nameplate is lower` : ''}${dryerMinApplied && factorRow.percent !== 100 ? '; ' : ''}${factorRow.percent !== 100 ? `${dryerCount} dryers → ${factorRow.percent}%` : ''}`,
            },
          }
        : {}),
    })
  }

  // 4. Fastened-in-place appliances — 75% when 4 or more (220.53).
  const fixedCount = countOf(devices, 'fixed')
  let applianceDemand75Applied = false
  if (fixedCount > 0) {
    const connected = sumVa(devices, 'fixed')
    applianceDemand75Applied = fixedCount >= article220.fixedApplianceDemand.minCount
    const percent = applianceDemand75Applied ? article220.fixedApplianceDemand.percent : 100
    lines.push({
      key: 'fixed-appliances',
      label: { es: 'Artefactos fijos', en: 'Fastened-in-place appliances' },
      connectedVa: connected,
      demandFactorPercent: percent,
      demandVa: (connected * percent) / 100,
      // Conditional citation: 220.53 is cited only when its 75% actually fired.
      citations: applianceDemand75Applied ? ['nec2026.s220_53'] : [],
      ...(applianceDemand75Applied
        ? {
            detail: {
              es: `${fixedCount} artefactos fijos (≥ ${article220.fixedApplianceDemand.minCount}) → ${percent}%`,
              en: `${fixedCount} fastened-in-place appliances (≥ ${article220.fixedApplianceDemand.minCount}) → ${percent}%`,
            },
          }
        : {}),
    })
  }

  // 5. Motors at 100%, plus 25% of the largest motor/AC (220.50).
  const motorVa = sumVa(devices, 'motor')
  if (motorVa > 0) {
    lines.push({
      key: 'motors',
      label: { es: 'Motores (bombas, etc.)', en: 'Motors (pumps, etc.)' },
      connectedVa: motorVa,
      demandFactorPercent: 100,
      demandVa: motorVa,
      citations: [],
    })
  }

  // 6. Noncoincident A/C vs heat — the larger of the two (220.60).
  const acVa = sumVa(devices, 'ac')
  const heatVa = sumVa(devices, 'heat')
  const heatGovernsOverAc = heatVa > acVa && acVa > 0
  if (acVa > 0 || heatVa > 0) {
    lines.push({
      key: 'hvac',
      label: { es: 'Aire acondicionado / calefacción', en: 'Air conditioning / heating' },
      connectedVa: acVa + heatVa,
      demandFactorPercent: null,
      demandVa: Math.max(acVa, heatVa),
      citations: acVa > 0 && heatVa > 0 ? ['nec2026.s220_60'] : [],
      ...(acVa > 0 && heatVa > 0
        ? {
            detail: {
              es: `Se toma el mayor: A/C ${n(acVa)} VA vs calefacción ${n(heatVa)} VA`,
              en: `The larger governs: A/C ${n(acVa)} VA vs heat ${n(heatVa)} VA`,
            },
          }
        : {}),
    })
  }

  // Largest motor 25% adder — A/C candidates drop out when heat governs (220.60).
  const motorCandidates = devices.filter(
    (d) => d.category === 'motor' || (d.category === 'ac' && !heatGovernsOverAc),
  )
  if (motorCandidates.length > 0) {
    const largest = Math.max(...motorCandidates.map((d) => d.va))
    lines.push({
      key: 'largest-motor',
      label: { es: '25% del motor más grande', en: '25% of the largest motor' },
      connectedVa: 0,
      demandFactorPercent: 25,
      demandVa: largest * 0.25,
      citations: ['nec2026.s220_50'],
      detail: {
        es: `25% × ${n(largest)} VA = ${n(largest * 0.25)} VA`,
        en: `25% × ${n(largest)} VA = ${n(largest * 0.25)} VA`,
      },
    })
  }

  // 7. Covered plug loads — informational, 0 extra VA.
  const coveredVa = sumVa(devices, 'covered')
  if (coveredVa > 0) {
    lines.push({
      key: 'covered',
      label: { es: 'Aparatos enchufados (ya incluidos)', en: 'Plug-in devices (already included)' },
      connectedVa: coveredVa,
      demandFactorPercent: 0,
      demandVa: 0,
      citations: [],
      detail: {
        es: 'Ya incluidos en la carga general y los circuitos de cocina/lavandería',
        en: 'Already inside the general load and the small-appliance/laundry circuits',
      },
    })
  }

  const totalConnectedVa = lines.reduce((sum, l) => sum + l.connectedVa, 0)
  const totalDemandVa = lines.reduce((sum, l) => sum + l.demandVa, 0)
  const { amps, serviceA, flooredTo100, deviations: serviceDeviations } = serviceFor(totalDemandVa)

  const assumptions: Assumption[] = [ASSUME_240V]
  if (rangeCount > 0) assumptions.push(ASSUME_RANGE_COLUMN_C)
  if (coveredVa > 0) assumptions.push(ASSUME_COVERED)

  return {
    method: 'standard',
    lines,
    generalLightingVa: pool.lightingVa,
    smallApplianceVa: pool.smallApplianceVa,
    laundryVa: pool.laundryVa,
    totalConnectedVa,
    totalDemandVa,
    amps,
    serviceA,
    serviceFlooredTo100: flooredTo100,
    applianceDemand75Applied,
    dryerMinApplied,
    rangeNote1Applied,
    rangeCappedAtNameplate,
    heatGovernsOverAc,
    citations: mergeCitations(
      ...lines.map((l) => l.citations),
      ['nec2026.s240_6_a', 'nec2026.s230_79'],
    ),
    assumptions,
    deviations: serviceDeviations,
  }
}

function buildOptional(pool: PoolBreakdown, devices: ResolvedLoadDevice[]): LoadMethodResult {
  const lines: LoadLine[] = []
  const opt = article220.optionalMethod
  const poolConnected = pool.lightingVa + pool.smallApplianceVa + pool.laundryVa

  // (B): pool + nameplate of everything except HVAC and covered plug loads.
  const otherVa =
    sumVa(devices, 'range') + sumVa(devices, 'dryer') + sumVa(devices, 'fixed') + sumVa(devices, 'motor')
  const generalConnected = poolConnected + otherVa
  const first = Math.min(generalConnected, opt.firstTierVa)
  const remainder = Math.max(0, generalConnected - opt.firstTierVa)
  const generalDemand = (first * opt.firstTierPercent) / 100 + (remainder * opt.remainderPercent) / 100
  lines.push({
    key: 'optional-general',
    label: { es: 'Cargas generales (método opcional)', en: 'General loads (optional method)' },
    connectedVa: generalConnected,
    demandFactorPercent: null,
    demandVa: generalDemand,
    citations: ['nec2026.s220_82', 'nec2026.s220_41', 'nec2026.s220_52'],
    detail: {
      es: `${n(first)} VA al ${opt.firstTierPercent}% + ${n(remainder)} VA al ${opt.remainderPercent}% = ${n(generalDemand)} VA (aparatos a placa, sin factores de la Tabla 120.55)`,
      en: `${n(first)} VA at ${opt.firstTierPercent}% + ${n(remainder)} VA at ${opt.remainderPercent}% = ${n(generalDemand)} VA (appliances at nameplate, no Table 120.55 factors)`,
    },
  })

  // (C): larger of A/C at 100% vs central heat at 65%.
  const acVa = sumVa(devices, 'ac')
  const heatVa = sumVa(devices, 'heat')
  const weightedAc = (acVa * opt.acPercent) / 100
  const weightedHeat = (heatVa * opt.centralHeatPercent) / 100
  const heatGovernsOverAc = weightedHeat > weightedAc && acVa > 0
  if (acVa > 0 || heatVa > 0) {
    lines.push({
      key: 'optional-hvac',
      label: { es: 'A/C / calefacción (220.82(C))', en: 'A/C / heating (220.82(C))' },
      connectedVa: acVa + heatVa,
      demandFactorPercent: null,
      demandVa: Math.max(weightedAc, weightedHeat),
      citations: ['nec2026.s220_82'],
      detail: {
        es: `Mayor de: A/C ${n(acVa)} VA × ${opt.acPercent}% vs calefacción ${n(heatVa)} VA × ${opt.centralHeatPercent}%`,
        en: `Larger of: A/C ${n(acVa)} VA × ${opt.acPercent}% vs heat ${n(heatVa)} VA × ${opt.centralHeatPercent}%`,
      },
    })
  }

  const coveredVa = sumVa(devices, 'covered')
  if (coveredVa > 0) {
    lines.push({
      key: 'covered',
      label: { es: 'Aparatos enchufados (ya incluidos)', en: 'Plug-in devices (already included)' },
      connectedVa: coveredVa,
      demandFactorPercent: 0,
      demandVa: 0,
      citations: [],
      detail: {
        es: 'Ya incluidos en la carga general y los circuitos de cocina/lavandería',
        en: 'Already inside the general load and the small-appliance/laundry circuits',
      },
    })
  }

  const totalConnectedVa = lines.reduce((sum, l) => sum + l.connectedVa, 0)
  const totalDemandVa = lines.reduce((sum, l) => sum + l.demandVa, 0)
  const { amps, serviceA, flooredTo100, deviations: serviceDeviations } = serviceFor(totalDemandVa)

  const assumptions: Assumption[] = [ASSUME_240V, ASSUME_OPTIONAL_APPLICABILITY]
  if (heatVa > 0) assumptions.push(ASSUME_HEAT_CENTRAL_65)
  if (coveredVa > 0) assumptions.push(ASSUME_COVERED)

  return {
    method: 'optional',
    lines,
    generalLightingVa: pool.lightingVa,
    smallApplianceVa: pool.smallApplianceVa,
    laundryVa: pool.laundryVa,
    totalConnectedVa,
    totalDemandVa,
    amps,
    serviceA,
    serviceFlooredTo100: flooredTo100,
    applianceDemand75Applied: false,
    dryerMinApplied: false,
    rangeNote1Applied: false,
    rangeCappedAtNameplate: false,
    heatGovernsOverAc,
    citations: mergeCitations(
      ...lines.map((l) => l.citations),
      ['nec2026.s240_6_a', 'nec2026.s230_79'],
    ),
    assumptions,
    deviations: serviceDeviations,
  }
}

export function residentialLoad(input: ResidentialLoadInput): ResidentialLoadResult {
  if (!(input.areaM2 > 0) || !Number.isFinite(input.areaM2)) {
    throw new EngineError(
      `Dwelling area must be positive (got ${input.areaM2} m²)`,
      `El área de la vivienda debe ser positiva (se recibió ${input.areaM2} m²)`,
    )
  }
  const sa = input.smallApplianceCircuits ?? article220.minSmallApplianceCircuits
  // Split deliberately: a fractional or negative count is malformed input, but a
  // count BELOW the code minimum is a real house we should still calculate for.
  // Houses here are routinely wired with one kitchen circuit, or none.
  if (!Number.isInteger(sa) || sa < 0) {
    throw new EngineError(
      `Small-appliance circuit count must be a whole number ≥ 0 (got ${sa})`,
      `La cantidad de circuitos de pequeños artefactos debe ser un número entero ≥ 0 (se recibió ${sa})`,
    )
  }
  const inputDeviations: Deviation[] = []
  if (sa < article220.minSmallApplianceCircuits) {
    inputDeviations.push({
      key: 'small-appliance-below-minimum',
      en: `Calculated with ${sa} small-appliance circuit${sa === 1 ? '' : 's'}; the NEC requires at least ${article220.minSmallApplianceCircuits}. The figures reflect what is installed, but the installation does not comply.`,
      es: `Se calculó con ${sa} circuito${sa === 1 ? '' : 's'} de pequeños artefactos; el NEC exige al menos ${article220.minSmallApplianceCircuits}. Los números reflejan lo que hay instalado, pero la instalación no cumple.`,
      citations: ['nec2026.s220_52', 'nec2026.s210_11'],
      severity: 'off-code',
    })
  }
  const laundry = input.laundryCircuits ?? 1
  if (!Number.isInteger(laundry) || laundry < 0) {
    throw new EngineError(
      `Laundry circuit count must be a whole number ≥ 0 (got ${laundry})`,
      `La cantidad de circuitos de lavandería debe ser un número entero ≥ 0 (se recibió ${laundry})`,
    )
  }

  const { devices, usedPresets } = resolveDevices(input.devices ?? [])

  const pool: PoolBreakdown = {
    lightingVa: article220.generalLightingVaPerM2 * input.areaM2,
    smallApplianceVa: article220.smallApplianceCircuitVa * sa,
    laundryVa: article220.laundryCircuitVa * laundry,
  }

  const standard = buildStandard(pool, input.areaM2, devices)
  const optional = buildOptional(pool, devices)

  const extraAssumptions: Assumption[] = []
  if (usedPresets) extraAssumptions.push(ASSUME_TYPICAL_WATTAGES)
  if (laundry === 0) extraAssumptions.push(ASSUME_NO_LAUNDRY)

  const governingMethod = optional.serviceA < standard.serviceA ? 'optional' : 'standard'

  return {
    standard,
    optional,
    governingMethod,
    minServiceA: Math.min(standard.serviceA, optional.serviceA),
    devices,
    citations: mergeCitations(standard.citations, optional.citations),
    assumptions: mergeAssumptions(standard.assumptions, optional.assumptions, extraAssumptions),
    deviations: mergeDeviations(standard.deviations, optional.deviations, inputDeviations),
  }
}
