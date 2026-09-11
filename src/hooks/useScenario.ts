import { useCallback, useEffect, useRef, useState } from 'react'
import { advanceMessage, getNode, passGate, selectDecision, type EngineResult } from '../engine/scenarioEngine'
import { getGateRequiredFields, getMissingFields } from '../engine/documentation'
import { logEhrSubmit, logHotspotInteraction, logOptionSelected } from '../engine/logger'
import { loadDefaultScenario } from '../engine/scenarioLoader'
import { appendLogs, applySessionResult, createSession, getTimeoutRemaining, updateSessionClock, type Session } from '../engine/session'
import type { HotspotId } from '../engine/types'
import { useScenarioClock } from './useScenarioClock'

interface Notice { id: string; message: string; tone: 'info' | 'success' | 'warning' }
const initialUI = { selectedHotspot: null as HotspotId | null, ehrOpen: false, helpOpen: false }

export function useScenario() {
  const [session, setSession] = useState<Session | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const [ui, setUI] = useState(initialUI)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  // Commit synchronously so rapid clicks and timer callbacks always see the latest state.
  const commit = useCallback((next: Session) => {
    sessionRef.current = next
    setSession(next)
  }, [])
  const notify = useCallback((message: string, tone: Notice['tone'] = 'info') => {
    setNotice({ id: crypto.randomUUID(), message, tone })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadDefaultScenario(controller.signal).then(scenario => {
      if (!controller.signal.aborted) commit(createSession(scenario))
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      console.error('Unable to initialize simulation:', cause)
      setError(cause instanceof Error ? cause.message : 'The scenario could not be loaded. Please try again.')
    })
    return () => controller.abort()
  }, [loadAttempt, commit])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 7000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const reportResult = useCallback((previous: Session, result: EngineResult) => {
    setUI(current => ({ ...current, selectedHotspot: null }))
    const scoreChange = result.state.score - previous.state.score
    const changes = [
      previous.state.vitals.spo2 !== result.state.vitals.spo2 ? `SpO₂ ${previous.state.vitals.spo2}% → ${result.state.vitals.spo2}%` : '',
      previous.state.vitals.hr !== result.state.vitals.hr ? `HR ${previous.state.vitals.hr} → ${result.state.vitals.hr} bpm` : '',
      scoreChange ? `Score ${scoreChange > 0 ? '+' : ''}${scoreChange}` : '',
    ].filter(Boolean)
    if (result.toast || changes.length) notify([result.toast, ...changes].filter(Boolean).join(' · '), scoreChange < 0 ? 'warning' : 'info')
  }, [notify])

  const tick = useCallback((now: number) => {
    const previous = sessionRef.current
    if (!previous) return
    const update = updateSessionClock(previous, now)
    if (update.session !== previous) commit(update.session)
    if (update.result) reportResult(previous, update.result)
  }, [commit, reportResult])
  useScenarioClock(Boolean(session && !session.state.completed && !error), session?.id, tick)

  // A deadline also wins if an input event arrives before a throttled timer callback.
  function currentSession() {
    tick(performance.now())
    return sessionRef.current
  }
  function fail(cause: unknown) {
    console.error('Simulation transition failed:', cause)
    setError('The simulation could not continue because its configuration is inconsistent. Restart the scenario to recover.')
  }
  const node = session ? getNode(session.scenario, session.state.current_node_id) : null
  const requiredFields = node?.type === 'gate' ? getGateRequiredFields(node) : []
  const missingFields = session ? getMissingFields(requiredFields, session.ehrValues) : []

  function advance() {
    const current = currentSession()
    if (!current || current.state.current_node_id !== node?.id || node.type !== 'message') return
    try {
      const result = advanceMessage(current.scenario, current.state)
      commit(applySessionResult(current, result))
      reportResult(current, result)
    } catch (cause) { fail(cause) }
  }
  function decide(optionId: string) {
    const current = currentSession()
    if (!current || current.state.current_node_id !== node?.id || node.type !== 'decision') return
    try {
      const option = node.options.find(item => item.id === optionId)
      if (!option) throw new Error(`Missing option: ${optionId}`)
      const result = selectDecision(current.scenario, current.state, optionId)
      commit(applySessionResult(current, result, [logOptionSelected(current.state, option.id, option.label, option.target_hotspot)]))
      reportResult(current, result)
    } catch (cause) { fail(cause) }
  }
  const interact = useCallback((hotspot: HotspotId) => {
    tick(performance.now())
    const current = sessionRef.current
    if (!current || current.state.completed) return
    commit(appendLogs(current, [logHotspotInteraction(current.state, hotspot)]))
    setUI(value => ({ ...value, selectedHotspot: hotspot === 'hs_ehr' ? null : hotspot, ehrOpen: hotspot === 'hs_ehr' }))
  }, [commit, tick])

  function changeField(formId: string, field: string, value: string) {
    const current = sessionRef.current
    if (!current) return
    commit({ ...current, ehrValues: { ...current.ehrValues, [formId]: { ...current.ehrValues[formId], [field]: value } } })
  }
  function saveEHR(): boolean {
    const current = currentSession()
    if (!current || current.state.completed) return false
    try {
      const currentNode = getNode(current.scenario, current.state.current_node_id)
      if (currentNode.type !== 'gate') {
        // A regular save is not a documentation-gate pass.
        commit(appendLogs(current, [logEhrSubmit(current.state, current.ehrValues, false)]))
        setUI(value => ({ ...value, ehrOpen: false }))
        notify('EHR information saved for this session.', 'success')
        return true
      }
      const result = passGate(current.scenario, current.state, current.ehrValues)
      const passed = result.state.decision_path.length !== current.state.decision_path.length
      commit(applySessionResult(current, result, [logEhrSubmit(current.state, current.ehrValues, passed)]))
      if (passed) {
        setUI(value => ({ ...value, ehrOpen: false, selectedHotspot: null }))
        const delta = result.state.score - current.state.score
        notify(`${result.toast ?? 'Documentation saved.'}${delta ? ` Score ${delta > 0 ? '+' : ''}${delta}.` : ''}`, 'success')
      }
      return passed
    } catch (cause) { fail(cause); return false }
  }
  function restart() {
    const current = sessionRef.current
    if (!current) return
    commit(createSession(current.scenario))
    setUI(initialUI)
    setError(null)
    notify('Scenario restarted. A new session has begun.')
  }
  return {
    session, node, ui, notice, error, requiredFields, missingFields,
    timeoutRemaining: session ? getTimeoutRemaining(session) : null,
    advance, decide, interact, changeField, saveEHR, restart,
    closeInteraction: () => setUI(value => ({ ...value, selectedHotspot: null })),
    closeEHR: () => setUI(value => ({ ...value, ehrOpen: false })),
    setHelpOpen: (helpOpen: boolean) => setUI(value => ({ ...value, helpOpen })),
    dismissNotice: () => setNotice(null),
    retry: () => { setError(null); setLoadAttempt(value => value + 1) },
  }
}
