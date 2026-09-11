import type { Scenario } from './types'
import { validateScenario } from './scenarioValidation'

export async function loadScenario(path: string, signal?: AbortSignal): Promise<Scenario> {
  let response: Response
  try {
    response = await fetch(path, { cache: 'no-store', signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Unable to connect to the scenario file. Check your connection and try again.', { cause: error })
  }
  if (!response.ok) throw new Error(`The scenario file could not be loaded (${response.status}). Please try again.`)
  let data: unknown
  try {
    data = await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('The scenario file does not contain valid JSON. Please check the scenario file.', { cause: error })
  }
  try {
    validateScenario(data)
  } catch (error) {
    console.error('Scenario validation failed:', error)
    throw new Error('The scenario contains incomplete or inconsistent configuration. Please correct the scenario file and try again.', { cause: error })
  }
  return data
}

export function loadDefaultScenario(signal?: AbortSignal) {
  return loadScenario(`${import.meta.env.BASE_URL}scenarios/hypoxia.json`, signal)
}
