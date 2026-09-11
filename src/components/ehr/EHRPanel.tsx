import { useEffect, useState, type FormEvent } from 'react'
import type { EHRConfig, EHRFormValues, VitalSigns } from '../../engine/types'
import { getMissingFields, splitFieldPath } from '../../engine/documentation'
import { getFieldLabel } from '../../utils/format'
import Modal from '../common/Modal'
import EHRNavigation from './EHRNavigation'
import EHROverview from './EHROverview'
import EHRForm from './EHRForm'

interface EHRPanelProps {
  config: EHRConfig
  values: EHRFormValues
  vitals: VitalSigns
  alarm: boolean
  requiredFields: string[]
  blockedMessage?: string
  timeoutRemaining: number | null
  onFieldChange: (formId: string, field: string, value: string) => void
  onClose: () => void
  onContinue: () => boolean
}
export default function EHRPanel({ config, values, vitals, alarm, requiredFields, blockedMessage, timeoutRemaining, onFieldChange, onClose, onContinue }: EHRPanelProps) {
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [focusTarget, setFocusTarget] = useState<{ path: string } | null>(null)
  const missing = getMissingFields(requiredFields, values)
  useEffect(() => { if (focusTarget) document.getElementById(focusTarget.path)?.focus() }, [focusTarget])
  function goToField(path: string) {
    setActiveForm(splitFieldPath(path).formId)
    setFocusTarget({ path })
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Log every attempt, including failed saves, in the session controller.
    const passed = onContinue()
    if (!passed) {
      setAttempted(true)
      if (missing[0]) goToField(missing[0])
    }
  }
  return (
    <Modal titleId="ehr-title" className="ehr-panel" onClose={onClose}>
      <header className="modal-header"><div><span className="eyebrow">Electronic Health Record</span><h2 id="ehr-title">Patient — Bed 01</h2><p>Review observations and document your actions.</p></div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close electronic health record">×</button>
      </header>
      {timeoutRemaining !== null && <p className="ehr-timer" role="timer">Decision timer is running: {timeoutRemaining}s remaining.</p>}
      <form className="ehr-documentation" noValidate onSubmit={submit}>
        <div className="ehr-body">
          <EHRNavigation config={config} activeForm={activeForm} required={requiredFields} missing={missing} onSelect={setActiveForm} />
          <div className="ehr-content">
            {attempted && missing.length > 0 && <div className="ehr-error-summary" role="alert"><strong>Documentation is incomplete</strong><p>{blockedMessage ?? 'Complete the required entries to continue.'}</p><ul>{missing.map(path => {
              const { formId, field } = splitFieldPath(path)
              return <li key={path}><button type="button" onClick={() => goToField(path)}>{config.forms[formId].title}: {getFieldLabel(field)}</button></li>
            })}</ul></div>}
            {activeForm === null ? <EHROverview config={config} values={values} vitals={vitals} alarm={alarm} required={requiredFields} onGoToField={goToField} />
              : <EHRForm formId={activeForm} config={config.forms[activeForm]} values={values} required={requiredFields} attempted={attempted} onChange={onFieldChange} />}
          </div>
        </div>
        <footer className="modal-footer ehr-footer">
          <div role="status"><strong className={missing.length ? 'required-status' : 'complete-status'}>{requiredFields.length ? (missing.length ? `${missing.length} required ${missing.length === 1 ? 'field' : 'fields'} incomplete` : 'All required fields complete') : 'Draft patient record'}</strong><span>{missing.length ? 'Complete each required section before continuing.' : 'Save your entries to return to the simulation.'}</span></div>
          <div className="footer-actions"><button type="button" className="secondary-action" onClick={onClose}>Close</button><button type="submit" className="primary-action">{requiredFields.length ? 'Save & continue' : 'Save & return'}</button></div>
        </footer>
      </form>
    </Modal>
  )
}
