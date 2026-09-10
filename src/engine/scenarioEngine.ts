import type {
  DecisionNode,
  DecisionOption,
  GateNode,
  GlobalRule,
  GlobalRuleEffect,
  MessageNode,
  NodeEffects,
  Scenario,
  ScenarioNode,
  SimulatorState,
} from './types'

/*
 * ============================================================
 * RESULT TYPES
 * ============================================================
 */

export interface EngineResult {
  state: SimulatorState
  toast?: string
  vitalsChanged: boolean
}

export type EHRFormValues =
  Record<string, Record<string, string>>

/*
 * ============================================================
 * INITIAL STATE
 * ============================================================
 */

export function createInitialState(
  scenario: Scenario,
): SimulatorState {
  const firstNode =
    scenario.nodes[0]

  if (!firstNode) {
    throw new Error(
      'Scenario contains no nodes.',
    )
  }

  return {
    current_node_id:
      firstNode.id,

    score:
      scenario.initial_state
        .current_score,

    time_elapsed:
      scenario.initial_state
        .time_elapsed,

    vitals: {
      ...scenario.initial_state
        .vitals,
    },

    flags: {
      ...scenario.initial_state
        .flags,
    },

    decision_path: [
      firstNode.id,
    ],

    completed:
      firstNode.type === 'end',
  }
}

/*
 * ============================================================
 * NODE LOOKUP
 * ============================================================
 */

export function getNode(
  scenario: Scenario,
  nodeId: string,
): ScenarioNode {
  const node =
    scenario.nodes.find(
      (item) =>
        item.id === nodeId,
    )

  if (!node) {
    throw new Error(
      `Scenario node "${nodeId}" was not found.`,
    )
  }

  return node
}

export function getCurrentNode(
  scenario: Scenario,
  state: SimulatorState,
): ScenarioNode {
  return getNode(
    scenario,
    state.current_node_id,
  )
}

/*
 * ============================================================
 * MOVE TO ANOTHER NODE
 * ============================================================
 */

function moveToNode(
  scenario: Scenario,
  state: SimulatorState,
  nextNodeId: string,
): SimulatorState {
  const nextNode =
    getNode(
      scenario,
      nextNodeId,
    )

  return {
    ...state,

    current_node_id:
      nextNode.id,

    decision_path: [
      ...state.decision_path,
      nextNode.id,
    ],

    completed:
      nextNode.type === 'end',
  }
}

/*
 * ============================================================
 * APPLY STATE UPDATES
 * ============================================================
 *
 * The JSON currently uses values such as:
 *
 * "flags.assessment_complete": true
 *
 * We deliberately support only known state paths.
 * This prevents arbitrary JSON paths from changing unrelated
 * application data.
 */

function applyStateUpdate(
  state: SimulatorState,
  path: string,
  value:
    | string
    | number
    | boolean,
): SimulatorState {
  /*
   * Flags
   */

  if (
    path.startsWith(
      'flags.',
    )
  ) {
    const flagName =
      path.slice(
        'flags.'.length,
      )

    if (
      typeof value !==
      'boolean'
    ) {
      console.warn(
        `Ignored invalid flag value for "${path}".`,
      )

      return state
    }

    return {
      ...state,

      flags: {
        ...state.flags,

        [flagName]:
          value,
      },
    }
  }

  console.warn(
    `Unsupported state update path: ${path}`,
  )

  return state
}

/*
 * ============================================================
 * APPLY NODE EFFECTS
 * ============================================================
 */

export function applyEffects(
  state: SimulatorState,
  effects?: NodeEffects,
): EngineResult {
  if (!effects) {
    return {
      state,
      vitalsChanged: false,
    }
  }

  let nextState: SimulatorState = {
    ...state,
  }

  let vitalsChanged =
    false

  /*
   * Score
   */

  if (
    effects.score_delta !==
    undefined
  ) {
    nextState = {
      ...nextState,

      score:
        nextState.score +
        effects.score_delta,
    }
  }

  /*
   * Flags / state paths
   */

  if (
    effects.state_update
  ) {
    for (
      const [
        path,
        value,
      ] of Object.entries(
        effects.state_update,
      )
    ) {
      nextState =
        applyStateUpdate(
          nextState,
          path,
          value,
        )
    }
  }

  /*
   * Vital signs
   */

  if (
    effects.vitals_update
  ) {
    nextState = {
      ...nextState,

      vitals: {
        ...nextState.vitals,
        ...effects.vitals_update,
      },
    }

    vitalsChanged = true
  }

  return {
    state: nextState,
    toast: effects.toast,
    vitalsChanged,
  }
}

