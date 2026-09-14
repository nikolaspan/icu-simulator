import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { advanceMessage, selectDecision, passGate, getNode, getActiveGlobalEffects, applyEffects } from '../src/engine/scenarioEngine.ts'
import { validateScenario } from '../src/engine/scenarioValidation.ts'
import { loadScenario } from '../src/engine/scenarioLoader.ts'
import { createSession, applySessionResult, updateSessionClock, getTimeoutRemaining, appendLogs } from '../src/engine/session.ts'
import { logHotspotInteraction, logEhrSubmit, logOptionSelected, createSessionExport, createLogCsv } from '../src/engine/logger.ts'
import { getDocumentationItems, getPathLabel } from '../src/components/debrief/debriefSummary.ts'

const scenario = JSON.parse(readFileSync(new URL('../public/scenarios/hypoxia.json', import.meta.url), 'utf8'))
const docs = { assessment_form: { observation: 'Cyanosis and rapid breathing' }, intervention_form: { fiO2_setting: '100%' }, communication_log: { recipient: 'On-duty physician', outcome: 'Patient reviewed' } }
const isAlarm = session => getActiveGlobalEffects(scenario, session.state).some(effect => effect.type === 'ui_visual' && effect.state === 'blinking_red')
function message(session) { return applySessionResult(session, advanceMessage(scenario, session.state), [], session.clockTime) }
function choose(session, id) {
  const node = getNode(scenario, session.state.current_node_id)
  const option = node.options.find(item => item.id === id)
  session = appendLogs(session, [logHotspotInteraction(session.state, option.target_hotspot)])
  return applySessionResult(session, selectDecision(scenario, session.state, id), [logOptionSelected(session.state, option.id, option.label, option.target_hotspot)], session.clockTime)
}
function save(session, values) {
  const result = passGate(scenario, session.state, values)
  return applySessionResult({ ...session, ehrValues: values }, result, [logEhrSubmit(session.state, values, result.state !== session.state)], session.clockTime)
}

test('complete assessment, intervention, both EHR gates, escalation, export and reset path', () => {
  validateScenario(scenario)
  let session = createSession(scenario, 0)
  assert.equal(session.state.vitals.spo2, 88)
  assert.equal(session.state.score, 100)
  assert.equal(isAlarm(session), true)
  assert.equal(session.logs.length, 1)
  session = message(session)
  assert.equal(getTimeoutRemaining(session), 30)
  session = choose(session, 'opt_assess')
  assert.equal(session.state.score, 110)
  assert.equal(session.state.flags.assessment_complete, true)
  session = choose(session, 'opt_increase_o2')
  assert.equal(session.state.score, 130)
  assert.equal(session.state.vitals.spo2, 94)
  assert.equal(session.state.vitals.hr, 100)
  assert.equal(isAlarm(session), false)
  const gateId = session.state.current_node_id
  for (const values of [{}, { assessment_form: { observation: '   ' } }, { assessment_form: docs.assessment_form }]) {
    session = save(session, values)
    assert.equal(session.state.current_node_id, gateId)
    assert.equal(session.state.score, 130)
    assert.deepEqual(session.ehrValues, values)
  }
  session = save(session, { assessment_form: docs.assessment_form, intervention_form: docs.intervention_form })
  assert.equal(session.state.score, 140)
  assert.equal(session.state.current_node_id, 'n5_reassessment')
  session = message(session)
  session = choose(session, 'opt_call_doc')
  assert.equal(session.state.score, 150)
  session = save(session, { ...session.ehrValues, communication_log: { recipient: 'On-duty physician' } })
  assert.equal(session.state.current_node_id, 'n7_gate_documentation_2')
  session = save(session, docs)
  assert.equal(session.state.completed, true)
  assert.equal(session.state.score, 155)
  assert.deepEqual(getDocumentationItems(scenario, session.state).map(item => item.complete), [true, true])
  const nodeEntries = session.logs.filter(entry => entry.event_type === 'NODE_ENTER')
  assert.equal(nodeEntries.length, 8)
  assert.equal(new Set(session.logs.map(entry => entry.id)).size, session.logs.length)
  assert.equal(session.logs.filter(entry => entry.event_type === 'VITALS_CHANGE').length, 1)
  assert.equal(session.logs.filter(entry => entry.event_type === 'OPTION_SELECTED').length, 3)
  const exported = createSessionExport(scenario.scenario_meta.id, scenario.scenario_meta.title, session.state, session.logs)
  assert.equal(JSON.parse(JSON.stringify(exported)).final_score, 155)
  assert.equal(createLogCsv(session.logs).split('\n').length, session.logs.length + 1)
  assert.ok(session.state.decision_path.every(id => !getPathLabel(scenario, id).detail.startsWith('n4_')))
  const stopped = updateSessionClock(session, 999999)
  assert.equal(stopped.session, session)
  const fresh = createSession(scenario, 100000)
  assert.deepEqual(fresh.ehrValues, {})
  assert.equal(fresh.state.time_elapsed, 0)
  assert.equal(fresh.state.score, 100)
  assert.equal(fresh.logs.length, 1)
  assert.equal(getTimeoutRemaining(fresh), null)
  assert.notEqual(fresh.id, session.id)
  assert.ok(Object.values(fresh.state.flags).every(value => value === false))
})

