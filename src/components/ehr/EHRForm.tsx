import type { EHRFormConfig, EHRFormValues } from '../../engine/types'
import { getFieldLabel } from '../../utils/format'

interface EHRFormProps {
  formId: string
  config: EHRFormConfig
  values: EHRFormValues
  required: string[]
  attempted: boolean
  onChange: (formId: string, field: string, value: string) => void
}
export default function EHRForm({ formId, config, values, required, attempted, onChange }: EHRFormProps) {
  return (
    <fieldset className="ehr-fields">
      <legend>{config.title}</legend>
      <p className="ehr-form-note">Required fields are labelled. Entries stay available throughout this session, including when you close the EHR.</p>
      {config.fields.map(field => {
        const path = `${formId}.${field}`
        const value = values[formId]?.[field] ?? ''
        const isRequired = required.includes(path)
        const missing = isRequired && !value.trim()
        const invalid = missing && attempted
        return <div key={field} className={`ehr-field${invalid ? ' ehr-field-invalid' : ''}`}>
          <label htmlFor={path}>{getFieldLabel(field)} <span>{isRequired ? '(required)' : '(optional)'}</span></label>
          <input id={path} name={path} type="text" value={value} required={isRequired} aria-invalid={invalid || undefined}
            aria-describedby={`${path}-hint`} onChange={event => onChange(formId, field, event.target.value)} />
          <small id={`${path}-hint`} className={invalid ? 'field-error' : ''}>
            {invalid ? `Enter ${getFieldLabel(field).toLowerCase()} before continuing.` : isRequired ? (missing ? 'Required before progression.' : '✓ Complete') : 'Optional supporting detail.'}
          </small>
        </div>
      })}
    </fieldset>
  )
}