/*
 * ============================================================
 * MESSAGE NODE
 * ============================================================
 *
 * Message nodes have no user decision.
 * Calling this function progresses to their next node.
 */

export function advanceMessage(
  scenario: Scenario,
  state: SimulatorState,
): EngineResult {
  const node =
    getCurrentNode(
      scenario,
      state,
    )

  if (
    node.type !==
    'message'
  ) {
    throw new Error(
      `Node "${node.id}" is not a message node.`,
    )
  }

  const messageNode =
    node as MessageNode

  const nextState =
    moveToNode(
      scenario,
      state,
      messageNode.next_node_id,
    )

  return {
    state: nextState,
    vitalsChanged: false,
  }
}

/*
 * ============================================================
 * DECISION OPTION LOOKUP
 * ============================================================
 */

export function getDecisionOption(
  node: DecisionNode,
  optionId: string,
): DecisionOption {
  const option =
    node.options.find(
      (item) =>
        item.id === optionId,
    )

  if (!option) {
    throw new Error(
      `Decision option "${optionId}" was not found in node "${node.id}".`,
    )
  }

  return option
}

/*
 * ============================================================
 * SELECT DECISION
 * ============================================================
 */

export function selectDecision(
  scenario: Scenario,
  state: SimulatorState,
  optionId: string,
): EngineResult {
  const node =
    getCurrentNode(
      scenario,
      state,
    )

  if (
    node.type !==
    'decision'
  ) {
    throw new Error(
      `Node "${node.id}" is not a decision node.`,
    )
  }

  const option =
    getDecisionOption(
      node,
      optionId,
    )

  /*
   * Apply the consequence
   * of the selected option.
   */

  const effectResult =
    applyEffects(
      state,
      option.effects,
    )

  /*
   * Record which choice was
   * actually made.
   */

  const stateWithDecision = {
    ...effectResult.state,

    decision_path: [
      ...effectResult.state
        .decision_path,

      option.id,
    ],
  }

  /*
   * Move to next node.
   */

  const nextState =
    moveToNode(
      scenario,
      stateWithDecision,
      option.next_node_id,
    )

  return {
    ...effectResult,
    state: nextState,
  }
}

/*
 * ============================================================
 * DECISION TIMEOUT
 * ============================================================
 */

export function applyTimeout(
  scenario: Scenario,
  state: SimulatorState,
): EngineResult {
  const node =
    getCurrentNode(
      scenario,
      state,
    )

  if (
    node.type !==
    'decision'
  ) {
    throw new Error(
      `Node "${node.id}" is not a decision node.`,
    )
  }

  if (!node.timeout) {
    throw new Error(
      `Decision node "${node.id}" has no timeout.`,
    )
  }

  const effectResult =
    applyEffects(
      state,
      node.timeout
        .on_timeout_effects,
    )

  const stateWithTimeout = {
    ...effectResult.state,

    decision_path: [
      ...effectResult.state
        .decision_path,

      `${node.id}:timeout`,
    ],
  }

  const nextState =
    moveToNode(
      scenario,
      stateWithTimeout,
      node.timeout
        .next_node_id,
    )

  return {
    ...effectResult,
    state: nextState,
  }
}

/*
 * ============================================================
 * EHR DOCUMENTATION GATE
 * ============================================================
 */

export function isGateComplete(
  gate: GateNode,
  ehrValues: EHRFormValues,
): boolean {
  return (
    gate.gate_requirements
      .required_forms
      .every((requiredForm) => {
        const submittedForm =
          ehrValues[
            requiredForm.form_id
          ]

        if (!submittedForm) {
          return false
        }

        return (
          requiredForm.fields
            .every((field) => {
              const value =
                submittedForm[
                  field
                ]

              return (
                typeof value ===
                  'string' &&
                value.trim()
                  .length > 0
              )
            })
        )
      })
  )
}

/*
 * Returns exactly which required fields
 * are still missing. This will later let
 * us show useful UX feedback instead of
 * only saying "documentation incomplete".
 */

export function getMissingGateFields(
  gate: GateNode,
  ehrValues: EHRFormValues,
): string[] {
  const missing: string[] =
    []

  for (
    const requiredForm of
      gate.gate_requirements
        .required_forms
  ) {
    const submittedForm =
      ehrValues[
        requiredForm.form_id
      ]

    for (
      const field of
        requiredForm.fields
    ) {
      const value =
        submittedForm?.[
          field
        ]

      if (
        !value ||
        value.trim()
          .length === 0
      ) {
        missing.push(
          `${requiredForm.form_id}.${field}`,
        )
      }
    }
  }

  return missing
}

