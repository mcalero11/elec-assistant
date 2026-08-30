import { allTemplates, type JobTemplate } from '@nec-assistant/data'
import { AirVent, Lightbulb, Plug, ShowerHead, Warehouse, Wrench, type LucideIcon } from 'lucide-react'

/**
 * Job-template registry, re-exported from data (which owns it so engine tests
 * can loop it). The route convention is `/trabajos/<template.id>/` (the page
 * directory must match the template id), so a template registered in data
 * appears automatically in the sidebar, the job search, and the dashboard.
 */
export const ALL_TEMPLATES: readonly JobTemplate[] = allTemplates

/** Icons stay UI-side (data is presentation-agnostic). Fallback: Wrench. */
export const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  'ac-minisplit': AirVent,
  'ducha-electrica': ShowerHead,
  'tomacorriente-240v': Plug,
  'circuito-ramal': Lightbulb,
  'alimentador-bodega': Warehouse,
}

export function templateIcon(id: string): LucideIcon {
  return TEMPLATE_ICONS[id] ?? Wrench
}

export function templateRoute(template: Pick<JobTemplate, 'id'>): string {
  return `/trabajos/${template.id}/`
}
