import type { SimulatorState } from '../../engine/types'
import { formatTime } from '../../utils/format'

interface TopBarProps {
  title: string
  state: SimulatorState
  documentationRequired: boolean
  onReset: () => void
  onHelp: () => void
}
export default function TopBar({ title, state, documentationRequired, onReset, onHelp }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">ICU</div>
        <div className="brand-copy"><h1>Clinical Simulator</h1><span>{title}</span></div>
      </div>
      <div className="topbar-status">
        <div className={`status-item scenario-status${documentationRequired ? ' status-paused' : ''}`}><span>Scenario</span><strong><span className="status-dot" aria-hidden="true" />{state.completed ? 'Complete' : documentationRequired ? 'Documentation required' : 'In progress'}</strong></div>
        <div className="status-item"><span>Score</span><strong>{state.score}</strong></div>
        <div className="status-item"><span>Time</span><strong>{formatTime(state.time_elapsed)}</strong></div>
        <button type="button" className="secondary-action" onClick={onReset}>Reset</button>
        <button type="button" className="secondary-action" onClick={onHelp}>Help</button>
      </div>
    </header>
  )
}
