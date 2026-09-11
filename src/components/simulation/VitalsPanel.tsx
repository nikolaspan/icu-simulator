import type { VitalSigns } from '../../engine/types'

interface VitalsPanelProps { vitals: VitalSigns; alarm?: boolean; title?: string }
export default function VitalsPanel({ vitals, alarm = false, title = 'Live vitals' }: VitalsPanelProps) {
  const items = [
    { label: 'SpO₂', value: vitals.spo2, unit: '%', detail: alarm ? 'Alarm active' : 'Oxygen saturation' },
    { label: 'HR', value: vitals.hr, unit: 'bpm', detail: 'Heart rate' },
    { label: 'RR', value: vitals.rr, unit: '/min', detail: 'Respiratory rate' },
    { label: 'BP', value: vitals.bp, unit: 'mmHg', detail: 'Blood pressure' },
    { label: 'Temperature', value: vitals.temp, unit: '°C', detail: 'Body temperature' },
  ]
  return (
    <section className="vitals-panel" aria-label={title}>
      <div className="panel-heading"><h2>{title}</h2><span className="eyebrow">Bed 01</span></div>
      <dl className="vitals-grid">
        {items.map((item, index) => (
          <div key={item.label} className={`vital-card${index === 0 && alarm ? ' vital-danger' : ''}`}>
            <dt>{item.label}</dt><dd><strong>{item.value}</strong> <small>{item.unit}</small><span>{item.detail}</span></dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
