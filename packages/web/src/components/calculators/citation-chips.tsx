import { citationLabel, type CitationKey } from '@elec-assistant/data'
import { Badge } from '@/components/ui/badge'

/** PRD: NEC citation on every output line. Renders compact article badges. */
export function CitationChips({ keys }: { keys: readonly CitationKey[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {keys.map((key) => {
        const label = citationLabel(key, 'es')
        // Compact chip text: strip the leading edition prefix, keep the article reference.
        const short = label.replace(/^NEC \d+,\s*/, '').split('—')[0]?.trim() ?? label
        return (
          <Badge key={key} variant="outline" title={label} className="font-normal text-[10px]">
            {short}
          </Badge>
        )
      })}
    </span>
  )
}
