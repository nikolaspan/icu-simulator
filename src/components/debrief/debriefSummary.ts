import type { Scenario, SimulatorState } from '../../engine/types'

export function getDocumentationItems(scenario: Scenario, state: SimulatorState) {
  return scenario.nodes.filter(node => node.type === 'gate').map(gate => ({
    id: gate.id,
    label: gate.text,
    // Passing is a transition out of the gate, even if no flag effects were configured.
    complete: state.decision_path.some((id, index) => id === gate.id && state.decision_path[index + 1] === gate.next_node_id),
    fields: gate.gate_requirements.required_forms,
  }))
}

export function getPathLabel(scenario: Scenario, pathItem: string) {
  if (pathItem.endsWith(':timeout')) {
    const node = scenario.nodes.find(item => item.id === pathItem.slice(0, -8))
    return { title: 'Response timeout', detail: node?.text ?? 'The response deadline expired.', type: 'warning' }
  }
  const node = scenario.nodes.find(item => item.id === pathItem)
  if (node) {
    const titles = { message: 'Scenario update', decision: 'Decision point', gate: 'Documentation required', end: 'Scenario complete' }
    return { title: titles[node.type], detail: node.text, type: node.type === 'end' ? 'complete' : node.type }
  }
  for (const node of scenario.nodes) {
    if (node.type !== 'decision') continue
    const option = node.options.find(item => item.id === pathItem)
    if (option) return { title: 'Action selected', detail: option.label, type: 'action' }
  }
  return { title: 'Scenario event', detail: 'Additional session activity. Details are available in the exported log.', type: 'message' }
}
