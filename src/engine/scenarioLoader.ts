import type {
  Scenario,
} from './types'

/*
 * ============================================================
 * BASIC RUNTIME VALIDATION
 * ============================================================
 *
 * TypeScript types disappear when the application runs.
 *
 * Because scenario files come from JSON, we perform some
 * basic runtime validation before allowing a scenario into
 * the simulator.
 */

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function requireObject(
  value: unknown,
  name: string,
): asserts value is Record<
  string,
  unknown
> {
  if (!isObject(value)) {
    throw new Error(
      `Invalid scenario: "${name}" must be an object.`,
    )
  }
}

function requireString(
  value: unknown,
  name: string,
): asserts value is string {
  if (
    typeof value !==
      'string' ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Invalid scenario: "${name}" must be a non-empty string.`,
    )
  }
}

function requireNumber(
  value: unknown,
  name: string,
): asserts value is number {
  if (
    typeof value !==
      'number' ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Invalid scenario: "${name}" must be a valid number.`,
    )
  }
}

function requireArray(
  value: unknown,
  name: string,
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid scenario: "${name}" must be an array.`,
    )
  }
}

/*
 * ============================================================
 * SCENARIO VALIDATION
 * ============================================================
 */

function validateScenario(
  data: unknown,
): asserts data is Scenario {
  requireObject(
    data,
    'scenario',
  )

  /*
   * Schema version
   */

  requireString(
    data.schema_version,
    'schema_version',
  )

  /*
   * Metadata
   */

  requireObject(
    data.scenario_meta,
    'scenario_meta',
  )

  requireString(
    data.scenario_meta.id,
    'scenario_meta.id',
  )

  requireString(
    data.scenario_meta.title,
    'scenario_meta.title',
  )

  requireString(
    data.scenario_meta.description,
    'scenario_meta.description',
  )

  requireNumber(
    data.scenario_meta
      .estimated_duration_minutes,
    'scenario_meta.estimated_duration_minutes',
  )

  requireString(
    data.scenario_meta.difficulty,
    'scenario_meta.difficulty',
  )

  requireArray(
    data.scenario_meta
      .learning_goals,
    'scenario_meta.learning_goals',
  )

  /*
   * Initial state
   */

  requireObject(
    data.initial_state,
    'initial_state',
  )

  requireNumber(
    data.initial_state
      .time_elapsed,
    'initial_state.time_elapsed',
  )

  requireNumber(
    data.initial_state
      .current_score,
    'initial_state.current_score',
  )

  requireObject(
    data.initial_state.flags,
    'initial_state.flags',
  )

  /*
   * Vital signs
   */

  requireObject(
    data.initial_state.vitals,
    'initial_state.vitals',
  )

  requireNumber(
    data.initial_state
      .vitals.hr,
    'initial_state.vitals.hr',
  )

  requireNumber(
    data.initial_state
      .vitals.spo2,
    'initial_state.vitals.spo2',
  )

  requireNumber(
    data.initial_state
      .vitals.rr,
    'initial_state.vitals.rr',
  )

  requireString(
    data.initial_state
      .vitals.bp,
    'initial_state.vitals.bp',
  )

  requireNumber(
    data.initial_state
      .vitals.temp,
    'initial_state.vitals.temp',
  )

  /*
   * UI initial state
   */

  requireObject(
    data.initial_state.ui,
    'initial_state.ui',
  )

  requireArray(
    data.initial_state.ui
      .active_hotspots,
    'initial_state.ui.active_hotspots',
  )

  if (
    typeof data.initial_state
      .ui.monitor_alert !==
    'boolean'
  ) {
    throw new Error(
      'Invalid scenario: "initial_state.ui.monitor_alert" must be boolean.',
    )
  }

  /*
   * Hotspots
   */

  requireArray(
    data.hotspots,
    'hotspots',
  )

  if (
    data.hotspots.length <
    1
  ) {
    throw new Error(
      'Invalid scenario: at least one hotspot is required.',
    )
  }

  /*
   * EHR configuration
   */

  requireObject(
    data.ehr_config,
    'ehr_config',
  )

  requireObject(
    data.ehr_config.forms,
    'ehr_config.forms',
  )

  /*
   * Rules
   */

  requireObject(
    data.rules,
    'rules',
  )

  requireArray(
    data.rules.global_rules,
    'rules.global_rules',
  )

  /*
   * Nodes
   */

  requireArray(
    data.nodes,
    'nodes',
  )

  if (
    data.nodes.length === 0
  ) {
    throw new Error(
      'Invalid scenario: the scenario contains no nodes.',
    )
  }

  /*
   * Every node needs at least:
   *
   * id
   * type
   * text
   */

  for (
    const [
      index,
      node,
    ] of data.nodes.entries()
  ) {
    requireObject(
      node,
      `nodes[${index}]`,
    )

    requireString(
      node.id,
      `nodes[${index}].id`,
    )

    requireString(
      node.type,
      `nodes[${index}].type`,
    )

    requireString(
      node.text,
      `nodes[${index}].text`,
    )

    const validTypes = [
      'message',
      'decision',
      'gate',
      'end',
    ]

    if (
      !validTypes.includes(
        node.type,
      )
    ) {
      throw new Error(
        `Invalid scenario: unsupported node type "${node.type}".`,
      )
    }
  }

  /*
   * Prevent duplicate node IDs.
   */

  const nodeIds =
    data.nodes.map(
      (node) => {
        requireObject(
          node,
          'node',
        )

        return node.id
      },
    )

  const uniqueNodeIds =
    new Set(nodeIds)

  if (
    uniqueNodeIds.size !==
    nodeIds.length
  ) {
    throw new Error(
      'Invalid scenario: duplicate node IDs detected.',
    )
  }

  /*
   * Logging configuration
   */

  requireObject(
    data.logging,
    'logging',
  )

  if (
    typeof data.logging
      .enabled !==
    'boolean'
  ) {
    throw new Error(
      'Invalid scenario: "logging.enabled" must be boolean.',
    )
  }

  requireArray(
    data.logging
      .log_events,
    'logging.log_events',
  )

  requireString(
    data.logging
      .export_format,
    'logging.export_format',
  )
}

/*
 * ============================================================
 * LOAD SCENARIO
 * ============================================================
 */

export async function loadScenario(
  path: string,
): Promise<Scenario> {
  let response: Response

  try {
    response =
      await fetch(path, {
        cache: 'no-store',
      })
  } catch {
    throw new Error(
      'Unable to connect to the scenario file.',
    )
  }

  if (!response.ok) {
    throw new Error(
      `Unable to load scenario (${response.status}).`,
    )
  }

  let data: unknown

  try {
    data =
      await response.json()
  } catch {
    throw new Error(
      'The scenario file does not contain valid JSON.',
    )
  }

  validateScenario(data)

  return data
}

/*
 * ============================================================
 * DEFAULT SCENARIO
 * ============================================================
 */

export function loadDefaultScenario() {
  return loadScenario(
    '/scenarios/hypoxia.json',
  )
}