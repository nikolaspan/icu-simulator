// Scenario types mirror the JSON schema. Runtime validation lives in scenarioValidation.ts.


export type HotspotId = 'hs_monitor' | 'hs_patient' | 'hs_ventilator' | 'hs_ehr' | 'hs_call'

export interface Hotspot {
  id: HotspotId
  label: string
}

export interface VitalSigns {
  hr: number
  spo2: number
  rr: number
  bp: string
  temp: number
}

export type ScenarioFlags = Record<string, boolean>

export interface ScenarioUIState {
  active_hotspots: HotspotId[]
  monitor_alert: boolean
}

export interface InitialScenarioState {
  time_elapsed: number
  current_score: number
  flags: ScenarioFlags
  vitals: VitalSigns
  ui: ScenarioUIState
}

export interface ScenarioMeta {
  id: string
  title: string
  description: string
  estimated_duration_minutes: number
  difficulty: string
  learning_goals: string[]
}

export interface EHRFormConfig {
  title: string
  fields: string[]
}

export interface EHRConfig {
  forms: Record<string, EHRFormConfig>
}

export interface NumericCondition {
  lt?: number
  lte?: number
  gt?: number
  gte?: number
  eq?: number
}

export type RuleCondition = Record<string, NumericCondition>

export interface UIVisualEffect {
  type: 'ui_visual'
  target: HotspotId
  state: string
}

export interface UIToastEffect {
  type: 'ui_toast'
  style: 'success' | 'info' | 'warning' | 'danger'
  message: string
}

export type GlobalRuleEffect = UIVisualEffect | UIToastEffect

export interface GlobalRule {
  id: string
  condition: RuleCondition
  effects: GlobalRuleEffect[]
}

export interface ScenarioRules {
  global_rules: GlobalRule[]
}

export type StateUpdate = Record<string, string | number | boolean>

export interface NodeEffects {
  score_delta?: number
  state_update?: StateUpdate
  vitals_update?: Partial<VitalSigns>
  toast?: string
}

export interface DecisionOption {
  id: string
  label: string
  target_hotspot: HotspotId
  effects?: NodeEffects
  documentation_defaults?: Record<string, { value: string; source: string }>
  next_node_id: string
}

export interface NodeTimeout {
  seconds: number
  on_timeout_effects: NodeEffects
  next_node_id: string
}
interface BaseNode {
  id: string
  text: string
}

export interface MessageNode extends BaseNode {
  type: 'message'
  next_node_id: string
}

export interface DecisionNode extends BaseNode {
  type: 'decision'
  options: DecisionOption[]
  timeout?: NodeTimeout
}

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

export interface GateNode extends BaseNode {
  type: 'gate'
  description: string
  gate_requirements: GateRequirements
  feedback_blocked: string
  feedback_success?: string
  effects_on_pass?: GatePassEffects
  next_node_id: string
}

export interface DebriefConfig {
  show_score: boolean
  show_decision_path: boolean
  highlight_missed_docs: boolean
  export_log: boolean
}

export interface EndNode extends BaseNode {
  type: 'end'
  debrief_config: DebriefConfig
}

export type ScenarioNode = MessageNode | DecisionNode | GateNode | EndNode

export type LogEventType = 'NODE_ENTER' | 'HOTSPOT_INTERACTION' | 'OPTION_SELECTED' | 'EHR_SUBMIT' | 'VITALS_CHANGE'

export interface LoggingConfig {
  enabled: boolean
  log_events: LogEventType[]
  export_format: 'JSON' | 'CSV'
}

export interface Scenario {
  schema_version: string
  scenario_meta: ScenarioMeta
  initial_state: InitialScenarioState
  hotspots: Hotspot[]
  ehr_config: EHRConfig
  rules: ScenarioRules
  nodes: ScenarioNode[]
  logging: LoggingConfig
}

export interface SimulatorState {
  current_node_id: string
  score: number
  time_elapsed: number
  vitals: VitalSigns
  flags: ScenarioFlags
  decision_path: string[]
  completed: boolean
}

export type EHRFormValues = Record<string, Record<string, string>>
