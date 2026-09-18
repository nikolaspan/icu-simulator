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
    <section className={`objective-panel${node.type === 'gate' ? ' objective-gated' : ''}`} aria-labelledby="objective-title">
      <div className="objective-copy" aria-live="polite" aria-atomic="true">
        <span className="eyebrow">Current objective</span>
        <h2 id="objective-title">{node.type === 'gate' ? 'Document before continuing' : node.type === 'end' ? 'Scenario complete' : node.type === 'message' ? 'Review the situation' : 'Choose your next action'}</h2>
        <p>{node.text}</p>
      </div>
      {timeoutRemaining !== null && (
        <div className={`timeout-badge${timeoutRemaining <= 5 ? ' urgent' : timeoutRemaining <= 10 ? ' warning' : ''}`}>
          <span role="timer" aria-label="Response time remaining">Response time: <strong>{timeoutRemaining}s</strong></span>
          <span className="sr-only" role="status">{timeoutRemaining <= 5 ? 'Five seconds or less remain for this decision.' : timeoutRemaining <= 10 ? 'Ten seconds or less remain for this decision.' : 'A timed decision has started.'}</span>
          {node.type === 'decision' && node.timeout && <progress aria-label="Response time remaining" value={timeoutRemaining} max={node.timeout.seconds} />}
        </div>
      )}
      {node.type === 'message' && <button type="button" className="primary-action" onClick={onContinue}>Continue <span aria-hidden="true">→</span></button>}
      {node.type === 'decision' && <p className="objective-hint">Select equipment in the room to see its available actions.</p>}
      {node.type === 'gate' && (
        <div className="documentation-gate-banner">
          <strong>Progression paused · Documentation required</strong>
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
