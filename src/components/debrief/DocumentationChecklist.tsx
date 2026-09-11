import type { EHRFormValues, Scenario, SimulatorState } from '../../engine/types'
import { isFieldComplete } from '../../engine/documentation'
import { getFieldLabel } from '../../utils/format'
import { getDocumentationItems } from './debriefSummary'

export default function DocumentationChecklist({ scenario, state, values }: { scenario: Scenario; state: SimulatorState; values: EHRFormValues }) {
  const items = getDocumentationItems(scenario, state)
  return <section className="debrief-section"><h3>Documentation checklist</h3>
    {items.length ? <ul className="debrief-checklist">{items.map(item => <li key={item.id} className={item.complete ? 'complete' : 'missed'}>
      <strong>{item.complete ? '✓ Completed' : '! Missed'}</strong><p>{item.label}</p>
      <ul>{item.fields.flatMap(form => form.fields.map(field => <li key={`${form.form_id}.${field}`}>{getFieldLabel(field)} — {isFieldComplete(values, `${form.form_id}.${field}`) ? 'recorded' : 'missing'}</li>))}</ul>
    </li>)}</ul> : <p>No documentation gates were configured.</p>}
  </section>
}