test('30-second deadline applies exactly once, including delayed/background callbacks', () => {
  let session = message(createSession(scenario, 0))
  session = updateSessionClock(session, 29999).session
  assert.equal(getTimeoutRemaining(session), 1)
  assert.equal(session.state.score, 100)
  session = updateSessionClock(session, 30000).session
  assert.equal(session.state.score, 90)
  assert.equal(session.state.time_elapsed, 30)
  assert.equal(session.state.vitals.spo2, 85)
  assert.equal(session.state.vitals.hr, 120)
  assert.equal(session.state.current_node_id, 'n3_intervention')
  assert.equal(getTimeoutRemaining(session), null)
  const logCount = session.logs.length
  session = updateSessionClock(session, 31000).session
  assert.equal(session.logs.length, logCount)
  assert.equal(session.state.decision_path.filter(id => id.endsWith(':timeout')).length, 1)
  assert.equal(session.logs.filter(log => log.event_type === 'VITALS_CHANGE').length, 1)
  const delayed = updateSessionClock(message(createSession(scenario, 0)), 45000).session
  assert.equal(delayed.state.score, 90)
  assert.equal(delayed.state.time_elapsed, 45)
})

test('all twelve supplied decision branches complete without changing the scenario scoring', () => {
  for (const first of ['opt_assess', 'opt_check_monitor', 'timeout']) {
    for (const intervention of ['opt_increase_o2', 'opt_do_nothing']) {
      for (const escalation of ['opt_call_doc', 'opt_wait']) {
        let session = message(createSession(scenario, 0))
        session = first === 'timeout' ? updateSessionClock(session, 30000).session : choose(session, first)
        session = choose(session, intervention)
        session = save(session, docs)
        session = message(session)
        session = choose(session, escalation)
        if (escalation === 'opt_call_doc') session = save(session, docs)
        const expected = 100 + (first === 'opt_assess' ? 10 : first === 'timeout' ? -10 : 5) + (intervention === 'opt_increase_o2' ? 20 : -20) + 10 + (escalation === 'opt_call_doc' ? 15 : 0)
        assert.equal(session.state.score, expected)
        assert.equal(session.state.completed, true)
        assert.equal(getDocumentationItems(scenario, session.state)[1].complete, escalation === 'opt_call_doc')
      }
    }
  }
})

test('gates without flags are reported from actual transitions and filtering respects logging config', () => {
  const copy = structuredClone(scenario)
  const gate = copy.nodes.find(node => node.type === 'gate')
  delete gate.effects_on_pass
  copy.nodes = [gate, copy.nodes.find(node => node.id === gate.next_node_id), ...copy.nodes.filter(node => node.id !== gate.id && node.id !== gate.next_node_id)]
  copy.logging.log_events = ['EHR_SUBMIT']
  validateScenario(copy)
  let session = createSession(copy, 0)
  assert.equal(session.logs.length, 0)
  session = applySessionResult(session, passGate(copy, session.state, docs))
  assert.equal(getDocumentationItems(copy, session.state)[0].complete, true)
  assert.equal(session.logs.length, 0)
  copy.logging.enabled = false
  session = appendLogs(session, [logEhrSubmit(session.state, docs, true)])
  assert.equal(session.logs.length, 0)
})

test('malformed node references, options, gates, timeouts, effects and rules are rejected at load time', () => {
  const mutations = [
    data => { data.nodes = [] },
    data => { data.nodes[1].options = [] },
    data => { data.nodes[1].options = undefined },
    data => { data.nodes[0].next_node_id = 'missing' },
    data => { data.nodes[1].options[0].next_node_id = 'missing' },
    data => { data.nodes[1].timeout.next_node_id = 'missing' },
    data => { data.nodes[1].timeout.seconds = 0 },
    data => { data.nodes[1].timeout.on_timeout_effects.vitals_update.hr = 'fast' },
    data => { data.nodes[1].options[0].target_hotspot = 'unknown' },
    data => { data.nodes[1].options[0].effects.score_delta = 'ten' },
    data => { data.nodes[1].options[0].effects.state_update = { 'flags.test': 'yes' } },
    data => { data.nodes[1].options[0].id = data.nodes[0].id },
    data => { data.nodes[1].options[1].id = data.nodes[1].options[0].id },
    data => { data.nodes[3].gate_requirements.required_forms[0].form_id = 'missing' },
    data => { data.nodes[3].gate_requirements.required_forms[0].fields = ['missing'] },
    data => { data.nodes[3].gate_requirements.required_forms = [] },
    data => { data.nodes[1].id = data.nodes[0].id },
    data => { data.ehr_config.forms.assessment_form.fields = ['observation', 'observation'] },
    data => { data.initial_state.flags.assessment_complete = 'false' },
    data => { data.rules.global_rules[0].condition = {} },
    data => { data.rules.global_rules[0].condition = { 'vitals.spo2': { unknown: 90 } } },
    data => { data.rules.global_rules[0].effects[0].target = 'unknown' },
    data => { data.logging.log_events = ['invalid'] },
    data => { data.nodes.at(-1).debrief_config.show_score = 'yes' },
  ]
  for (const mutate of mutations) {
    const data = structuredClone(scenario)
    mutate(data)
    assert.throws(() => validateScenario(data), /Invalid scenario/)
  }
})

