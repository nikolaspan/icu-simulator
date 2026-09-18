import { useEffect, useRef, useState } from 'react'
import type { EHRFormValues, Scenario, SimulatorState } from '../../engine/types'
import { downloadLogCsv, downloadSessionJson, type LogEntry } from '../../engine/logger'
import { formatTime } from '../../utils/format'
import { getDocumentationItems } from './debriefSummary'
import DecisionTimeline from './DecisionTimeline'
import DocumentationChecklist from './DocumentationChecklist'
import VitalsPanel from '../simulation/VitalsPanel'

interface DebriefProps { scenario: Scenario; state: SimulatorState; logs: LogEntry[]; values: EHRFormValues; onRestart: () => void }
export default function Debrief({ scenario, state, logs, values, onRestart }: DebriefProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const documentation = getDocumentationItems(scenario, state)
  const alarm = state.vitals.spo2 < 90
  const decisions = logs.filter(entry => entry.event_type === 'OPTION_SELECTED').length
  const timeouts = state.decision_path.filter(id => id.endsWith(':timeout')).length
  const difference = state.score - scenario.initial_state.current_score
  const node = scenario.nodes.find(node => node.id === state.current_node_id)
  const config = node?.type === 'end' ? node.debrief_config : undefined
  const events = [
    ['NODE_ENTER', 'Stages entered'], ['HOTSPOT_INTERACTION', 'Equipment interactions'],
    ['OPTION_SELECTED', 'Decisions'], ['EHR_SUBMIT', 'EHR submissions'], ['VITALS_CHANGE', 'Vital changes'],
  ] as const
  function exportLog(format: 'JSON' | 'CSV') {
    try {
      if (format === 'JSON') downloadSessionJson(scenario.scenario_meta.id, scenario.scenario_meta.title, state, logs)
      else downloadLogCsv(scenario.scenario_meta.id, logs)
      setExportError(null)
    } catch (error) {
      console.error('Session export failed:', error)
      setExportError('The session could not be exported. Please try again; your session is still available.')
    }
  }
  return (
    <section className="debrief-panel" aria-labelledby="debrief-title">
      <header className="debrief-header"><span className="eyebrow">Scenario debrief</span><h2 ref={heading} tabIndex={-1} id="debrief-title">Simulation complete</h2><p>Review your decisions, documentation and final patient state.</p></header>
      <div className={`debrief-outcome${alarm ? ' outcome-danger' : ''}`}><span aria-hidden="true">{alarm ? '!' : '✓'}</span><div><strong>{alarm ? 'Oxygen saturation alarm remains active' : 'Oxygen saturation alarm resolved'}</strong><p>Final SpO₂ {state.vitals.spo2}% · {decisions} recorded {decisions === 1 ? 'decision' : 'decisions'} · {timeouts ? `${timeouts} response ${timeouts === 1 ? 'timeout' : 'timeouts'}` : 'No response timeouts'}</p></div></div>
      <div className="debrief-summary-grid">
        {config?.show_score && <article><span>Final score</span><strong>{state.score}</strong><small className={difference >= 0 ? 'complete-status' : 'field-error'}>{difference >= 0 ? '+' : ''}{difference} from starting score</small></article>}
        <article><span>Scenario duration</span><strong>{formatTime(state.time_elapsed - scenario.initial_state.time_elapsed)}</strong><small>Total session time</small></article>
        <article><span>Documentation</span><strong>{documentation.filter(item => item.complete).length}/{documentation.length}</strong><small>Required gates completed</small></article>
        <article><span>Logged events</span><strong>{logs.length}</strong><small>{scenario.logging.enabled ? 'Recorded during session' : 'Logging is disabled for this scenario'}</small></article>
      </div>
      <div className="debrief-columns">
        {config?.show_decision_path && <DecisionTimeline scenario={scenario} path={state.decision_path} />}
        <div className="debrief-side-column">
          {config?.highlight_missed_docs && <DocumentationChecklist scenario={scenario} state={state} values={values} />}
          <VitalsPanel vitals={state.vitals} alarm={alarm} title="Final vital signs" />
          <details className="debrief-section event-details"><summary>Event summary · {logs.length} logged events</summary><dl className="debrief-event-grid">{events.map(([type, label]) => <div key={type}><dt>{label}</dt><dd>{logs.filter(entry => entry.event_type === type).length}</dd></div>)}</dl></details>
        </div>
      </div>
      {exportError && <p role="alert" className="field-error">{exportError}</p>}
      <footer className="debrief-footer"><p>Export session data for review or start a new simulation.</p><div className="footer-actions">
        {config?.export_log && <><button type="button" className="secondary-action" onClick={() => exportLog('CSV')}>Export CSV</button><button type="button" className="secondary-action" onClick={() => exportLog('JSON')}>Export JSON</button></>}
        <button type="button" className="primary-action" onClick={onRestart}>Restart scenario</button>
      </div></footer>
    </section>
  )
}
