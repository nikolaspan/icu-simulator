import type { EHRFormValues, Scenario } from './types'
import { splitFieldPath } from './documentation'

// Apply only newly completed actions, once, irrespective of node names or logging.
// Opening/saving a record never refills a field that the trainee deliberately cleared.
export function applyDocumentationDefaults(scenario: Scenario, completedActions: string[], values: EHRFormValues, sources: Record<string, string>) {
  let ehrValues = values
  let ehrAutofill = sources
  for (const id of completedActions) {
    const option = scenario.nodes.flatMap(node => node.type === 'decision' ? node.options : []).find(option => option.id === id)
    for (const [path, entry] of Object.entries(option?.documentation_defaults ?? {})) {
      const { formId, field } = splitFieldPath(path)
      if (ehrValues[formId]?.[field]?.trim()) continue
      ehrValues = { ...ehrValues, [formId]: { ...ehrValues[formId], [field]: entry.value } }
      ehrAutofill = { ...ehrAutofill, [path]: entry.source }
    }
  }
  return { ehrValues, ehrAutofill }
}