/*
 * ============================================================
 * PASS DOCUMENTATION GATE
 * ============================================================
 */

export function passGate(
  scenario: Scenario,
  state: SimulatorState,
  ehrValues: EHRFormValues,
): EngineResult {
  const node =
    getCurrentNode(
      scenario,
      state,
    )

  if (
    node.type !==
    'gate'
  ) {
    throw new Error(
      `Node "${node.id}" is not a documentation gate.`,
    )
  }

  /*
   * Block progression if
   * documentation is incomplete.
   */

  if (
    !isGateComplete(
      node,
      ehrValues,
    )
  ) {
    return {
      state,

      toast:
        node.feedback_blocked,

      vitalsChanged: false,
    }
  }

  let nextState = {
    ...state,
  }

  /*
   * Apply score from gate.
   */

  if (
    node.effects_on_pass
      ?.score_delta !==
    undefined
  ) {
    nextState = {
      ...nextState,

      score:
        nextState.score +
        node.effects_on_pass
          .score_delta,
    }
  }

  /*
   * Apply gate state flags.
   */

  if (
    node.effects_on_pass
      ?.state_update
  ) {
    for (
      const [
        path,
        value,
      ] of Object.entries(
        node.effects_on_pass
          .state_update,
      )
    ) {
      nextState =
        applyStateUpdate(
          nextState,
          path,
          value,
        )
    }
  }

  nextState =
    moveToNode(
      scenario,
      nextState,
      node.next_node_id,
    )

  return {
    state: nextState,

    toast:
      node.feedback_success ??
      'Documentation complete.',

    vitalsChanged: false,
  }
}

/*
 * ============================================================
 * TIME
 * ============================================================
 */

export function incrementTime(
  state: SimulatorState,
  seconds = 1,
): SimulatorState {
  return {
    ...state,

    time_elapsed:
      state.time_elapsed +
      seconds,
  }
}

/*
 * ============================================================
 * GLOBAL RULE CONDITIONS
 * ============================================================
 */

function getStateNumber(
  state: SimulatorState,
  path: string,
): number | undefined {
  switch (path) {
    case 'vitals.hr':
      return state.vitals.hr

    case 'vitals.spo2':
      return state.vitals.spo2

    case 'vitals.rr':
      return state.vitals.rr

    case 'vitals.temp':
      return state.vitals.temp

    case 'time_elapsed':
      return state.time_elapsed

    case 'score':
      return state.score

    default:
      return undefined
  }
}

function evaluateNumericCondition(
  value: number,
  condition: {
    lt?: number
    lte?: number
    gt?: number
    gte?: number
    eq?: number
  },
): boolean {
  if (
    condition.lt !==
      undefined &&
    !(value < condition.lt)
  ) {
    return false
  }

  if (
    condition.lte !==
      undefined &&
    !(value <= condition.lte)
  ) {
    return false
  }

  if (
    condition.gt !==
      undefined &&
    !(value > condition.gt)
  ) {
    return false
  }

  if (
    condition.gte !==
      undefined &&
    !(value >= condition.gte)
  ) {
    return false
  }

  if (
    condition.eq !==
      undefined &&
    value !== condition.eq
  ) {
    return false
  }

  return true
}

export function isGlobalRuleActive(
  rule: GlobalRule,
  state: SimulatorState,
): boolean {
  for (
    const [
      path,
      condition,
    ] of Object.entries(
      rule.condition,
    )
  ) {
    const value =
      getStateNumber(
        state,
        path,
      )

    if (
      value === undefined
    ) {
      console.warn(
        `Unsupported global-rule condition path: ${path}`,
      )

      return false
    }

    if (
      !evaluateNumericCondition(
        value,
        condition,
      )
    ) {
      return false
    }
  }

  return true
}

/*
 * ============================================================
 * ACTIVE GLOBAL RULES
 * ============================================================
 */

export function getActiveGlobalRules(
  scenario: Scenario,
  state: SimulatorState,
): GlobalRule[] {
  return (
    scenario.rules
      .global_rules
      .filter((rule) =>
        isGlobalRuleActive(
          rule,
          state,
        ),
      )
  )
}

/*
 * Useful for the UI.
 *
 * For example:
 *
 * SpO2 = 88
 *       ↓
 * rule_hypoxia_alarm active
 *       ↓
 * blinking red monitor
 */

export function getActiveGlobalEffects(
  scenario: Scenario,
  state: SimulatorState,
): GlobalRuleEffect[] {
  return (
    getActiveGlobalRules(
      scenario,
      state,
    ).flatMap(
      (rule) =>
        rule.effects,
    )
  )
}