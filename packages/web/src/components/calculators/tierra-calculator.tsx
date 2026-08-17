'use client'

import { useMemo } from 'react'
import {
  parseAsBoolean,
  parseAsFloat,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs'
import { TriangleAlert } from 'lucide-react'
import { CONDUCTOR_SIZES, type ConductorSize } from '@elec-assistant/data'
import { EngineError, egcSize, type EgcResult } from '@elec-assistant/engine'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Disclaimer } from '@/components/disclaimer'
import { Term } from '@/components/term'
import { getMessages } from '@/lib/i18n'
import { AssumptionsPanel } from './assumptions-panel'
import { InputSlider } from './input-slider'
import { ResultLine, ResultsCard } from './results-card'

const MATERIALS = ['copper', 'aluminum'] as const

type Computation = { ok: true; result: EgcResult } | { ok: false; error: EngineError }

export function TierraCalculator() {
  const m = getMessages()

  const [ocpdA, setOcpdA] = useQueryState('a', parseAsFloat.withDefault(30))
  const [material, setMaterial] = useQueryState('mat', parseAsStringLiteral(MATERIALS).withDefault('copper'))
  const [upsizing, setUpsizing] = useQueryState('up', parseAsBoolean.withDefault(false))
  const [installed, setInstalled] = useQueryState('inst', parseAsStringLiteral(CONDUCTOR_SIZES).withDefault('8'))
  const [required, setRequired] = useQueryState('req', parseAsStringLiteral(CONDUCTOR_SIZES).withDefault('10'))

  const computation: Computation = useMemo(() => {
    try {
      const result = egcSize({
        ocpdA,
        material,
        ...(upsizing ? { installedSize: installed, requiredSize: required } : {}),
      })
      return { ok: true, result }
    } catch (e) {
      if (e instanceof EngineError) return { ok: false, error: e }
      throw e
    }
  }, [ocpdA, material, upsizing, installed, required])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.tierra.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <InputSlider
            label={<Term id="breaker">{m.tierra.ocpd}</Term>}
            value={ocpdA}
            onChange={setOcpdA}
            min={15}
            max={400}
            step={5}
            unit={m.common.amps}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">{m.tierra.material}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="w-full"
              value={material}
              onValueChange={(v) => v && setMaterial(v as (typeof MATERIALS)[number])}
            >
              <ToggleGroupItem value="copper" className="flex-1">
                {m.calibre.copper}
              </ToggleGroupItem>
              <ToggleGroupItem value="aluminum" className="flex-1">
                {m.calibre.aluminum}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={upsizing} onCheckedChange={setUpsizing} />
              {m.tierra.upsizingTitle}
            </label>
            <p className="text-xs text-muted-foreground">{m.tierra.upsizingHint}</p>
            {upsizing ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    <Term id="calibre">{m.tierra.installedSize}</Term>
                  </Label>
                  <Select value={installed} onValueChange={(v) => setInstalled(v as ConductorSize)}>
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDUCTOR_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.tierra.requiredSize}</Label>
                  <Select value={required} onValueChange={(v) => setRequired(v as ConductorSize)}>
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDUCTOR_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!computation.ok ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{m.calibre.engineErrorTitle}</AlertTitle>
            <AlertDescription>{computation.error.es}</AlertDescription>
          </Alert>
        ) : (
          <>
            <ResultsCard
              title={m.tierra.egc}
              badge={
                computation.result.upsized ? (
                  <Badge>{m.tierra.upsizedBadge}</Badge>
                ) : undefined
              }
            >
              <ResultLine
                label={<Term id="calibre">{m.tierra.egc}</Term>}
                value={`${computation.result.size} AWG/kcmil ${material === 'copper' ? 'Cu' : 'Al'}`}
                detail={
                  computation.result.upsized
                    ? `${m.tierra.tableValue}: ${computation.result.tableSize}`
                    : undefined
                }
                citations={computation.result.citations}
              />
            </ResultsCard>
            <AssumptionsPanel assumptions={computation.result.assumptions} />
          </>
        )}
        <Disclaimer />
      </div>
    </div>
  )
}
