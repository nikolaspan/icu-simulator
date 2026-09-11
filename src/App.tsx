import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import ICUScene from './components/ICUScene'
import EHRPanel from './components/EHRPanel'
import Debrief from './components/Debrief'

import {
  advanceMessage,
  applyTimeout,
  createInitialState,
  getActiveGlobalEffects,
  getMissingGateFields,
  getNode,
  incrementTime,
  passGate,
  selectDecision,
  type EHRFormValues,
  type EngineResult,
} from './engine/scenarioEngine'

import {
  logEhrSubmit,
  logHotspotInteraction,
  logNodeEnter,
  logOptionSelected,
  logVitalsChange,
  type LogEntry,
} from './engine/logger'

import {
  loadDefaultScenario,
} from './engine/scenarioLoader'

import type {
  GateNode,
  HotspotId,
  LogEventType,
  Scenario,
  SimulatorState,
} from './engine/types'

import './App.css'

interface HotspotInfo {
  title: string
  eyebrow: string
  description: string
}

const hotspotInfo: Record<
  HotspotId,
  HotspotInfo
> = {
  hs_patient: {
    title: 'Patient Assessment',
    eyebrow: 'Patient / Bed',
    description:
      'Inspect the patient and review visible clinical observations.',
  },

  hs_monitor: {
    title: 'Vital Signs Monitor',
    eyebrow: 'Monitor',
    description:
      'Review current vital signs and recent changes in the patient condition.',
  },

  hs_ventilator: {
    title: 'Ventilator',
    eyebrow: 'Respiratory Support',
    description:
      'Review the current respiratory settings and available interventions.',
  },

  hs_ehr: {
    title: 'Electronic Health Record',
    eyebrow: 'EHR Terminal',
    description:
      'Review patient information and document assessments and interventions.',
  },

  hs_call: {
    title: 'Clinical Escalation',
    eyebrow: 'Call Button',
    description:
      'Contact the on-duty physician when clinical escalation is required.',
  },
}

function formatTime(
  totalSeconds: number,
) {
  const minutes =
    Math.floor(
      totalSeconds / 60,
    )

  const seconds =
    totalSeconds % 60

  return `${String(
    minutes,
  ).padStart(
    2,
    '0',
  )}:${String(
    seconds,
  ).padStart(
    2,
    '0',
  )}`
}

function getGateRequiredFields(
  gate: GateNode,
): string[] {
  return gate.gate_requirements
    .required_forms
    .flatMap(
      (requiredForm) =>
        requiredForm.fields.map(
          (field) =>
            `${requiredForm.form_id}.${field}`,
        ),
    )
}

/*
 * Respect the logging configuration
 * inside scenario.json.
 */
function shouldLog(
  scenario: Scenario,
  eventType: LogEventType,
) {
  return (
    scenario.logging.enabled &&
    scenario.logging
      .log_events
      .includes(eventType)
  )
}

