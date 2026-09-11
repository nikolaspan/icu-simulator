import type { DecisionNode, DecisionOption, GateNode, GlobalRule, GlobalRuleEffect, EHRFormValues, NodeEffects, Scenario, ScenarioNode, SimulatorState, } from './types'
export interface EngineResult {
  state: SimulatorState
  toast?: string
  vitalsChanged: boolean
}
export type { EHRFormValues } from './types'
export function createInitialState(scenario: Scenario): SimulatorState {
  const firstNode = scenario.nodes[0]
  if (!firstNode) {
    throw new Error('Scenario contains no nodes.')
  }
  return {
    current_node_id: firstNode.id, score: scenario.initial_state.current_score, time_elapsed: scenario.initial_state.time_elapsed, vitals: {
      ...scenario.initial_state.vitals,
    }, flags: {
      ...scenario.initial_state.flags,
    }, decision_path: [firstNode.id,], completed: firstNode.type === 'end',
  }
}
export function getNode(scenario: Scenario, nodeId: string): ScenarioNode {
  const node = scenario.nodes.find((item) => item.id === nodeId)
  if (!node) {
    throw new Error(`Scenario node "${nodeId}" was not found.`)
  }
  return node
}
export function getCurrentNode(scenario: Scenario, state: SimulatorState): ScenarioNode {
  return getNode(scenario, state.current_node_id)
}
function moveToNode(scenario: Scenario, state: SimulatorState, nextNodeId: string): SimulatorState {
  const nextNode = getNode(scenario, nextNodeId)
  return {
    ...state, current_node_id: nextNode.id, decision_path: [...state.decision_path, nextNode.id,], completed: nextNode.type === 'end',
  }
}
function applyStateUpdate(state: SimulatorState, path: string, value: string | number | boolean): SimulatorState {
  if (path.startsWith('flags.')) {
    const flagName = path.slice('flags.'.length)
    if (typeof value !== 'boolean') {
      console.warn(`Ignored invalid flag value for "${path}".`)
      return state
    }
    return {
      ...state, flags: {
        ...state.flags, [flagName]: value,
      },
    }
  }
  console.warn(`Unsupported state update path: ${path}`)
  return state
}
export function applyEffects(state: SimulatorState, effects?: NodeEffects): EngineResult {
  if (!effects) {
    return {
      state, vitalsChanged: false,
    }
  }
  let nextState: SimulatorState = {
    ...state,
  }
  let vitalsChanged = false
  if (effects.score_delta !== undefined) {
    nextState = {
      ...nextState, score: nextState.score + effects.score_delta,
    }
  }
  if (effects.state_update) {
    for (const [path, value,] of Object.entries(effects.state_update)) {
      nextState = applyStateUpdate(nextState, path, value)
    }
  }
  if (effects.vitals_update) {
    nextState = {
      ...nextState, vitals: {
        ...nextState.vitals, ...effects.vitals_update,
      },
    }
    vitalsChanged = Object.keys(effects.vitals_update).some(key => {
      const vital = key as keyof typeof state.vitals
      return state.vitals[vital] !== nextState.vitals[vital]
    })
  }
  return {
    state: nextState, toast: effects.toast, vitalsChanged,
  }
}
export function advanceMessage(scenario: Scenario, state: SimulatorState): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'message') {
    throw new Error(`Node "${node.id}" is not a message node.`)
  }
  const nextState = moveToNode(scenario, state, node.next_node_id)
  return {
    state: nextState, vitalsChanged: false,
  }
}
export function getDecisionOption(node: DecisionNode, optionId: string): DecisionOption {
  const option = node.options.find((item) => item.id === optionId)
  if (!option) {
    throw new Error(`Decision option "${optionId}" was not found in node "${node.id}".`)
  }
  return option
}
export function selectDecision(scenario: Scenario, state: SimulatorState, optionId: string): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'decision') {
    throw new Error(`Node "${node.id}" is not a decision node.`)
  }
  const option = getDecisionOption(node, optionId)
  const effectResult = applyEffects(state, option.effects)
  const stateWithDecision = {
    ...effectResult.state, decision_path: [...effectResult.state.decision_path, option.id,],
  }
  const nextState = moveToNode(scenario, stateWithDecision, option.next_node_id)
  return {
    ...effectResult, state: nextState,
  }
}
export function applyTimeout(scenario: Scenario, state: SimulatorState): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'decision') {
    throw new Error(`Node "${node.id}" is not a decision node.`)
  }
  if (!node.timeout) {
    throw new Error(`Decision node "${node.id}" has no timeout.`)
  }
  const effectResult = applyEffects(state, node.timeout.on_timeout_effects)
  const stateWithTimeout = {
    ...effectResult.state, decision_path: [...effectResult.state.decision_path, `${node.id}:timeout`,],
  }
  const nextState = moveToNode(scenario, stateWithTimeout, node.timeout.next_node_id)
  return {
    ...effectResult, state: nextState,
  }
}
export function isGateComplete(gate: GateNode, ehrValues: EHRFormValues): boolean {
  return (gate.gate_requirements.required_forms.every((requiredForm) => {
    const submittedForm = ehrValues[requiredForm.form_id]
    if (!submittedForm) {
      return false
    }
    return (requiredForm.fields.every((field) => {
      const value = submittedForm[field]
      return (typeof value === 'string' && value.trim().length > 0)
    }))
  }))
}
export function getMissingGateFields(gate: GateNode, ehrValues: EHRFormValues): string[] {
  const missing: string[] = []
  for (const requiredForm of gate.gate_requirements.required_forms) {
    const submittedForm = ehrValues[requiredForm.form_id]
    for (const field of requiredForm.fields) {
      const value = submittedForm?.[field]
      if (!value || value.trim().length === 0) {
        missing.push(`${requiredForm.form_id}.${field}`)
      }
    }
  }
  return missing
}
export function passGate(scenario: Scenario, state: SimulatorState, ehrValues: EHRFormValues): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'gate') {
    throw new Error(`Node "${node.id}" is not a documentation gate.`)
  }
  if (!isGateComplete(node, ehrValues)) {
    return {
      state, toast: node.feedback_blocked, vitalsChanged: false,
    }
  }
  let nextState = {
    ...state,
  }
  if (node.effects_on_pass?.score_delta !== undefined) {
    nextState = {
      ...nextState, score: nextState.score + node.effects_on_pass.score_delta,
    }
  }
  if (node.effects_on_pass?.state_update) {
    for (const [path, value,] of Object.entries(node.effects_on_pass.state_update)) {
      nextState = applyStateUpdate(nextState, path, value)
    }
  }
  nextState = moveToNode(scenario, nextState, node.next_node_id)
  return {
    state: nextState, toast: node.feedback_success ?? 'Documentation complete.', vitalsChanged: false,
  }
}
export function incrementTime(state: SimulatorState, seconds = 1): SimulatorState {
  return {
    ...state, time_elapsed: state.time_elapsed + seconds,
  }
}
function getStateNumber(state: SimulatorState, path: string): number | undefined {
  switch (path) {
    case 'vitals.hr': return state.vitals.hr
    case 'vitals.spo2': return state.vitals.spo2
    case 'vitals.rr': return state.vitals.rr
    case 'vitals.temp': return state.vitals.temp
    case 'time_elapsed': return state.time_elapsed
    case 'score': return state.score
    default: return undefined
  }
}
function evaluateNumericCondition(value: number, condition: {
  lt?: number
  lte?: number
  gt?: number
  gte?: number
  eq?: number
}): boolean {
  if (condition.lt !== undefined && !(value < condition.lt)) {
    return false
  }
  if (condition.lte !== undefined && !(value <= condition.lte)) {
    return false
  }
  if (condition.gt !== undefined && !(value > condition.gt)) {
    return false
  }
  if (condition.gte !== undefined && !(value >= condition.gte)) {
    return false
  }
  if (condition.eq !== undefined && value !== condition.eq) {
    return false
  }
  return true
}
export function isGlobalRuleActive(rule: GlobalRule, state: SimulatorState): boolean {
  for (const [path, condition,] of Object.entries(rule.condition)) {
    const value = getStateNumber(state, path)
    if (value === undefined) {
      console.warn(`Unsupported global-rule condition path: ${path}`)
      return false
    }
    if (!evaluateNumericCondition(value, condition)) {
      return false
    }
  }
  return true
}
export function getActiveGlobalRules(scenario: Scenario, state: SimulatorState): GlobalRule[] {
  return (scenario.rules.global_rules.filter((rule) => isGlobalRuleActive(rule, state)))
}
export function getActiveGlobalEffects(scenario: Scenario, state: SimulatorState): GlobalRuleEffect[] {
  return (getActiveGlobalRules(scenario, state).flatMap((rule) => rule.effects))
}
