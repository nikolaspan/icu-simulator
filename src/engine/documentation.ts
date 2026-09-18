import type { EHRFormValues, GateNode } from './types'

export function getGateRequiredFields(gate: GateNode): string[] {
  return gate.gate_requirements.required_forms.flatMap(form => form.fields.map(field => `${form.form_id}.${field}`))
}

export function splitFieldPath(path: string) {
  const separator = path.indexOf('.')
  return { formId: path.slice(0, separator), field: path.slice(separator + 1) }
}

export function isFieldComplete(values: EHRFormValues, path: string) {
  const { formId, field } = splitFieldPath(path)
  return Boolean(values[formId]?.[field]?.trim())
}

export function getMissingFields(required: string[], values: EHRFormValues) {
  return required.filter(path => !isFieldComplete(values, path))
}
