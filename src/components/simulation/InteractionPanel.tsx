import { useEffect, useRef } from 'react'
import type { HotspotId, ScenarioNode, VitalSigns } from '../../engine/types'

interface InteractionPanelProps {
  hotspot: HotspotId
  label: string
  node: ScenarioNode
  vitals: VitalSigns
  alarm: boolean
  onDecision: (id: string) => void
  onClose: () => void
}
export default function InteractionPanel({ hotspot, label, node, vitals, alarm, onDecision, onClose }: InteractionPanelProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.focus() }, [hotspot])
  const options = node.type === 'decision' ? node.options.filter(option => option.target_hotspot === hotspot) : []
  const descriptions: Record<HotspotId, string> = {
    hs_patient: `Patient assessment opened. Respiratory rate ${vitals.rr}/min; SpO₂ ${vitals.spo2}%.`,
    hs_monitor: 'Monitor opened. Review the current readings and oxygen saturation alarm.',
    hs_ventilator: `Respiratory support controls opened. Current SpO₂ ${vitals.spo2}%.`,
    hs_ehr: 'Patient record opened. Document assessments, interventions and communication.',
    hs_call: 'Bedside call system opened. Select an available escalation action.',
  }
  return (
    <section ref={ref} tabIndex={-1} className="interaction-panel" aria-labelledby="interaction-title" aria-describedby="interaction-description"
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
      <button type="button" className="close-button" onClick={onClose} aria-label="Close interaction panel">×</button>
      <span className="eyebrow">Selected equipment</span><h2 id="interaction-title">{label}</h2>
      <p id="interaction-description">{descriptions[hotspot]}</p>
      {hotspot === 'hs_monitor' && <div className={`clinical-note${alarm ? ' danger-note' : ''}`}><strong>SpO₂ {vitals.spo2}% · HR {vitals.hr} bpm</strong><p>{alarm ? 'Oxygen saturation alarm active.' : 'No active oxygen saturation alarm.'}</p></div>}
      {options.length ? <div className="decision-actions">{options.map(option => <button key={option.id} type="button" className="primary-action" onClick={() => onDecision(option.id)}>{option.label}<span aria-hidden="true">→</span></button>)}</div>
        : <div className="clinical-note"><strong>{node.type === 'gate' ? 'Documentation required' : 'No action available here yet'}</strong><p>{node.type === 'gate' ? 'Complete the required EHR entries and save to continue.' : node.type === 'message' ? 'Read the current objective and select Continue.' : 'Select equipment marked “Action available” to respond to the current objective.'}</p></div>}
    </section>
  )
}
