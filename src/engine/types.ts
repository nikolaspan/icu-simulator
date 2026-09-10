/*
 * ============================================================
 * ICU SCENARIO TYPES
 * ============================================================
 *
 * These interfaces describe the structure of scenario JSON
 * files loaded by the simulator.
 *
 * Keep the property names in snake_case because they match
 * the JSON format directly.
 */

/*
 * ------------------------------------------------------------
 * HOTSPOTS
 * ------------------------------------------------------------
 */

export type HotspotId =
  | 'hs_monitor'
  | 'hs_patient'
  | 'hs_ventilator'
  | 'hs_ehr'
  | 'hs_call'

export interface Hotspot {
  id: HotspotId
  label: string
}

/*
 * ------------------------------------------------------------
 * VITAL SIGNS
 * ------------------------------------------------------------
 */

export interface VitalSigns {
  hr: number
  spo2: number
  rr: number
  bp: string
  temp: number
}

/*
 * ------------------------------------------------------------
 * FLAGS
 * ------------------------------------------------------------
 *
 * Scenarios may introduce additional boolean flags later,
 * so we don't hard-code every possible flag name.
 */

export type ScenarioFlags =
  Record<string, boolean>

/*
 * ------------------------------------------------------------
 * UI STATE
 * ------------------------------------------------------------
 */

export interface ScenarioUIState {
  active_hotspots: HotspotId[]
  monitor_alert: boolean
}

/*
 * ------------------------------------------------------------
 * INITIAL STATE
 * ------------------------------------------------------------
 */

export interface InitialScenarioState {
  time_elapsed: number
  current_score: number

  flags: ScenarioFlags

  vitals: VitalSigns

  ui: ScenarioUIState
}

/*
 * ------------------------------------------------------------
 * SCENARIO METADATA
 * ------------------------------------------------------------
 */

export interface ScenarioMeta {
  id: string
  title: string
  description: string

  estimated_duration_minutes: number

  difficulty: string

  learning_goals: string[]
}

/*
 * ------------------------------------------------------------
 * EHR CONFIGURATION
 * ------------------------------------------------------------
 */

export interface EHRFormConfig {
  title: string
  fields: string[]
}

export interface EHRConfig {
  forms: Record<
    string,
    EHRFormConfig
  >
}

/*
 * ------------------------------------------------------------
 * CONDITIONS
 * ------------------------------------------------------------
 *
 * Allows scenario rules such as:
 *
 * vitals.spo2 < 90
 */

export interface NumericCondition {
  lt?: number
  lte?: number
  gt?: number
  gte?: number
  eq?: number
}

export type RuleCondition =
  Record<
    string,
    NumericCondition
  >

/*
 * ------------------------------------------------------------
 * GLOBAL RULE EFFECTS
 * ------------------------------------------------------------
 */

export interface UIVisualEffect {
  type: 'ui_visual'

  target: HotspotId

  state: string
}

export interface UIToastEffect {
  type: 'ui_toast'

  style:
    | 'success'
    | 'info'
    | 'warning'
    | 'danger'

  message: string
}

export type GlobalRuleEffect =
  | UIVisualEffect
  | UIToastEffect

/*
 * ------------------------------------------------------------
 * GLOBAL RULE
 * ------------------------------------------------------------
 */

export interface GlobalRule {
  id: string

  condition: RuleCondition

  effects: GlobalRuleEffect[]
}

export interface ScenarioRules {
  global_rules: GlobalRule[]
}

/*
 * ------------------------------------------------------------
 * STATE UPDATES
 * ------------------------------------------------------------
 *
 * Example:
 *
 * {
 *   "flags.assessment_complete": true
 * }
 */

export type StateUpdate =
  Record<
    string,
    string | number | boolean
  >

/*
 * ------------------------------------------------------------
 * NODE EFFECTS
 * ------------------------------------------------------------
 */

export interface NodeEffects {
  score_delta?: number

