import TopBar from './components/layout/TopBar'
import SimulatorWorkspace from './components/layout/SimulatorWorkspace'
import HelpDialog from './components/layout/HelpDialog'
import EHRPanel from './components/ehr/EHRPanel'
import Debrief from './components/debrief/Debrief'
import { useScenario } from './hooks/useScenario'
import { getActiveGlobalEffects } from './engine/scenarioEngine'
import './App.css'

export default function App() {
  const simulation = useScenario()
  const { session, node, ui, error, notice } = simulation
  if (!session || !node) {
    return <main className="loading-screen">{error ? <><span className="eyebrow">Scenario error</span><h1>Unable to load simulation</h1><p role="alert">{error}</p><button type="button" className="primary-action" onClick={simulation.retry}>Try again</button></> : <p role="status">Loading ICU scenario…</p>}</main>
  }
  const { scenario, state, ehrValues, logs } = session
  const alarm = getActiveGlobalEffects(scenario, state).some(effect => effect.type === 'ui_visual' && effect.target === 'hs_monitor' && effect.state === 'blinking_red')
  return (
    <main className="simulator">
      <a className="skip-link" href="#simulation-content">Skip to simulation</a>
      <TopBar title={scenario.scenario_meta.title} state={state} documentationRequired={node.type === 'gate'} onReset={simulation.restart} onHelp={() => simulation.setHelpOpen(true)} />
      <div className="feedback-region" role="status" aria-live="polite" aria-atomic="true">
        {notice && <div className={`toast ${notice.tone}`}><span>{notice.message}</span><button type="button" onClick={simulation.dismissNotice} aria-label="Dismiss feedback">×</button></div>}
      </div>
      <div id="simulation-content" tabIndex={-1} className="simulation-content">
        {error ? <section className="loading-screen"><h2>Simulation paused</h2><p role="alert">{error}</p><button type="button" className="primary-action" onClick={simulation.restart}>Restart scenario</button></section>
          : state.completed ? <Debrief scenario={scenario} state={state} logs={logs} values={ehrValues} onRestart={simulation.restart} />
          : <SimulatorWorkspace key={session.id} scenario={scenario} state={state} node={node} selected={ui.selectedHotspot} modalOpen={ui.ehrOpen || ui.helpOpen}
            timeoutRemaining={simulation.timeoutRemaining} requiredCount={simulation.requiredFields.length} missingCount={simulation.missingFields.length}
            onInteract={simulation.interact} onContinue={simulation.advance} onDecision={simulation.decide} onCloseInteraction={simulation.closeInteraction} />}
      </div>
      {ui.ehrOpen && !state.completed && <EHRPanel config={scenario.ehr_config} values={ehrValues} autofill={session.ehrAutofill} vitals={state.vitals} alarm={alarm} initialVitals={scenario.initial_state.vitals} logs={logs}
        requiredFields={simulation.requiredFields} blockedMessage={node.type === 'gate' ? node.feedback_blocked : undefined}
        timeoutRemaining={simulation.timeoutRemaining} onFieldChange={simulation.changeField} onClose={simulation.closeEHR} onContinue={simulation.saveEHR} />}
      {ui.helpOpen && <HelpDialog onClose={() => simulation.setHelpOpen(false)} />}
    </main>
  )
}
