import type { ScenarioNode } from '../../engine/types'

interface ObjectivePanelProps {
  node: ScenarioNode
  timeoutRemaining: number | null
  requiredCount: number
  missingCount: number
  onContinue: () => void
  onOpenEHR: () => void
}
export default function ObjectivePanel({ node, timeoutRemaining, requiredCount, missingCount, onContinue, onOpenEHR }: ObjectivePanelProps) {
  return (
    <section className="objective-panel" aria-labelledby="objective-title">
      <div className="objective-copy" aria-live="polite" aria-atomic="true">
        <span className="eyebrow">Current objective</span>
        <h2 id="objective-title">{node.type === 'gate' ? 'Complete required documentation' : node.type === 'end' ? 'Scenario complete' : node.type === 'message' ? 'Scenario update' : 'Respond to the current situation'}</h2>
        <p>{node.text}</p>
      </div>
      {timeoutRemaining !== null && (
        <div className={`timeout-badge${timeoutRemaining <= 10 ? ' urgent' : ''}`}>
          <span role="timer" aria-label="Response time remaining">Response time: <strong>{timeoutRemaining}s</strong></span>
          <span className="sr-only" role="status">{timeoutRemaining <= 10 ? 'Ten seconds or less remain for this decision.' : 'A timed decision has started.'}</span>
        </div>
      )}
      {node.type === 'message' && <button type="button" className="primary-action" onClick={onContinue}>Continue <span aria-hidden="true">→</span></button>}
      {node.type === 'decision' && <p className="objective-hint">Select equipment in the room to see its available actions.</p>}
      {node.type === 'gate' && (
        <div className="documentation-gate-banner">
          <p>{node.description}</p>
          <label htmlFor="documentation-progress">Documentation: {requiredCount - missingCount}/{requiredCount} required fields complete</label>
          <progress id="documentation-progress" value={requiredCount - missingCount} max={requiredCount} />
          <p>{missingCount ? `${missingCount} required ${missingCount === 1 ? 'field remains' : 'fields remain'}. Open the EHR to continue.` : 'Required entries are ready. Save in the EHR to continue.'}</p>
          <button type="button" className="primary-action" onClick={onOpenEHR}>Open EHR <span aria-hidden="true">→</span></button>
        </div>
      )}
    </section>
  )
}
