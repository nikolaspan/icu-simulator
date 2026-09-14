import type {
  DecisionNode, DecisionOption, EHRFormValues, GateNode, GlobalRule,
  GlobalRuleEffect, NodeEffects, NumericCondition, Scenario, ScenarioNode,
  SimulatorState, VitalSigns,
} from './types'
import { getGateRequiredFields, getMissingFields } from './documentation'

export interface EngineResult {
  state: SimulatorState
  toast?: string
  vitalsChanged: boolean
}

export function createInitialState(scenario: Scenario): SimulatorState {
  const firstNode = scenario.nodes[0]
  if (!firstNode) throw new Error('Scenario contains no nodes.')
  return {
    current_node_id: firstNode.id,
    score: scenario.initial_state.current_score,
    time_elapsed: scenario.initial_state.time_elapsed,
    vitals: { ...scenario.initial_state.vitals },
    flags: { ...scenario.initial_state.flags },
    decision_path: [firstNode.id],
    completed: firstNode.type === 'end',
  }
}

export function getNode(scenario: Scenario, nodeId: string): ScenarioNode {
  const node = scenario.nodes.find(item => item.id === nodeId)
  if (!node) throw new Error(`Scenario node "${nodeId}" was not found.`)
  return node
}

export function getCurrentNode(scenario: Scenario, state: SimulatorState): ScenarioNode {
  return getNode(scenario, state.current_node_id)
}

function moveToNode(scenario: Scenario, state: SimulatorState, nextNodeId: string): SimulatorState {
  const nextNode = getNode(scenario, nextNodeId)
  return {
    ...state,
    current_node_id: nextNode.id,
    decision_path: [...state.decision_path, nextNode.id],
    completed: nextNode.type === 'end',
  }
}

// Only known paths may update runtime state; scenario flags remain extensible.
function applyStateUpdate(state: SimulatorState, path: string, value: string | number | boolean): SimulatorState {
  if (path.startsWith('flags.') && typeof value === 'boolean') {
    return { ...state, flags: { ...state.flags, [path.slice('flags.'.length)]: value } }
  }
  console.warn(`Ignored unsupported state update: ${path}`)
  return state
}

export function applyEffects(state: SimulatorState, effects?: NodeEffects): EngineResult {
  if (!effects) return { state, vitalsChanged: false }
  let nextState = { ...state }
  if (effects.score_delta !== undefined) nextState.score += effects.score_delta
  if (effects.state_update) {
    for (const [path, value] of Object.entries(effects.state_update)) {
      nextState = applyStateUpdate(nextState, path, value)
    }
  }
  if (effects.vitals_update) nextState.vitals = { ...state.vitals, ...effects.vitals_update }
  const vitalKeys: (keyof VitalSigns)[] = ['hr', 'spo2', 'rr', 'bp', 'temp']
  return {
    state: nextState,
    toast: effects.toast,
    vitalsChanged: vitalKeys.some(key => state.vitals[key] !== nextState.vitals[key]),
  }
}

export function advanceMessage(scenario: Scenario, state: SimulatorState): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'message') throw new Error(`Node "${node.id}" is not a message node.`)
  return { state: moveToNode(scenario, state, node.next_node_id), vitalsChanged: false }
}

export function getDecisionOption(node: DecisionNode, optionId: string): DecisionOption {
  const option = node.options.find(item => item.id === optionId)
  if (!option) throw new Error(`Decision option "${optionId}" was not found in node "${node.id}".`)
  return option
}

export function selectDecision(scenario: Scenario, state: SimulatorState, optionId: string): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'decision') throw new Error(`Node "${node.id}" is not a decision node.`)
  const option = getDecisionOption(node, optionId)
  const result = applyEffects(state, option.effects)
  const stateWithDecision = {
    ...result.state,
    decision_path: [...result.state.decision_path, option.id],
  }
  return { ...result, state: moveToNode(scenario, stateWithDecision, option.next_node_id) }
}

export function applyTimeout(scenario: Scenario, state: SimulatorState): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'decision') throw new Error(`Node "${node.id}" is not a decision node.`)
  if (!node.timeout) throw new Error(`Decision node "${node.id}" has no timeout.`)
  const result = applyEffects(state, node.timeout.on_timeout_effects)
  const stateWithTimeout = {
    ...result.state,
    decision_path: [...result.state.decision_path, `${node.id}:timeout`],
  }
  return { ...result, state: moveToNode(scenario, stateWithTimeout, node.timeout.next_node_id) }
}

export function getMissingGateFields(gate: GateNode, values: EHRFormValues): string[] {
  return getMissingFields(getGateRequiredFields(gate), values)
}

export function isGateComplete(gate: GateNode, values: EHRFormValues): boolean {
  return getMissingGateFields(gate, values).length === 0
}

export function passGate(scenario: Scenario, state: SimulatorState, values: EHRFormValues): EngineResult {
  const node = getCurrentNode(scenario, state)
  if (node.type !== 'gate') throw new Error(`Node "${node.id}" is not a documentation gate.`)
  if (!isGateComplete(node, values)) {
    return { state, toast: node.feedback_blocked, vitalsChanged: false }
  }
  const result = applyEffects(state, node.effects_on_pass)
  return {
    state: moveToNode(scenario, result.state, node.next_node_id),
    toast: node.feedback_success ?? 'Documentation complete.',
    vitalsChanged: false,
  }
}

export function incrementTime(state: SimulatorState, seconds = 1): SimulatorState {
  return { ...state, time_elapsed: state.time_elapsed + seconds }
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

function evaluateNumericCondition(value: number, condition: NumericCondition): boolean {
  if (condition.lt !== undefined && !(value < condition.lt)) return false
  if (condition.lte !== undefined && !(value <= condition.lte)) return false
  if (condition.gt !== undefined && !(value > condition.gt)) return false
  if (condition.gte !== undefined && !(value >= condition.gte)) return false
  if (condition.eq !== undefined && value !== condition.eq) return false
  return true
}

export function isGlobalRuleActive(rule: GlobalRule, state: SimulatorState): boolean {
  return Object.entries(rule.condition).every(([path, condition]) => {
    const value = getStateNumber(state, path)
    if (value === undefined) {
      console.warn(`Unsupported global-rule condition path: ${path}`)
      return false
    }
    return evaluateNumericCondition(value, condition)
  })
}

export function getActiveGlobalRules(scenario: Scenario, state: SimulatorState): GlobalRule[] {
  return scenario.rules.global_rules.filter(rule => isGlobalRuleActive(rule, state))
}

export function getActiveGlobalEffects(scenario: Scenario, state: SimulatorState): GlobalRuleEffect[] {
  return getActiveGlobalRules(scenario, state).flatMap(rule => rule.effects)
}
