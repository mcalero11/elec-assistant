/**
 * Unit conversion at the display/input edge only — the engine always receives
 * metric (meters, °C). Metric is the default; imperial is a per-page toggle.
 */
export type UnitSystem = 'metric' | 'imperial'

export const mToFt = (m: number): number => m * 3.28084
export const ftToM = (ft: number): number => ft / 3.28084
export const cToF = (c: number): number => (c * 9) / 5 + 32
export const fToC = (f: number): number => ((f - 32) * 5) / 9
