import type { Scenario } from '../../engine/types'
import { getPathLabel } from './debriefSummary'

export default function DecisionTimeline({ scenario, path }: { scenario: Scenario; path: string[] }) {
  return (
    <section className="debrief-section"><h3>Decision path</h3>
      <ol className="decision-timeline">{path.map((id, index) => {
        const item = getPathLabel(scenario, id)
        return <li key={`${id}-${index}`} className={`timeline-item ${item.type}`}><span className="timeline-marker" aria-hidden="true">{item.type === 'complete' ? '✓' : item.type === 'warning' ? '!' : item.type === 'action' ? '→' : index + 1}</span><div>{item.type === 'action' ? <><span className="timeline-type">Trainee action</span><strong>{item.detail}</strong></> : <><strong>{item.title}</strong><p>{item.detail}</p></>}</div></li>
      })}</ol>
    </section>
  )
}
