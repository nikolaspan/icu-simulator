export function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const fieldLabels: Record<string, string> = {
  observation: 'Observation', skin_color: 'Skin colour', consciousness: 'Consciousness',
  device: 'Device', fiO2_setting: 'FiO₂ setting', flow_rate: 'Flow rate',
  recipient: 'Recipient', reason: 'Reason for communication', outcome: 'Outcome',
}
export function getFieldLabel(field: string) {
  return fieldLabels[field] ?? field.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}
