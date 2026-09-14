import { applyTimeout, createInitialState, getNode, type EngineResult } from './scenarioEngine'
import { logNodeEnter, logVitalsChange, type LogEntry } from './logger'
import type { EHRFormValues, Scenario, SimulatorState } from './types'
import { applyDocumentationDefaults } from './documentationAutofill'

export interface Session {
  id: string
  scenario: Scenario
  state: SimulatorState
  logs: LogEntry[]
  ehrValues: EHRFormValues
  ehrAutofill: Record<string, string>
  startedAt: number
  nodeStartedAt: number
  clockTime: number
}

// These functions run in event handlers, never in render or a React state updater.
export function createSession(scenario: Scenario, now = performance.now()): Session {
  const state = createInitialState(scenario)
  return {
    id: crypto.randomUUID(), scenario, state, ehrValues: {}, ehrAutofill: {},
    logs: scenario.logging.enabled && scenario.logging.log_events.includes('NODE_ENTER') ? [logNodeEnter(state)] : [],
    startedAt: now, nodeStartedAt: now, clockTime: now,
  }
}

export function appendLogs(session: Session, entries: LogEntry[]): Session {
  const config = session.scenario.logging
  const enabled = config.enabled ? entries.filter(entry => config.log_events.includes(entry.event_type)) : []
  return enabled.length ? { ...session, logs: [...session.logs, ...enabled] } : session
}

export function applySessionResult(session: Session, result: EngineResult, entries: LogEntry[] = [], now = performance.now()): Session {
  const transitioned = result.state.decision_path.length !== session.state.decision_path.length
  const documentation = applyDocumentationDefaults(session.scenario, result.state.decision_path.slice(session.state.decision_path.length), session.ehrValues, session.ehrAutofill)
  if (result.vitalsChanged) entries.push(logVitalsChange(session.state, session.state.vitals, result.state.vitals))
  if (transitioned) entries.push(logNodeEnter(result.state))
  return appendLogs({
    ...session, ...documentation, state: result.state, clockTime: now,
    nodeStartedAt: transitioned ? now : session.nodeStartedAt,
  }, entries)
}

export function getTimeoutRemaining(session: Session) {
  const node = getNode(session.scenario, session.state.current_node_id)
  return node.type === 'decision' && node.timeout
    ? Math.max(0, Math.ceil(node.timeout.seconds - (session.clockTime - session.nodeStartedAt) / 1000))
    : null
}

export function updateSessionClock(session: Session, now: number): { session: Session; result?: EngineResult } {
  if (session.state.completed) return { session }
  const elapsed = session.scenario.initial_state.time_elapsed + Math.floor((now - session.startedAt) / 1000)
  const next = { ...session, clockTime: now, state: { ...session.state, time_elapsed: elapsed } }
  if (getTimeoutRemaining(next) === 0) {
    const result = applyTimeout(session.scenario, next.state)
    return { session: applySessionResult(next, result, [], now), result }
  }
  if (elapsed === session.state.time_elapsed && getTimeoutRemaining(next) === getTimeoutRemaining(session)) return { session }
  return { session: next }
}
