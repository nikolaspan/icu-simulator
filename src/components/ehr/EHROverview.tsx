import type { EHRConfig, EHRFormValues, VitalSigns } from '../../engine/types'
import { isFieldComplete, splitFieldPath } from '../../engine/documentation'
import { getFieldLabel } from '../../utils/format'
import VitalsPanel from '../simulation/VitalsPanel'
import VitalTrend from './VitalTrend'
import type { LogEntry } from '../../engine/logger'

interface EHROverviewProps {
  config: EHRConfig
  values: EHRFormValues
  vitals: VitalSigns
  alarm: boolean
  initialVitals: VitalSigns
  logs: LogEntry[]
  required: string[]
  onGoToField: (path: string) => void
}
export default function EHROverview({ config, values, vitals, alarm, initialVitals, logs, required, onGoToField }: EHROverviewProps) {
  return (
    <div className="ehr-overview">
      <div className="ehr-patient-banner"><span className="patient-avatar" aria-hidden="true">01</span><div><span className="eyebrow">Patient overview</span><h3>Simulation patient 01 · Bed 01</h3><p>Critical Care · Current simulation session</p></div></div>
      <section className="ehr-requirements" aria-labelledby="requirements-title">
        <h3 id="requirements-title">Documentation status</h3>
        <p>Required entries for the current scenario stage.</p>
        {required.length ? required.map(path => {
          const { formId, field } = splitFieldPath(path)
          const complete = isFieldComplete(values, path)
          return <button type="button" key={path} className="ehr-requirement" onClick={() => onGoToField(path)}>
            <span aria-hidden="true" className={complete ? 'complete-status' : 'required-status'}>{complete ? '✓' : '○'}</span>
            <span><strong>{getFieldLabel(field)}</strong><small>{config.forms[formId].title}</small></span>
            <span>{complete ? 'Complete' : 'Required'} <span aria-hidden="true">→</span></span>
          </button>
        }) : <div className="clinical-note">No documentation is required at this stage. You can still record and save notes.</div>}
      </section>
      <VitalsPanel vitals={vitals} alarm={alarm} title="Current vital signs" />
      <VitalTrend initial={initialVitals.spo2} logs={logs} />
    </div>
  )
}
