import type { Scenario } from './types'

// JSON is unknown until every runtime field and cross-reference has been checked.
type Data = Record<string, unknown>
function fail(path: string, message: string): never {
  throw new Error(`Invalid scenario: ${path} ${message}.`)
}
function object(value: unknown, path: string): asserts value is Data {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object')
}
function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'must be non-empty text')
}
function number(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'must be a finite number')
}
function boolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== 'boolean') fail(path, 'must be true or false')
}
function array(value: unknown, path: string, nonempty = false): asserts value is unknown[] {
  if (!Array.isArray(value) || (nonempty && !value.length)) fail(path, 'must be an array' + (nonempty ? ' with at least one entry' : ''))
}
function strings(value: unknown, path: string, nonempty = false): asserts value is string[] {
  array(value, path, nonempty)
  value.forEach((item, index) => text(item, `${path}[${index}]`))
  if (new Set(value).size !== value.length) fail(path, 'contains duplicate entries')
}
function member(value: unknown, allowed: readonly string[], path: string): asserts value is string {
  text(value, path)
  if (!allowed.includes(value)) fail(path, `has unsupported value "${value}"`)
}
function vitals(value: unknown, path: string, partial = false) {
  object(value, path)
  const keys = ['hr', 'spo2', 'rr', 'bp', 'temp']
  for (const key of partial ? Object.keys(value) : keys) {
    if (!keys.includes(key)) fail(`${path}.${key}`, 'is not a supported vital sign')
    if (key === 'bp') text(value[key], `${path}.${key}`)
    else number(value[key], `${path}.${key}`)
  }
}
function effects(value: unknown, path: string) {
  if (value === undefined) return
  object(value, path)
  if (value.score_delta !== undefined) number(value.score_delta, `${path}.score_delta`)
  if (value.toast !== undefined) text(value.toast, `${path}.toast`)
  if (value.vitals_update !== undefined) vitals(value.vitals_update, `${path}.vitals_update`, true)
  if (value.state_update !== undefined) {
    object(value.state_update, `${path}.state_update`)
    for (const [key, flag] of Object.entries(value.state_update)) {
      if (!/^flags\.[^.]+$/.test(key)) fail(`${path}.${key}`, 'must name a supported flag path')
      boolean(flag, `${path}.${key}`)
    }
  }
}

