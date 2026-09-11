import type {
  HotspotId,
  LogEventType,
  SimulatorState,
  VitalSigns,
} from './types'

/*
 * ============================================================
 * LOG ENTRY
 * ============================================================
 */

export interface LogEntry {
  id: string

  event_type: LogEventType

  timestamp: string

  time_elapsed: number

  node_id: string

  details: Record<
    string,
    unknown
  >
}

/*
 * ============================================================
 * CREATE UNIQUE LOG ID
 * ============================================================
 */

function createLogId() {
  return crypto.randomUUID()
}

/*
 * ============================================================
 * CREATE LOG ENTRY
 * ============================================================
 */

export function createLogEntry(
  eventType: LogEventType,
  state: SimulatorState,
  details: Record<
    string,
    unknown
  > = {},
): LogEntry {
  return {
    id: createLogId(),

    event_type:
      eventType,

    timestamp:
      new Date().toISOString(),

    time_elapsed:
      state.time_elapsed,

    node_id:
      state.current_node_id,

    details,
  }
}

/*
 * ============================================================
 * NODE ENTER
 * ============================================================
 */

export function logNodeEnter(
  state: SimulatorState,
): LogEntry {
  return createLogEntry(
    'NODE_ENTER',
    state,
    {
      node_id:
        state.current_node_id,

      score:
        state.score,
    },
  )
}

/*
 * ============================================================
 * HOTSPOT INTERACTION
 * ============================================================
 */

export function logHotspotInteraction(
  state: SimulatorState,
  hotspot: HotspotId,
): LogEntry {
  return createLogEntry(
    'HOTSPOT_INTERACTION',
    state,
    {
      hotspot,
    },
  )
}

/*
 * ============================================================
 * OPTION SELECTED
 * ============================================================
 */

export function logOptionSelected(
  state: SimulatorState,
  optionId: string,
  optionLabel: string,
  hotspot: HotspotId,
): LogEntry {
  return createLogEntry(
    'OPTION_SELECTED',
    state,
    {
      option_id:
        optionId,

      option_label:
        optionLabel,

      target_hotspot:
        hotspot,

      score:
        state.score,
    },
  )
}

/*
 * ============================================================
 * EHR SUBMIT
 * ============================================================
 */

export function logEhrSubmit(
  state: SimulatorState,
  values: Record<
    string,
    Record<string, string>
  >,
  gatePassed: boolean,
): LogEntry {
  return createLogEntry(
    'EHR_SUBMIT',
    state,
    {
      gate_passed:
        gatePassed,

      forms:
        structuredClone(
          values,
        ),
    },
  )
}

/*
 * ============================================================
 * VITALS CHANGE
 * ============================================================
 */

export function logVitalsChange(
  state: SimulatorState,
  previousVitals: VitalSigns,
  nextVitals: VitalSigns,
): LogEntry {
  const changes:
    Record<
      string,
      {
        from:
          | string
          | number

        to:
          | string
          | number
      }
    > = {}

  const keys: Array<
    keyof VitalSigns
  > = [
    'hr',
    'spo2',
    'rr',
    'bp',
    'temp',
  ]

  for (
    const key of keys
  ) {
    if (
      previousVitals[
        key
      ] ===
      nextVitals[
        key
      ]
    ) {
      continue
    }

    changes[key] = {
      from:
        previousVitals[
          key
        ],

      to:
        nextVitals[
          key
        ],
    }
  }

  return createLogEntry(
    'VITALS_CHANGE',
    state,
    {
      changes,
    },
  )
}

/*
 * ============================================================
 * EXPORT SESSION DATA
 * ============================================================
 */

export interface SessionExport {
  exported_at: string

  scenario_id: string

  scenario_title: string

  final_score: number

  elapsed_seconds: number

  completed: boolean

  decision_path: string[]

  flags: Record<
    string,
    boolean
  >

  final_vitals:
    VitalSigns

  logs: LogEntry[]
}

/*
 * ============================================================
 * CREATE SESSION EXPORT OBJECT
 * ============================================================
 */

export function createSessionExport(
  scenarioId: string,
  scenarioTitle: string,
  state: SimulatorState,
  logs: LogEntry[],
): SessionExport {
  return {
    exported_at:
      new Date().toISOString(),

    scenario_id:
      scenarioId,

    scenario_title:
      scenarioTitle,

    final_score:
      state.score,

    elapsed_seconds:
      state.time_elapsed,

    completed:
      state.completed,

    decision_path: [
      ...state.decision_path,
    ],

    flags: {
      ...state.flags,
    },

    final_vitals: {
      ...state.vitals,
    },

    logs: [
      ...logs,
    ],
  }
}

/*
 * ============================================================
 * DOWNLOAD JSON
 * ============================================================
 */

export function downloadSessionJson(
  scenarioId: string,
  scenarioTitle: string,
  state: SimulatorState,
  logs: LogEntry[],
) {
  const session =
    createSessionExport(
      scenarioId,
      scenarioTitle,
      state,
      logs,
    )

  const json =
    JSON.stringify(
      session,
      null,
      2,
    )

  const blob =
    new Blob(
      [json],
      {
        type: 'application/json',
      },
    )

  const url =
    URL.createObjectURL(
      blob,
    )

  const anchor =
    document.createElement(
      'a',
    )

  anchor.href = url

  anchor.download =
    `${scenarioId}-session-log.json`

  document.body.appendChild(
    anchor,
  )

  anchor.click()

  anchor.remove()

  URL.revokeObjectURL(
    url,
  )
}

/*
 * ============================================================
 * CSV HELPERS
 * ============================================================
 */

function escapeCsv(
  value: unknown,
): string {
  const text =
    typeof value ===
    'string'
      ? value
      : JSON.stringify(
          value,
        )

  return `"${text.replaceAll(
    '"',
    '""',
  )}"`
}

/*
 * ============================================================
 * CREATE CSV
 * ============================================================
 */

export function createLogCsv(
  logs: LogEntry[],
): string {
  const header = [
    'id',
    'event_type',
    'timestamp',
    'time_elapsed',
    'node_id',
    'details',
  ]

  const rows =
    logs.map(
      (entry) => [
        entry.id,
        entry.event_type,
        entry.timestamp,
        String(
          entry.time_elapsed,
        ),
        entry.node_id,
        JSON.stringify(
          entry.details,
        ),
      ],
    )

  return [
    header,
    ...rows,
  ]
    .map((row) =>
      row
        .map(escapeCsv)
        .join(','),
    )
    .join('\n')
}

/*
 * ============================================================
 * DOWNLOAD CSV
 * ============================================================
 */

export function downloadLogCsv(
  scenarioId: string,
  logs: LogEntry[],
) {
  const csv =
    createLogCsv(
      logs,
    )

  const blob =
    new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8',
      },
    )

  const url =
    URL.createObjectURL(
      blob,
    )

  const anchor =
    document.createElement(
      'a',
    )

  anchor.href = url

  anchor.download =
    `${scenarioId}-session-log.csv`

  document.body.appendChild(
    anchor,
  )

  anchor.click()

  anchor.remove()

  URL.revokeObjectURL(
    url,
  )
}