function App() {
  /*
   * ==========================================================
   * SCENARIO STATE
   * ==========================================================
   */

  const [
    scenario,
    setScenario,
  ] = useState<Scenario | null>(
    null,
  )

  const [
    simulatorState,
    setSimulatorState,
  ] = useState<
    SimulatorState | null
  >(null)

  const simulatorStateRef =
    useRef<
      SimulatorState | null
    >(null)

  /*
   * ==========================================================
   * SESSION LOG
   * ==========================================================
   */

  const [
    logs,
    setLogs,
  ] = useState<LogEntry[]>(
    [],
  )

  /*
   * ==========================================================
   * INTERFACE STATE
   * ==========================================================
   */

  const [
    selectedHotspot,
    setSelectedHotspot,
  ] = useState<
    HotspotId | null
  >(null)

  const [
    hoveredHotspot,
    setHoveredHotspot,
  ] = useState<
    HotspotId | null
  >(null)

  const [
    toast,
    setToast,
  ] = useState<
    string | null
  >(null)

  const [
    helpOpen,
    setHelpOpen,
  ] = useState(false)

  const [
    ehrOpen,
    setEhrOpen,
  ] = useState(false)

  const [
    ehrValues,
    setEhrValues,
  ] = useState<EHRFormValues>(
    {},
  )

  const [
    loadError,
    setLoadError,
  ] = useState<
    string | null
  >(null)

  const [
    timeoutRemaining,
    setTimeoutRemaining,
  ] = useState<
    number | null
  >(null)

  /*
   * ==========================================================
   * LOAD / RESET SCENARIO
   * ==========================================================
   */

  const initializeScenario =
    useCallback(async () => {
      setLoadError(null)

      try {
        const loadedScenario =
          await loadDefaultScenario()

        const initialState =
          createInitialState(
            loadedScenario,
          )

        setScenario(
          loadedScenario,
        )

        setSimulatorState(
          initialState,
        )

        simulatorStateRef.current =
          initialState

        /*
         * The first event of every
         * session is entering n1.
         */
        if (
          shouldLog(
            loadedScenario,
            'NODE_ENTER',
          )
        ) {
          setLogs([
            logNodeEnter(
              initialState,
            ),
          ])
        } else {
          setLogs([])
        }

        setSelectedHotspot(
          null,
        )

        setHoveredHotspot(
          null,
        )

        setToast(null)

        setTimeoutRemaining(
          null,
        )

        setEhrOpen(false)

        setEhrValues({})
      } catch (error) {
        console.error(error)

        if (
          error instanceof Error
        ) {
          setLoadError(
            error.message,
          )
        } else {
          setLoadError(
            'The scenario could not be loaded.',
          )
        }
      }
    }, [])

  useEffect(() => {
    void initializeScenario()
  }, [initializeScenario])

  useEffect(() => {
    simulatorStateRef.current =
      simulatorState
  }, [simulatorState])

  /*
   * ==========================================================
   * CURRENT NODE
   * ==========================================================
   */

  const currentNodeId =
    simulatorState
      ?.current_node_id ??
    null

  const currentNode =
    useMemo(() => {
      if (
        !scenario ||
        !currentNodeId
      ) {
        return null
      }

      return getNode(
        scenario,
        currentNodeId,
      )
    }, [
      scenario,
      currentNodeId,
    ])

  /*
   * ==========================================================
   * EHR GATE STATE
   * ==========================================================
   */

  const requiredEhrFields =
    useMemo(() => {
      if (
        currentNode?.type !==
        'gate'
      ) {
        return []
      }

      return getGateRequiredFields(
        currentNode,
      )
    }, [currentNode])

  const missingEhrFields =
    useMemo(() => {
      if (
        currentNode?.type !==
        'gate'
      ) {
        return []
      }

      return getMissingGateFields(
        currentNode,
        ehrValues,
      )
    }, [
      currentNode,
      ehrValues,
    ])

  /*
   * ==========================================================
   * COMMON ENGINE RESULT LOGGING
   * ==========================================================
   *
   * Used after decisions/messages where
   * the engine changes state.
   */

  function collectEngineLogs(
    previousState: SimulatorState,
    result: EngineResult,
  ): LogEntry[] {
    if (!scenario) {
      return []
    }

    const newLogs:
      LogEntry[] = []

    /*
     * Record changed vitals.
     */
    if (
      result.vitalsChanged &&
      shouldLog(
        scenario,
        'VITALS_CHANGE',
      )
    ) {
      newLogs.push(
        logVitalsChange(
          previousState,
          previousState.vitals,
          result.state.vitals,
        ),
      )
    }

    /*
     * Record entering the next node.
     */
    if (
      result.state
        .current_node_id !==
        previousState
          .current_node_id &&
      shouldLog(
        scenario,
        'NODE_ENTER',
      )
    ) {
      newLogs.push(
        logNodeEnter(
          result.state,
        ),
      )
    }

    return newLogs
  }

  /*
   * ==========================================================
   * CLOCK
   * ==========================================================
   */

  const scenarioCompleted =
    simulatorState
      ?.completed ??
    true

  useEffect(() => {
    if (scenarioCompleted) {
      return
    }

    const timer =
      window.setInterval(
        () => {
          setSimulatorState(
            (current) => {
              if (!current) {
                return current
              }

              return incrementTime(
                current,
                1,
              )
            },
          )
        },
        1000,
      )

    return () =>
      window.clearInterval(
        timer,
      )
  }, [scenarioCompleted])

  /*
   * ==========================================================
   * DECISION TIMEOUT
   * ==========================================================
   */

  const timeoutSeconds =
    currentNode?.type ===
      'decision'
      ? currentNode.timeout
          ?.seconds
      : undefined

  useEffect(() => {
    if (
      !scenario ||
      !currentNodeId ||
      timeoutSeconds ===
        undefined
    ) {
      setTimeoutRemaining(
        null,
      )

      return
    }

    const nodeId =
      currentNodeId

    setTimeoutRemaining(
      timeoutSeconds,
    )

    const timer =
      window.setInterval(
        () => {
          setTimeoutRemaining(
            (remaining) => {
              if (
                remaining ===
                null
              ) {
                return null
              }

              if (
                remaining > 1
              ) {
                return (
                  remaining - 1
                )
              }

              window.clearInterval(
                timer,
              )

              const currentState =
                simulatorStateRef
                  .current

              if (
                !currentState ||
                currentState
                  .current_node_id !==
                  nodeId
              ) {
                return null
              }

              const result =
                applyTimeout(
                  scenario,
                  currentState,
                )

              const timeoutLogs:
                LogEntry[] = []

              if (
                result.vitalsChanged &&
                shouldLog(
                  scenario,
                  'VITALS_CHANGE',
                )
              ) {
                timeoutLogs.push(
                  logVitalsChange(
                    currentState,
                    currentState.vitals,
                    result.state.vitals,
                  ),
                )
              }

              if (
                result.state
                  .current_node_id !==
                  currentState
                    .current_node_id &&
                shouldLog(
                  scenario,
                  'NODE_ENTER',
                )
              ) {
                timeoutLogs.push(
                  logNodeEnter(
                    result.state,
                  ),
                )
              }

              if (
                timeoutLogs.length >
                0
              ) {
                setLogs(
                  (current) => [
                    ...current,
                    ...timeoutLogs,
                  ],
                )
              }

              simulatorStateRef.current =
                result.state

              setSimulatorState(
                result.state,
              )

              setSelectedHotspot(
                null,
              )

              if (
                result.toast
              ) {
                setToast(
                  result.toast,
                )
              }

              return null
            },
          )
        },
        1000,
      )

    return () =>
      window.clearInterval(
        timer,
      )
  }, [
    scenario,
    currentNodeId,
    timeoutSeconds,
  ])

  /*
   * ==========================================================
   * TOAST DISMISS
   * ==========================================================
   */

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer =
      window.setTimeout(
        () => {
          setToast(null)
        },
        3500,
      )

    return () =>
      window.clearTimeout(
        timer,
      )
  }, [toast])

  /*
   * ==========================================================
   * ESCAPE KEY
   * ==========================================================
   */

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key !==
        'Escape'
      ) {
        return
      }

      if (ehrOpen) {
        setEhrOpen(false)

        return
      }

      if (helpOpen) {
        setHelpOpen(false)

        return
      }

      setSelectedHotspot(
        null,
      )
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
  }, [
    ehrOpen,
    helpOpen,
  ])

  /*
   * ==========================================================
   * GLOBAL RULES
   * ==========================================================
   */

  const activeGlobalEffects =
    scenario &&
    simulatorState
      ? getActiveGlobalEffects(
          scenario,
          simulatorState,
        )
      : []

  const monitorAlarm =
    activeGlobalEffects.some(
      (effect) =>
        effect.type ===
          'ui_visual' &&
        effect.target ===
          'hs_monitor' &&
        effect.state ===
          'blinking_red',
    )

  /*
   * ==========================================================
   * HOTSPOT INTERACTION
   * ==========================================================
   */

  const handleHotspotClick =
    useCallback(
      (
        hotspot:
          HotspotId,
      ) => {
        const state =
          simulatorStateRef
            .current

        /*
         * Record every interaction
         * with a 3D hotspot.
         */
        if (
          scenario &&
          state &&
          shouldLog(
            scenario,
            'HOTSPOT_INTERACTION',
          )
        ) {
          setLogs(
            (current) => [
              ...current,

              logHotspotInteraction(
                state,
                hotspot,
              ),
            ],
          )
        }

        /*
         * EHR opens directly as a
         * full application panel.
         */
        if (
          hotspot ===
          'hs_ehr'
        ) {
          setSelectedHotspot(
            null,
          )

          setEhrOpen(true)

          return
        }

        setSelectedHotspot(
          hotspot,
        )
      },
      [scenario],
    )

  const handleHotspotHover =
    useCallback(
      (
        hotspot:
          | HotspotId
          | null,
      ) => {
        setHoveredHotspot(
          hotspot,
        )
      },
      [],
    )

  /*
   * ==========================================================
   * MESSAGE NODE
   * ==========================================================
   */

  function handleAdvanceMessage() {
    if (
      !scenario ||
      !simulatorState ||
      currentNode?.type !==
        'message'
    ) {
      return
    }

    const previousState =
      simulatorState

    const result =
      advanceMessage(
        scenario,
        previousState,
      )

    const engineLogs =
      collectEngineLogs(
        previousState,
        result,
      )

    if (
      engineLogs.length > 0
    ) {
      setLogs(
        (current) => [
          ...current,
          ...engineLogs,
        ],
      )
    }

    simulatorStateRef.current =
      result.state

    setSimulatorState(
      result.state,
    )

    setSelectedHotspot(
      null,
    )
  }

  /*
   * ==========================================================
   * DECISION
   * ==========================================================
   */

  function handleDecision(
    optionId: string,
  ) {
    if (
      !scenario ||
      !simulatorState ||
      currentNode?.type !==
        'decision'
    ) {
      return
    }

    const option =
      currentNode.options.find(
        (item) =>
          item.id === optionId,
      )

    if (!option) {
      return
    }

    const previousState =
      simulatorState

    const newLogs:
      LogEntry[] = []

    /*
     * Log the user's actual choice
     * before changing nodes.
     */
    if (
      shouldLog(
        scenario,
        'OPTION_SELECTED',
      )
    ) {
      newLogs.push(
        logOptionSelected(
          previousState,
          option.id,
          option.label,
          option.target_hotspot,
        ),
      )
    }

    const result =
      selectDecision(
        scenario,
        previousState,
        optionId,
      )

    newLogs.push(
      ...collectEngineLogs(
        previousState,
        result,
      ),
    )

    if (
      newLogs.length > 0
    ) {
      setLogs(
        (current) => [
          ...current,
          ...newLogs,
        ],
      )
    }

    simulatorStateRef.current =
      result.state

    setSimulatorState(
      result.state,
    )

    setSelectedHotspot(
      null,
    )

    if (result.toast) {
      setToast(
        result.toast,
      )
    }
  }

  /*
   * ==========================================================
   * EHR FIELD CHANGE
   * ==========================================================
   */

  function handleEhrFieldChange(
    formId: string,
    field: string,
    value: string,
  ) {
    setEhrValues(
      (current) => ({
        ...current,

        [formId]: {
          ...current[
            formId
          ],

          [field]: value,
        },
      }),
    )
  }

  /*
   * ==========================================================
   * EHR SAVE / GATE
   * ==========================================================
   */

  function handleEhrContinue() {
    if (
      !scenario ||
      !simulatorState
    ) {
      return
    }

    /*
     * EHR may also be opened outside
     * a gate.
     */
    if (
      currentNode?.type !==
      'gate'
    ) {
      if (
        shouldLog(
          scenario,
          'EHR_SUBMIT',
        )
      ) {
        setLogs(
          (current) => [
            ...current,

            logEhrSubmit(
              simulatorState,
              ehrValues,
              true,
            ),
          ],
        )
      }

      setToast(
        'EHR information saved.',
      )

      return
    }

    const previousState =
      simulatorState

    const result =
      passGate(
        scenario,
        previousState,
        ehrValues,
      )

    const gatePassed =
      result.state
        .current_node_id !==
      previousState
        .current_node_id

    const newLogs:
      LogEntry[] = []

    /*
     * Log every save attempt,
     * including unsuccessful ones.
     *
     * This is useful in the debrief
     * because we can identify errors
     * and repeated attempts.
     */
    if (
      shouldLog(
        scenario,
        'EHR_SUBMIT',
      )
    ) {
      newLogs.push(
        logEhrSubmit(
          previousState,
          ehrValues,
          gatePassed,
        ),
      )
    }

    /*
     * If the gate passed we entered
     * another scenario node.
     */
    if (
      gatePassed &&
      shouldLog(
        scenario,
        'NODE_ENTER',
      )
    ) {
      newLogs.push(
        logNodeEnter(
          result.state,
        ),
      )
    }

    if (
      newLogs.length > 0
    ) {
      setLogs(
        (current) => [
          ...current,
          ...newLogs,
        ],
      )
    }

    simulatorStateRef.current =
      result.state

    setSimulatorState(
      result.state,
    )

    if (result.toast) {
      setToast(
        result.toast,
      )
    }

    /*
     * Successful gate:
     * return the user to the ICU.
     */

    if (gatePassed) {
      setEhrOpen(false)

      setSelectedHotspot(
        null,
      )
    }
  }

  /*
   * ==========================================================
   * RESET
   * ==========================================================
   */

  function handleReset() {
    if (!scenario) {
      return
    }

    const initialState =
      createInitialState(
        scenario,
      )

    simulatorStateRef.current =
      initialState

    setSimulatorState(
      initialState,
    )

    setSelectedHotspot(
      null,
    )

    setHoveredHotspot(
      null,
    )

    setEhrOpen(false)

    setEhrValues({})

    setTimeoutRemaining(
      null,
    )

    /*
     * Reset creates an entirely new
     * session log.
     */

    if (
      shouldLog(
        scenario,
        'NODE_ENTER',
      )
    ) {
      setLogs([
        logNodeEnter(
          initialState,
        ),
      ])
    } else {
      setLogs([])
    }

    setToast(
      'Scenario reset.',
    )
  }

  /*
   * ==========================================================
   * HOTSPOT INFORMATION
   * ==========================================================
   */

  const selectedInfo =
    selectedHotspot
      ? hotspotInfo[
          selectedHotspot
        ]
      : null

  const hoveredInfo =
    hoveredHotspot
      ? hotspotInfo[
          hoveredHotspot
        ]
      : null

  const availableOptions =
    currentNode?.type ===
      'decision' &&
    selectedHotspot
      ? currentNode.options.filter(
          (option) =>
            option.target_hotspot ===
            selectedHotspot,
        )
      : []

  /*
   * ==========================================================
   * LOADING SCREEN
   * ==========================================================
   */

  if (
    !scenario ||
    !simulatorState ||
    !currentNode
  ) {
    return (
      <main className="simulator">
        <section className="loading-screen">
          {loadError ? (
            <>
              <span className="eyebrow">
                Scenario error
              </span>

              <h1>
                Unable to load
                simulation
              </h1>

              <p>
                {loadError}
              </p>

              <button
                type="button"
                className="primary-action"
                onClick={() =>
                  void initializeScenario()
                }
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <div className="loading-indicator" />

              <strong>
                Loading ICU
                scenario…
              </strong>
            </>
          )}
        </section>
      </main>
    )
  }

  /*
   * ==========================================================
   * MAIN APPLICATION
   * ==========================================================
   */

  return (
    <main className="simulator">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            ICU
          </div>

          <div className="brand-copy">
            <strong>
              Clinical Simulator
            </strong>

            <span>
              {
                scenario
                  .scenario_meta
                  .title
              }
            </span>
          </div>
        </div>

        <div className="topbar-status">
          <div className="status-item">
            <span>
              Scenario
            </span>

            <strong>
              <span
                className={
                  simulatorState.completed
                    ? 'status-dot status-complete'
                    : 'status-dot'
                }
              />

              {simulatorState.completed
                ? 'Complete'
                : 'In progress'}
            </strong>
          </div>

          <div className="status-item">
            <span>
              Score
            </span>

            <strong>
              {
                simulatorState.score
              }
            </strong>
          </div>

          <div className="status-item">
            <span>
              Time
            </span>

            <strong>
              {formatTime(
                simulatorState
                  .time_elapsed,
              )}
            </strong>
          </div>

          <button
            type="button"
            className="reset-button"
            onClick={
              handleReset
            }
          >
            Reset
          </button>

          <button
            type="button"
            className="help-button"
            onClick={() =>
              setHelpOpen(true)
            }
            aria-label="Open simulator help"
          >
            ?
          </button>
        </div>
      </header>

      <section className="workspace">
        <div className="scene-container">
          <ICUScene
            onHotspotClick={
              handleHotspotClick
            }
            onHotspotHover={
              handleHotspotHover
            }
          />
        </div>

        <div className="interface-layer">
          {/*
           * ======================================
           * VITALS
           * ======================================
           */}

          <section className="vitals-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">
                  Bed 01
                </span>

                <h2>
                  Live vitals
                </h2>
              </div>

              <span className="live-badge">
                <span />
                LIVE
              </span>
            </div>

            <div className="vitals-grid">
              <div
                className={
                  monitorAlarm
                    ? 'vital-card vital-danger'
                    : 'vital-card'
                }
              >
                <span>
                  SpO₂
                </span>

                <strong>
                  {
                    simulatorState
                      .vitals
                      .spo2
                  }

                  <small>
                    %
                  </small>
                </strong>

                <em>
                  {monitorAlarm
                    ? 'Below threshold'
                    : 'Within range'}
                </em>
              </div>

              <div className="vital-card">
                <span>
                  HR
                </span>

                <strong>
                  {
                    simulatorState
                      .vitals.hr
                  }

                  <small>
                    bpm
                  </small>
                </strong>

                <em>
                  Heart rate
                </em>
              </div>

              <div className="vital-card">
                <span>
                  RR
                </span>

                <strong>
                  {
                    simulatorState
                      .vitals.rr
                  }

                  <small>
                    /min
                  </small>
                </strong>

                <em>
                  Respiratory rate
                </em>
              </div>

              <div className="vital-card">
                <span>
                  BP
                </span>

                <strong className="bp-value">
                  {
                    simulatorState
                      .vitals.bp
                  }
                </strong>

                <em>
                  mmHg
                </em>
              </div>
            </div>

            <div className="temperature">
              <span>
                Temperature
              </span>

              <strong>
                {
                  simulatorState
                    .vitals.temp
                }{' '}
                °C
              </strong>
            </div>
          </section>

          {/*
           * ======================================
           * OBJECTIVE
           * ======================================
           */}

          <section className="objective-panel">
            <span className="eyebrow">
              Current objective
            </span>

            <strong>
              {currentNode.type ===
              'gate'
                ? 'Complete required documentation'
                : currentNode.type ===
                    'end'
                  ? 'Scenario complete'
                  : 'Respond to the current situation'}
            </strong>

            <p>
              {
                currentNode.text
              }
            </p>

            {currentNode.type ===
              'gate' && (
              <div className="gate-progress">
                <span>
                  Documentation
                </span>

                <strong>
                  {requiredEhrFields.length -
                    missingEhrFields.length}
                  /
                  {
                    requiredEhrFields.length
                  }
                </strong>
              </div>
            )}

            {timeoutRemaining !==
              null && (
              <div className="timeout-badge">
                Response time:{' '}
                <strong>
                  {
                    timeoutRemaining
                  }
                  s
                </strong>
              </div>
            )}
          </section>

          {/*
           * ======================================
           * MESSAGE NODE
           * ======================================
           */}

          {currentNode.type ===
            'message' && (
            <div className="node-action-bar">
              <div>
                <span className="eyebrow">
                  Scenario update
                </span>

                <strong>
                  {
                    currentNode.text
                  }
                </strong>
              </div>

              <button
                type="button"
                className="primary-action node-continue-button"
                onClick={
                  handleAdvanceMessage
                }
              >
                Continue
                <span>→</span>
              </button>
            </div>
          )}

          {/*
           * ======================================
           * DOCUMENTATION GATE
           * ======================================
           */}

          {currentNode.type ===
            'gate' &&
            !ehrOpen && (
              <div className="documentation-gate-banner">
                <div className="gate-icon">
                  !
                </div>

                <div>
                  <span className="eyebrow">
                    Documentation
                    required
                  </span>

                  <strong>
                    {
                      currentNode.text
                    }
                  </strong>

                  <p>
                    {
                      missingEhrFields.length
                    }{' '}
                    required{' '}
                    {missingEhrFields.length ===
                    1
                      ? 'field remains'
                      : 'fields remain'}
                    .
                  </p>
                </div>

                <button
                  type="button"
                  className="primary-action gate-open-button"
                  onClick={() =>
                    setEhrOpen(
                      true,
                    )
                  }
                >
                  Open EHR
                  <span>→</span>
                </button>
              </div>
            )}

          {/*
           * ======================================
           * SELECTED OBJECT
           * ======================================
           */}

          {selectedInfo && (
            <aside className="interaction-panel">
              <button
                type="button"
                className="close-panel"
                onClick={() =>
                  setSelectedHotspot(
                    null,
                  )
                }
                aria-label="Close interaction panel"
              >
                ×
              </button>

              <span className="eyebrow">
                {
                  selectedInfo.eyebrow
                }
              </span>

              <h2>
                {
                  selectedInfo.title
                }
              </h2>

              <p>
                {
                  selectedInfo.description
                }
              </p>

              {selectedHotspot ===
                'hs_monitor' && (
                <div
                  className={
                    monitorAlarm
                      ? 'clinical-note danger-note'
                      : 'clinical-note'
                  }
                >
                  <span>
                    Current status
                  </span>

                  <strong>
                    SpO₂{' '}
                    {
                      simulatorState
                        .vitals
                        .spo2
                    }
                    %
                  </strong>

                  <p>
                    {monitorAlarm
                      ? 'Oxygen saturation is below the configured alert threshold.'
                      : 'No active oxygen saturation alarm.'}
                  </p>
                </div>
              )}

              {selectedHotspot ===
                'hs_patient' && (
                <div className="clinical-note">
                  <span>
                    Patient
                  </span>

                  <strong>
                    Bed 01
                  </strong>

                  <p>
                    Select an
                    available action
                    to continue the
                    scenario.
                  </p>
                </div>
              )}

              {availableOptions.length >
              0 ? (
                <div className="decision-actions">
                  {availableOptions.map(
                    (option) => (
                      <button
                        key={
                          option.id
                        }
                        type="button"
                        className="primary-action"
                        onClick={() =>
                          handleDecision(
                            option.id,
                          )
                        }
                      >
                        {
                          option.label
                        }

                        <span>
                          →
                        </span>
                      </button>
                    ),
                  )}
                </div>
              ) : currentNode.type ===
                'decision' ? (
                <div className="clinical-note unavailable-note">
                  <span>
                    No current
                    action
                  </span>

                  <strong>
                    Try another
                    object
                  </strong>

                  <p>
                    This object is
                    not associated
                    with an available
                    decision at this
                    stage.
                  </p>
                </div>
              ) : currentNode.type ===
                'gate' ? (
                <div className="clinical-note danger-note">
                  <span>
                    Scenario locked
                  </span>

                  <strong>
                    Documentation
                    required
                  </strong>

                  <p>
                    Complete the
                    required EHR
                    documentation
                    before the
                    scenario can
                    continue.
                  </p>
                </div>
              ) : null}
            </aside>
          )}

          {/*
           * ======================================
           * HOVER LABEL
           * ======================================
           */}

          {hoveredInfo &&
            !selectedInfo &&
            !ehrOpen && (
              <div className="hover-label">
                <strong>
                  {
                    hoveredInfo.eyebrow
                  }
                </strong>

                <span>
                  Click to interact
                </span>
              </div>
            )}

          <div className="scene-help">
            <span>
              Drag to rotate
            </span>

            <span className="separator">
              •
            </span>

            <span>
              Scroll to zoom
            </span>

            <span className="separator">
              •
            </span>

            <span>
              Hover to identify
            </span>
          </div>

          {monitorAlarm && (
            <div className="alarm-banner">
              <div className="alarm-icon">
                !
              </div>

              <div>
                <strong>
                  SpO₂ alarm active
                </strong>

                <span>
                  Oxygen saturation
                  is below 90%.
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/*
       * ========================================================
       * EHR
       * ========================================================
       */}

      {ehrOpen && (
        <EHRPanel
          config={
            scenario.ehr_config
          }
          vitals={
            simulatorState.vitals
          }
          values={
            ehrValues
          }
          requiredFields={
            requiredEhrFields
          }
          onFieldChange={
            handleEhrFieldChange
          }
          onClose={() =>
            setEhrOpen(false)
          }
          onContinue={
            handleEhrContinue
          }
        />
      )}

      {/*
       * ========================================================
       * FINAL DEBRIEF
       * ========================================================
       */}

      {currentNode.type ===
        'end' && (
        <Debrief
          scenario={
            scenario
          }
          state={
            simulatorState
          }
          logs={
            logs
          }
          onRestart={
            handleReset
          }
        />
      )}

      {/*
       * ========================================================
       * TOAST
       * ========================================================
       */}

      {toast && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
        >
          <span className="toast-icon">
            ✓
          </span>

          {toast}
        </div>
      )}

      {/*
       * ========================================================
       * HELP
       * ========================================================
       */}

      {helpOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setHelpOpen(false)
          }
        >
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="close-panel"
              onClick={() =>
                setHelpOpen(
                  false,
                )
              }
              aria-label="Close help"
            >
              ×
            </button>

            <span className="eyebrow">
              Simulator help
            </span>

            <h2 id="help-title">
              Interacting with
              the ICU
            </h2>

            <p>
              Interact directly
              with the virtual
              ICU equipment to
              make decisions and
              progress through
              the scenario.
            </p>

            <div className="help-items">
              <div>
                <strong>
                  Rotate view
                </strong>

                <span>
                  Click and drag
                  inside the room.
                </span>
              </div>

              <div>
                <strong>
                  Zoom
                </strong>

                <span>
                  Use the mouse
                  wheel.
                </span>
              </div>

              <div>
                <strong>
                  Identify objects
                </strong>

                <span>
                  Hover over
                  equipment to
                  discover
                  interactive
                  hotspots.
                </span>
              </div>

              <div>
                <strong>
                  Documentation
                </strong>

                <span>
                  Use the EHR
                  terminal when
                  documentation
                  is required.
                </span>
              </div>
            </div>

            <button
              type="button"
              className="primary-action"
              onClick={() =>
                setHelpOpen(
                  false,
                )
              }
            >
              Return to simulation
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App