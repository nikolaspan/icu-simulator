import { useId, useMemo } from 'react'
import type { LogEntry } from '../../engine/logger'
import { formatTime } from '../../utils/format'

export default function VitalTrend({ initial, logs }: { initial: number; logs: LogEntry[] }) {
  const titleId = useId()
  const points = useMemo(() => {
    const readings = [{ value: initial, label: 'Start' }]
    for (const log of logs) {
      if (log.event_type !== 'VITALS_CHANGE') continue
      const changes = log.details.changes as Record<string, { to?: unknown }> | undefined
      if (typeof changes?.spo2?.to === 'number') readings.push({ value: changes.spo2.to, label: formatTime(log.time_elapsed) })
    }
    return readings
  }, [initial, logs])
  const low = Math.min(80, ...points.map(point => point.value)) - 2
  const high = Math.max(100, ...points.map(point => point.value)) + 2
  const x = (index: number) => 46 + index / Math.max(1, points.length - 1) * 426
  const y = (value: number) => 24 + (high - value) / (high - low) * 96
  return <section className="vital-trend" aria-labelledby={titleId}>
    <div className="panel-heading"><h3 id={titleId}>SpO₂ during this session</h3><span>Recorded changes</span></div>
    <svg viewBox="0 0 520 157" role="img" aria-label={points.map(point => `${point.label}: ${point.value}%`).join('; ')}>
      <line x1="40" x2="480" y1={y(90)} y2={y(90)} className="trend-threshold" />
      <text x="4" y={y(90) + 4}>90%</text>
      <polyline points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')} className="trend-line" />
      {points.map((point, index) => <g key={index}>
        <circle cx={x(index)} cy={y(point.value)} r="4" className={point.value < 90 ? 'trend-low' : 'trend-point'} />
        {(index === 0 || index === points.length - 1) && <><text x={x(index)} y={y(point.value) - 11} textAnchor="middle">{point.value}%</text><text x={x(index)} y="147" textAnchor="middle">{point.label}</text></>}
      </g>)}
    </svg>
    <p>{points.length === 1 ? 'Initial reading. Changes will appear as the scenario progresses.' : 'Each point is a recorded change, spaced by event. Times show when each change occurred.'}</p>
  </section>
}