  state_update?: StateUpdate

  vitals_update?: Partial<VitalSigns>

  toast?: string
}

/*
 * ------------------------------------------------------------
 * DECISION OPTION
 * ------------------------------------------------------------
 */

export interface DecisionOption {
  id: string

  label: string

  target_hotspot: HotspotId

  effects?: NodeEffects

  next_node_id: string
}

/*
 * ------------------------------------------------------------
 * TIMEOUT
 * ------------------------------------------------------------
 */

export interface NodeTimeout {
  seconds: number

  on_timeout_effects:
    NodeEffects

  next_node_id: string
}

/*
 * ------------------------------------------------------------
 * BASE NODE
 * ------------------------------------------------------------
 */

interface BaseNode {
  id: string

  text: string
}

/*
 * ------------------------------------------------------------
 * MESSAGE NODE
 * ------------------------------------------------------------
 */

export interface MessageNode
  extends BaseNode {
  type: 'message'

  next_node_id: string
}

/*
 * ------------------------------------------------------------
 * DECISION NODE
 * ------------------------------------------------------------
 */

export interface DecisionNode
  extends BaseNode {
  type: 'decision'

  options: DecisionOption[]

  timeout?: NodeTimeout
}

/*
 * ------------------------------------------------------------
 * DOCUMENTATION GATE
 * ------------------------------------------------------------
 */

export interface RequiredForm {
  form_id: string
  fields: string[]
}

export interface GateRequirements {
  target_hotspot: HotspotId

  required_forms: RequiredForm[]
}

export interface GatePassEffects {
  state_update?: StateUpdate

  score_delta?: number
}

export interface GateNode
  extends BaseNode {
  type: 'gate'

  description: string

  gate_requirements:
    GateRequirements

  feedback_blocked: string

  feedback_success?: string

  effects_on_pass?:
    GatePassEffects

  next_node_id: string
}

/*
 * ------------------------------------------------------------
 * END / DEBRIEF
 * ------------------------------------------------------------
 */

export interface DebriefConfig {
  show_score: boolean

  show_decision_path: boolean

  highlight_missed_docs: boolean

  export_log: boolean
}

export interface EndNode
  extends BaseNode {
  type: 'end'

  debrief_config:
    DebriefConfig
}

/*
 * ------------------------------------------------------------
 * ALL POSSIBLE NODE TYPES
 * ------------------------------------------------------------
 */

export type ScenarioNode =
  | MessageNode
  | DecisionNode
  | GateNode
  | EndNode

/*
 * ------------------------------------------------------------
 * LOGGING
 * ------------------------------------------------------------
 */

export type LogEventType =
  | 'NODE_ENTER'
  | 'HOTSPOT_INTERACTION'
  | 'OPTION_SELECTED'
  | 'EHR_SUBMIT'
  | 'VITALS_CHANGE'

export interface LoggingConfig {
  enabled: boolean

  log_events: LogEventType[]

  export_format:
    | 'JSON'
    | 'CSV'
}

/*
 * ------------------------------------------------------------
 * COMPLETE SCENARIO
 * ------------------------------------------------------------
 */

export interface Scenario {
  schema_version: string

  scenario_meta:
    ScenarioMeta

  initial_state:
    InitialScenarioState

  hotspots:
    Hotspot[]

  ehr_config:
    EHRConfig

  rules:
    ScenarioRules

  nodes:
    ScenarioNode[]

  logging:
    LoggingConfig
}

/*
 * ------------------------------------------------------------
 * LIVE SIMULATOR STATE
 * ------------------------------------------------------------
 *
 * This is separate from the JSON.
 *
 * It represents the changing state while the user is
 * actually completing the scenario.
 */

export interface SimulatorState {
  current_node_id: string

  score: number

  time_elapsed: number

  vitals: VitalSigns

  flags: ScenarioFlags

  decision_path: string[]

  completed: boolean
}