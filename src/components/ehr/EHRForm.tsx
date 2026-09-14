import type { EHRFormConfig, EHRFormValues } from '../../engine/types'
import { getFieldLabel } from '../../utils/format'

interface EHRFormProps {
  formId: string
  config: EHRFormConfig
  values: EHRFormValues
  required: string[]
  attempted: boolean
  autofill: Record<string, string>
  onChange: (formId: string, field: string, value: string) => void
}
export default function EHRForm({ formId, config, values, required, attempted, autofill, onChange }: EHRFormProps) {
  return (
    <fieldset className="ehr-fields">
      <legend>{config.title}</legend>
      <p className="ehr-form-note"><span aria-hidden="true">*</span> Required for this stage. Draft entries stay available when you close the record.</p>
      {config.fields.map(field => {
        const path = `${formId}.${field}`
        const value = values[formId]?.[field] ?? ''
        const isRequired = required.includes(path)
        const missing = isRequired && !value.trim()
        const invalid = missing && attempted
        return <div key={field} className={`ehr-field${invalid ? ' ehr-field-invalid' : ''}`}>
          <label htmlFor={path}>{getFieldLabel(field)} {isRequired && <span className="required-asterisk" aria-hidden="true">*</span>}<span>{isRequired ? '(required)' : '(optional)'}</span></label>
          <input id={path} name={path} type="text" value={value} required={isRequired} aria-invalid={invalid || undefined}
            aria-describedby={`${path}-hint`} onChange={event => onChange(formId, field, event.target.value)} />
          <small id={`${path}-hint`} className={invalid ? 'field-error' : ''}>
            {invalid ? `Enter ${getFieldLabel(field).toLowerCase()} before continuing.` : autofill[path] ? `Auto-filled from ${autofill[path]}. You can edit this value.` : isRequired ? (missing ? 'Required before progression.' : '✓ Complete') : 'Optional supporting detail.'}
          </small>
        </div>
      })}
    </fieldset>
  )
}
