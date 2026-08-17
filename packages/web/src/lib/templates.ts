import { acMinisplitTemplate, type JobTemplate } from '@elec-assistant/data'

/**
 * Single registry of job templates. The route convention is `/trabajos/<template.id>/`
 * (the page directory must match the template id), so a new template registered here
 * appears automatically in the sidebar, the job search, and the dashboard.
 */
export const ALL_TEMPLATES: readonly JobTemplate[] = [acMinisplitTemplate]

export function templateRoute(template: Pick<JobTemplate, 'id'>): string {
  return `/trabajos/${template.id}/`
}