test('load failures, malformed JSON, cancellation and successful JSON are handled', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  await assert.rejects(loadScenario('/test.json'), /connect/)
  globalThis.fetch = async () => new Response('', { status: 404 })
  await assert.rejects(loadScenario('/test.json'), /404/)
  globalThis.fetch = async () => new Response('not json')
  await assert.rejects(loadScenario('/test.json'), /valid JSON/)
  globalThis.fetch = async () => new Response(JSON.stringify(scenario))
  assert.equal((await loadScenario('/test.json')).scenario_meta.id, scenario.scenario_meta.id)
  const controller = new AbortController()
  controller.abort()
  globalThis.fetch = async () => { throw controller.signal.reason }
  await assert.rejects(loadScenario('/test.json', controller.signal), { name: 'AbortError' })
})

test('vital changes only log changed values and EHR log snapshots remain immutable', () => {
  const session = createSession(scenario, 0)
  assert.equal(applyEffects(session.state, { vitals_update: { spo2: 88 } }).vitalsChanged, false)
  const values = { note: { value: 'Text, with "quotes"\nand a newline' } }
  const entry = logEhrSubmit(session.state, values, false)
  values.note.value = 'changed'
  assert.equal(entry.details.forms.note.value, 'Text, with "quotes"\nand a newline')
  assert.ok(createLogCsv([entry]).includes('""'))
})

test('completed actions initialize known EHR values once and leave judgments manual', () => {
  let session = choose(message(createSession(scenario, 0)), 'opt_assess')
  assert.deepEqual(session.ehrValues, {})
  session = choose(session, 'opt_increase_o2')
  assert.equal(session.ehrValues.intervention_form.fiO2_setting, '100%')
  assert.equal(session.ehrAutofill['intervention_form.fiO2_setting'], 'ventilator intervention')
  assert.equal(session.ehrValues.assessment_form?.observation, undefined)
  assert.equal(passGate(scenario, session.state, session.ehrValues).state.current_node_id, session.state.current_node_id)
  session = save(session, { ...session.ehrValues, assessment_form: docs.assessment_form })
  session = choose(message(session), 'opt_call_doc')
  assert.equal(session.ehrValues.communication_log.recipient, 'On-duty physician')
  assert.equal(session.ehrValues.communication_log.outcome, undefined)
  assert.equal(session.ehrAutofill['communication_log.recipient'], 'physician call')
  session = save(session, { ...session.ehrValues, communication_log: { ...session.ehrValues.communication_log, outcome: 'Reviewed' } })
  assert.equal(session.state.score, 155)
  assert.deepEqual(createSession(scenario, 0).ehrAutofill, {})
})

test('autofill preserves existing user values, including deliberate clearing after initialization', () => {
  let session = choose(message(createSession(scenario, 0)), 'opt_assess')
  session = { ...session, ehrValues: { intervention_form: { fiO2_setting: 'User-entered setting' } } }
  session = choose(session, 'opt_increase_o2')
  assert.equal(session.ehrValues.intervention_form.fiO2_setting, 'User-entered setting')
  assert.deepEqual(session.ehrAutofill, {})
  session = save(session, { intervention_form: { fiO2_setting: '' } })
  session = updateSessionClock(session, 5000).session
  assert.equal(session.ehrValues.intervention_form.fiO2_setting, '')
  assert.equal(session.state.score, 130)
  let skipped = choose(message(createSession(scenario, 0)), 'opt_assess')
  skipped = choose(skipped, 'opt_do_nothing')
  assert.deepEqual(skipped.ehrValues, {})
})

test('autofill metadata supports other forms and is validated against the scenario schema', () => {
  const copy = structuredClone(scenario)
  copy.ehr_config.forms.custom_record = { title: 'Device record', fields: ['setting'] }
  copy.nodes[2].options[0].documentation_defaults = { 'custom_record.setting': { value: 'Known setting', source: 'completed device action' } }
  validateScenario(copy)
  let session = createSession(copy, 0)
  session = applySessionResult(session, advanceMessage(copy, session.state))
  session = applySessionResult(session, selectDecision(copy, session.state, 'opt_assess'))
  session = applySessionResult(session, selectDecision(copy, session.state, 'opt_increase_o2'))
  assert.equal(session.ehrValues.custom_record.setting, 'Known setting')
  for (const invalid of [
    { 'unknown.field': { value: '100%', source: 'device' } },
    { 'custom_record.setting': { value: '', source: 'device' } },
    { 'custom_record.setting': { value: '100%', source: '' } },
  ]) {
    copy.nodes[2].options[0].documentation_defaults = invalid
    assert.throws(() => validateScenario(copy), /Invalid scenario/)
  }
})
