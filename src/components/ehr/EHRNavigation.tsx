import type { EHRConfig } from '../../engine/types'
interface EHRNavigationProps {
  config: EHRConfig
  activeForm: string | null
  required: string[]
  missing: string[]
  onSelect: (formId: string | null) => void
}
export default function EHRNavigation({ config, activeForm, required, missing, onSelect }: EHRNavigationProps) {
  return (
    <nav className="ehr-navigation" aria-label="EHR sections">
      <button type="button" aria-current={activeForm === null ? 'page' : undefined} onClick={() => onSelect(null)}>Overview</button>
      {Object.entries(config.forms).map(([id, form]) => {
        const total = required.filter(path => path.startsWith(`${id}.`)).length
        const remaining = missing.filter(path => path.startsWith(`${id}.`)).length
        return <button type="button" key={id} aria-current={activeForm === id ? 'page' : undefined} onClick={() => onSelect(id)}>
          <span>{form.title}</span>{total > 0 ? <small className={remaining ? 'required-status' : 'complete-status'}>{remaining ? `${total - remaining}/${total} complete · ${remaining} required` : `✓ Complete · ${total}/${total}`}</small> : <small className="optional-status">Optional entries</small>}
        </button>
      })}
    </nav>
  )
}