export function validateScenario(data: unknown): asserts data is Scenario {
  object(data, 'scenario')
  text(data.schema_version, 'schema_version')
  object(data.scenario_meta, 'scenario_meta')
  for (const key of ['id', 'title', 'description', 'difficulty']) text(data.scenario_meta[key], `scenario_meta.${key}`)
  number(data.scenario_meta.estimated_duration_minutes, 'scenario_meta.estimated_duration_minutes')
  strings(data.scenario_meta.learning_goals, 'scenario_meta.learning_goals')

  object(data.initial_state, 'initial_state')
  const initial = data.initial_state
  number(initial.time_elapsed, 'initial_state.time_elapsed')
  if (!Number.isInteger(initial.time_elapsed) || initial.time_elapsed < 0) fail('initial_state.time_elapsed', 'must be a nonnegative whole number')
  number(initial.current_score, 'initial_state.current_score')
  object(initial.flags, 'initial_state.flags')
  Object.entries(initial.flags).forEach(([key, value]) => boolean(value, `initial_state.flags.${key}`))
  vitals(initial.vitals, 'initial_state.vitals')

  array(data.hotspots, 'hotspots', true)
  const hotspotIds: string[] = []
  for (const hotspot of data.hotspots) {
    object(hotspot, 'hotspot')
    member(hotspot.id, ['hs_patient', 'hs_monitor', 'hs_ventilator', 'hs_ehr', 'hs_call'], 'hotspot.id')
    if (hotspotIds.includes(hotspot.id)) fail('hotspots', 'contains duplicate IDs')
    hotspotIds.push(hotspot.id)
    text(hotspot.label, 'hotspot.label')
  }
  object(initial.ui, 'initial_state.ui')
  strings(initial.ui.active_hotspots, 'initial_state.ui.active_hotspots')
  initial.ui.active_hotspots.forEach(id => member(id, hotspotIds, 'active_hotspots'))
  boolean(initial.ui.monitor_alert, 'initial_state.ui.monitor_alert')

  object(data.ehr_config, 'ehr_config')
  object(data.ehr_config.forms, 'ehr_config.forms')
  const forms = new Map<string, string[]>()
  for (const [id, form] of Object.entries(data.ehr_config.forms)) {
    if (!id.trim() || id.includes('.')) fail('ehr_config.forms', 'requires non-empty IDs without dots')
    object(form, `forms.${id}`)
    text(form.title, `forms.${id}.title`)
    strings(form.fields, `forms.${id}.fields`, true)
    if (form.fields.some(field => field.includes('.'))) fail(`forms.${id}.fields`, 'must not contain dots')
    forms.set(id, form.fields)
  }

  array(data.nodes, 'nodes', true)
  const ids = new Set<string>()
  const targets: string[] = []
  function target(value: unknown, path: string) {
    text(value, path)
    targets.push(value)
  }
  // Option IDs are globally unique because the exported decision path stores them.
  const pathIds = new Set<string>()
  for (const [index, node] of data.nodes.entries()) {
    const path = `nodes[${index}]`
    object(node, path)
    text(node.id, `${path}.id`)
    if (ids.has(node.id)) fail(path, `duplicates node "${node.id}"`)
    ids.add(node.id)
    text(node.text, `${path}.text`)
    member(node.type, ['message', 'decision', 'gate', 'end'], `${path}.type`)
    if (node.type === 'message' || node.type === 'gate') target(node.next_node_id, `${path}.next_node_id`)
    if (node.type === 'decision') {
      array(node.options, `${path}.options`, true)
      for (const option of node.options) {
        object(option, `${path}.option`)
        text(option.id, `${path}.option.id`)
        if (pathIds.has(option.id)) fail(path, `duplicates option "${option.id}"`)
        pathIds.add(option.id)
        text(option.label, `${path}.option.label`)
        member(option.target_hotspot, hotspotIds, `${path}.option.target_hotspot`)
        effects(option.effects, `${path}.option.effects`)
        target(option.next_node_id, `${path}.option.next_node_id`)
      }
      if (node.timeout !== undefined) {
        object(node.timeout, `${path}.timeout`)
        number(node.timeout.seconds, `${path}.timeout.seconds`)
        if (node.timeout.seconds <= 0) fail(`${path}.timeout.seconds`, 'must be positive')
        object(node.timeout.on_timeout_effects, `${path}.timeout.on_timeout_effects`)
        effects(node.timeout.on_timeout_effects, `${path}.timeout.on_timeout_effects`)
        target(node.timeout.next_node_id, `${path}.timeout.next_node_id`)
      }
    }
    if (node.type === 'gate') {
      text(node.description, `${path}.description`)
      text(node.feedback_blocked, `${path}.feedback_blocked`)
      if (node.feedback_success !== undefined) text(node.feedback_success, `${path}.feedback_success`)
      object(node.gate_requirements, `${path}.gate_requirements`)
      const gate = node.gate_requirements
      member(gate.target_hotspot, hotspotIds, `${path}.gate_requirements.target_hotspot`)
      array(gate.required_forms, `${path}.required_forms`, true)
      const requiredIds = new Set<string>()
      for (const required of gate.required_forms) {
        object(required, `${path}.required_form`)
        text(required.form_id, `${path}.required_form.form_id`)
        if (requiredIds.has(required.form_id)) fail(path, 'contains a duplicate required form')
        requiredIds.add(required.form_id)
        const fields = forms.get(required.form_id)
        if (!fields) fail(path, `references unknown EHR form "${required.form_id}"`)
        strings(required.fields, `${path}.required_form.fields`, true)
        required.fields.forEach(field => member(field, fields, `${path}.required_form.field`))
      }
      effects(node.effects_on_pass, `${path}.effects_on_pass`)
    }
    if (node.type === 'end') {
      object(node.debrief_config, `${path}.debrief_config`)
      for (const key of ['show_score', 'show_decision_path', 'highlight_missed_docs', 'export_log']) boolean(node.debrief_config[key], `${path}.debrief_config.${key}`)
    }
  }
  for (const id of targets) if (!ids.has(id)) fail('nodes', `references missing node "${id}"`)
  for (const id of pathIds) if (ids.has(id) || id.endsWith(':timeout')) fail('options', `has ambiguous ID "${id}"`)
  for (const id of ids) if (id.endsWith(':timeout')) fail('nodes', 'reserves the :timeout suffix for timeout events')

  object(data.rules, 'rules')
  array(data.rules.global_rules, 'rules.global_rules')
  const ruleIds = new Set<string>()
  for (const rule of data.rules.global_rules) {
    object(rule, 'rule')
    text(rule.id, 'rule.id')
    if (ruleIds.has(rule.id)) fail('rules', 'contains duplicate rule IDs')
    ruleIds.add(rule.id)
    object(rule.condition, 'rule.condition')
    if (!Object.keys(rule.condition).length) fail('rule.condition', 'must contain a condition')
    for (const [path, condition] of Object.entries(rule.condition)) {
      member(path, ['vitals.hr', 'vitals.spo2', 'vitals.rr', 'vitals.temp', 'time_elapsed', 'score'], 'rule.condition path')
      object(condition, `condition.${path}`)
      if (!Object.keys(condition).length) fail(`condition.${path}`, 'must contain a comparison')
      for (const [operator, value] of Object.entries(condition)) {
        member(operator, ['lt', 'lte', 'gt', 'gte', 'eq'], 'condition operator')
        number(value, 'condition value')
      }
    }
    array(rule.effects, 'rule.effects', true)
    for (const effect of rule.effects) {
      object(effect, 'rule.effect')
      member(effect.type, ['ui_visual', 'ui_toast'], 'rule.effect.type')
      if (effect.type === 'ui_visual') {
        member(effect.target, hotspotIds, 'rule.effect.target')
        text(effect.state, 'rule.effect.state')
      } else {
        member(effect.style, ['success', 'info', 'warning', 'danger'], 'rule.effect.style')
        text(effect.message, 'rule.effect.message')
      }
    }
  }
  object(data.logging, 'logging')
  boolean(data.logging.enabled, 'logging.enabled')
  strings(data.logging.log_events, 'logging.log_events')
  data.logging.log_events.forEach(event => member(event, ['NODE_ENTER', 'HOTSPOT_INTERACTION', 'OPTION_SELECTED', 'EHR_SUBMIT', 'VITALS_CHANGE'], 'logging.log_events'))
  member(data.logging.export_format, ['JSON', 'CSV'], 'logging.export_format')
}
