import { useState } from 'react'
import type { HotspotId, Scenario, ScenarioNode, SimulatorState } from '../../engine/types'
import ICUScene from '../scene/ICUScene'
import SceneBoundary from '../common/SceneBoundary'
import VitalsPanel from '../simulation/VitalsPanel'
import ObjectivePanel from '../simulation/ObjectivePanel'
import InteractionPanel from '../simulation/InteractionPanel'
import { getActiveGlobalEffects } from '../../engine/scenarioEngine'
import EquipmentIcon from '../common/EquipmentIcon'

interface WorkspaceProps {
  scenario: Scenario
  state: SimulatorState
  node: ScenarioNode
  selected: HotspotId | null
  modalOpen: boolean
  timeoutRemaining: number | null
  requiredCount: number
  missingCount: number
  onInteract: (id: HotspotId) => void
  onContinue: () => void
  onDecision: (id: string) => void
  onCloseInteraction: () => void
}
export default function SimulatorWorkspace({ scenario, state, node, selected, modalOpen, timeoutRemaining, requiredCount, missingCount, onInteract, onContinue, onDecision, onCloseInteraction }: WorkspaceProps) {
  const [hovered, setHovered] = useState<HotspotId | null>(null)
  const effects = getActiveGlobalEffects(scenario, state)
  const alarm = effects.some(effect => effect.type === 'ui_visual' && effect.target === 'hs_monitor' && effect.state === 'blinking_red')
  const alerts = effects.filter(effect => effect.type === 'ui_toast')
  const activeHotspots = scenario.initial_state.ui.active_hotspots
  const available = node.type === 'decision' ? node.options.map(option => option.target_hotspot) : node.type === 'gate' ? [node.gate_requirements.target_hotspot] : []
  const selectedLabel = scenario.hotspots.find(hotspot => hotspot.id === selected)?.label
  function closeInteraction() {
    onCloseInteraction()
    if (selected) document.getElementById(`equipment-${selected}`)?.focus()
  }
  return (
    <div className={`workspace${selected ? ' has-selection' : ''}`}>
      <section className="room-panel" aria-label="ICU room">
        <div className="room-heading"><span className="eyebrow">ICU · Bed 01</span><span><span className="mouse-instructions">Right-drag to rotate · Scroll to zoom · Click equipment</span><span className="touch-instructions">Drag to rotate · Pinch to zoom · Tap equipment</span></span></div>
        <div className="scene-container"><SceneBoundary><ICUScene alarm={alarm} vitals={state.vitals} oxygenAdjusted={Boolean(state.flags.oxygen_adjusted)} enabled={!modalOpen} activeHotspots={activeHotspots} highlighted={hovered} selected={selected} onHotspotClick={onInteract} onHotspotHover={setHovered} /></SceneBoundary>
          {hovered && <div className="hover-label">{scenario.hotspots.find(item => item.id === hovered)?.label}<span>{hovered === selected ? 'Selected · Actions open' : 'Select to interact'}</span></div>}
        </div>
        <nav className="equipment-navigation" aria-label="Interactive ICU equipment">{scenario.hotspots.filter(hotspot => activeHotspots.includes(hotspot.id)).map(hotspot => <button id={`equipment-${hotspot.id}`} type="button" key={hotspot.id}
          aria-pressed={selected === hotspot.id} className={available.includes(hotspot.id) ? 'has-action' : undefined} onFocus={() => setHovered(hotspot.id)} onBlur={() => setHovered(null)} onClick={() => onInteract(hotspot.id)}>
          <EquipmentIcon id={hotspot.id} /><strong>{hotspot.label}</strong><span>{available.includes(hotspot.id) ? 'Action available' : hotspot.id === 'hs_ehr' ? 'Review record' : 'Inspect'}</span>
        </button>)}</nav>
      </section>
      <aside className="simulation-sidebar" aria-label="Simulation status and actions">
        {selected && selectedLabel && <InteractionPanel key={selected} hotspot={selected} label={selectedLabel} node={node} vitals={state.vitals} alarm={alarm} onDecision={onDecision} onClose={closeInteraction} />}
        <div className="alarm-region" role={alarm ? 'alert' : 'status'} aria-live={alarm ? 'assertive' : 'polite'} aria-atomic="true">{alerts.map(effect => <div key={effect.message} className={`alarm-banner ${effect.style}`}><strong>{effect.style === 'danger' ? 'Clinical alarm' : 'Scenario notice'}</strong><span>{effect.message}</span></div>)}</div>
        <ObjectivePanel node={node} timeoutRemaining={timeoutRemaining} requiredCount={requiredCount} missingCount={missingCount} onContinue={onContinue} onOpenEHR={() => onInteract('hs_ehr')} />
        <VitalsPanel vitals={state.vitals} alarm={alarm} />
      </aside>
    </div>
  )
}
