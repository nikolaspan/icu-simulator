import type { EHRFormValues, HotspotId, LogEventType, SimulatorState, VitalSigns } from './types'

export interface LogEntry {
  id: string
  event_type: LogEventType
  timestamp: string
  time_elapsed: number
  node_id: string
  details: Record<string, unknown>
}

export function createLogEntry(eventType: LogEventType, state: SimulatorState, details: Record<string, unknown> = {}): LogEntry {
  return {
    id: crypto.randomUUID(),
    event_type: eventType,
    timestamp: new Date().toISOString(),
    time_elapsed: state.time_elapsed,
    node_id: state.current_node_id,
    details,
  }
}

export function logNodeEnter(state: SimulatorState): LogEntry {
  return createLogEntry('NODE_ENTER', state, { node_id: state.current_node_id, score: state.score })
}

export function logHotspotInteraction(state: SimulatorState, hotspot: HotspotId): LogEntry {
  return createLogEntry('HOTSPOT_INTERACTION', state, { hotspot })
}

export function logOptionSelected(state: SimulatorState, optionId: string, optionLabel: string, hotspot: HotspotId): LogEntry {
  return createLogEntry('OPTION_SELECTED', state, {
    option_id: optionId,
    option_label: optionLabel,
    target_hotspot: hotspot,
    score: state.score,
  })
}

export function logEhrSubmit(state: SimulatorState, values: EHRFormValues, gatePassed: boolean): LogEntry {
  // A log is a snapshot; subsequent field edits must not change history.
  return createLogEntry('EHR_SUBMIT', state, { gate_passed: gatePassed, forms: structuredClone(values) })
}

export function logVitalsChange(state: SimulatorState, previousVitals: VitalSigns, nextVitals: VitalSigns): LogEntry {
  const changes: Record<string, { from: string | number; to: string | number }> = {}
  const keys: (keyof VitalSigns)[] = ['hr', 'spo2', 'rr', 'bp', 'temp']
  for (const key of keys) {
    if (previousVitals[key] !== nextVitals[key]) changes[key] = { from: previousVitals[key], to: nextVitals[key] }
  }
  return createLogEntry('VITALS_CHANGE', state, { changes })
}

export interface SessionExport {
  exported_at: string
  scenario_id: string
  scenario_title: string
  final_score: number
  elapsed_seconds: number
  completed: boolean
  decision_path: string[]
  flags: Record<string, boolean>
  final_vitals: VitalSigns
  logs: LogEntry[]
}

export function createSessionExport(scenarioId: string, scenarioTitle: string, state: SimulatorState, logs: LogEntry[]): SessionExport {
  return {
    exported_at: new Date().toISOString(),
    scenario_id: scenarioId,
    scenario_title: scenarioTitle,
    final_score: state.score,
    elapsed_seconds: state.time_elapsed,
    completed: state.completed,
    decision_path: [...state.decision_path],
    flags: { ...state.flags },
    final_vitals: { ...state.vitals },
    logs: [...logs],
  }
}

function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  try { anchor.click() } finally {
    anchor.remove()
    // Let the browser begin the download before releasing the Blob URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function downloadSessionJson(scenarioId: string, scenarioTitle: string, state: SimulatorState, logs: LogEntry[]) {
  const session = createSessionExport(scenarioId, scenarioTitle, state, logs)
  downloadFile(JSON.stringify(session, null, 2), `${scenarioId}-session-log.json`, 'application/json')
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export function createLogCsv(logs: LogEntry[]): string {
  const header = ['id', 'event_type', 'timestamp', 'time_elapsed', 'node_id', 'details']
  const rows = logs.map(entry => [
    entry.id, entry.event_type, entry.timestamp, String(entry.time_elapsed),
    entry.node_id, JSON.stringify(entry.details),
  ])
  return [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n')
}

export function downloadLogCsv(scenarioId: string, logs: LogEntry[]) {
  downloadFile(createLogCsv(logs), `${scenarioId}-session-log.csv`, 'text/csv;charset=utf-8')
}
