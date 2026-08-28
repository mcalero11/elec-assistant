import Link from 'next/link'
import {
  AirVent,
  BookOpen,
  Box,
  Cable,
  CircleDollarSign,
  Cylinder,
  Earth,
  House,
  Package,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { INSULATION_TEMP_RATING } from '@elec-assistant/engine'
import {
  CONDUCTOR_SIZES,
  CONDUIT_TYPES,
  NEC_EDITION,
  TRADE_SIZES,
  acPresets,
  ambientCorrection,
  appliancePresets,
  article220,
  boxAllowances,
  catalogItems,
  cccAdjustment,
  citations,
  conductorAreas,
  conductorResistance,
  conduitDimensions,
  conduitFillPercent,
  egcTable,
  lightingDemand,
  priceEntries,
  rangeDemand,
  standardBoxes,
  standardBreakers,
  table31016,
} from '@elec-assistant/data'
import { Card, CardContent } from '@/components/ui/card'
import { PriceFreshness } from '@/components/dashboard/price-freshness'
import { StatTile } from '@/components/dashboard/stat-tile'
import { getMessages } from '@/lib/i18n'
import { ALL_TEMPLATES, templateRoute } from '@/lib/templates'

/* Everything on this panel is real package data — no invented metrics. */
const NEC_TABLES = [
  table31016,
  ambientCorrection,
  cccAdjustment,
  conductorResistance,
  standardBreakers,
  conduitFillPercent,
  conduitDimensions,
  conductorAreas,
  egcTable,
  standardBoxes,
  boxAllowances,
  lightingDemand,
  rangeDemand,
  article220,
].length

const NEC_LABEL = NEC_EDITION.replace('nec-', 'NEC ')
const CITATION_COUNT = Object.keys(citations).length
const INSULATION_COUNT = Object.keys(INSULATION_TEMP_RATING).length
const LATEST_PRICE_DATE = priceEntries.reduce(
  (max, e) => (e.updatedAt > max ? e.updatedAt : max),
  priceEntries[0]?.updatedAt ?? '',
)
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(
    new Date(`${iso}T12:00:00`),
  )

export default function HomePage() {
  const m = getMessages()

  const modules: { href: string; icon: LucideIcon; title: string; desc: string; stat: string }[] = [
    {
      href: '/calculadoras/calibre/',
      icon: Cable,
      title: m.nav.calibre,
      desc: m.home.calibreDesc,
      stat: `${CONDUCTOR_SIZES.length} ${m.home.sizesLabel} · ${INSULATION_COUNT} ${m.home.insulationsLabel}`,
    },
    {
      href: '/calculadoras/tuberia/',
      icon: Cylinder,
      title: m.nav.tuberia,
      desc: m.home.tuberiaDesc,
      stat: `${CONDUIT_TYPES.join(' · ')} · ${TRADE_SIZES.length} ${m.home.diametersLabel}`,
    },
    {
      href: '/calculadoras/tierra/',
      icon: Earth,
      title: m.nav.tierra,
      desc: m.home.tierraDesc,
      stat: 'Tabla 250.122 · 250.122(B)',
    },
    {
      href: '/calculadoras/cajas/',
      icon: Box,
      title: m.nav.cajas,
      desc: m.home.cajasDesc,
      stat: `${standardBoxes.boxes.length} cajas · Tabla 314.16(A)/(B)(1)`,
    },
    {
      href: '/calculadoras/carga/',
      icon: House,
      title: m.nav.carga,
      desc: m.home.cargaDesc,
      stat: `${appliancePresets.length} ${m.home.presetsLabel} · Art. 120`,
    },
    {
      href: '/trabajos/',
      icon: AirVent,
      title: m.nav.trabajos,
      desc: m.home.trabajosDesc,
      stat: `${ALL_TEMPLATES.length} ${m.home.templatesLabel} · ${catalogItems.length} ${m.home.catalogLabel}`,
    },
  ]

  const quickLinks: { href: string; label: string }[] = [
    { href: '/calculadoras/calibre/?a=24&m=15&v=240', label: m.home.calibreQuick },
    { href: '/calculadoras/carga/?a=80&d=1xrefri_1xducha', label: m.home.cargaQuick },
    ...acPresets.map((p) => ({
      href: `${templateRoute({ id: 'ac-minisplit' })}?d=${p.id}`,
      label: p.label.es,
    })),
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{m.home.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.home.tagline}</p>
      </header>

      {/* Data status strip */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile icon={BookOpen} value={NEC_LABEL} label={m.home.necEdition} detail="es-SV · USD" />
        <StatTile
          icon={ScrollText}
          value={CITATION_COUNT}
          label={m.home.citationsLabel}
          detail={`${NEC_TABLES} ${m.home.tablesLabel}`}
        />
        <StatTile
          icon={Package}
          value={catalogItems.length}
          label={m.home.catalogLabel}
          detail={`${acPresets.length + appliancePresets.length} ${m.home.presetsLabel}`}
        />
        <StatTile
          icon={CircleDollarSign}
          value={priceEntries.length}
          label={`${m.home.pricesLabel} ${m.home.pricesAsOf} ${fmtDate(LATEST_PRICE_DATE)}`}
          detail={<PriceFreshness />}
        />
      </section>

      {/* Module launchers */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group">
            <Card className="h-full gap-0 py-4 transition-colors group-hover:border-primary/50 group-hover:bg-accent">
              <CardContent className="space-y-2 px-4">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <mod.icon className="size-4" aria-hidden />
                </span>
                <h2 className="text-sm font-semibold">{mod.title}</h2>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
                <p className="font-mono text-[11px] text-muted-foreground/80 tabular-nums">{mod.stat}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      {/* Quick launch */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{m.home.quickLaunch}</h2>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="inline-flex min-h-9 items-center rounded-md border bg-card px-3 font-mono text-xs transition-colors hover:border-primary/50 hover:bg-accent"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
