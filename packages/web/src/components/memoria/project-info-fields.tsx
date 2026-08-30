'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getMessages } from '@/lib/i18n'
import type { ProjectInfo } from '@/lib/memoria'

/**
 * Optional project header for the memoria, persisted in the URL like all other
 * state so a shared link keeps it. The keys live in RESERVED_RUNNER_KEYS
 * (lib/template-url.ts) — template urlKeys must avoid them (test-enforced).
 */

export function useProjectInfo(): ProjectInfo & { set: (field: keyof ProjectInfo, v: string) => void } {
  const [project, setProject] = useQueryState('pj', parseAsString)
  const [client, setClient] = useQueryState('cl', parseAsString)
  const [responsible, setResponsible] = useQueryState('rp', parseAsString)
  const setters = { project: setProject, client: setClient, responsible: setResponsible }
  return {
    ...(project ? { project } : {}),
    ...(client ? { client } : {}),
    ...(responsible ? { responsible } : {}),
    set: (field, v) => void setters[field](v === '' ? null : v),
  }
}

export function ProjectInfoFields({
  info,
}: {
  info: ReturnType<typeof useProjectInfo>
}) {
  const m = getMessages()
  const fields = [
    { field: 'project', label: m.memoria.project, value: info.project },
    { field: 'client', label: m.memoria.client, value: info.client },
    { field: 'responsible', label: m.memoria.responsible, value: info.responsible },
  ] as const
  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-base">{m.memoria.projectInfoTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(({ field, label, value }) => (
          <div key={field} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <Input
              className="h-8"
              value={value ?? ''}
              onChange={(e) => info.set(field, e.target.value)}
            />
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">{m.memoria.projectInfoHint}</p>
      </CardContent>
    </Card>
  )
}
