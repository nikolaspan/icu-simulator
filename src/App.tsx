import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import ICUScene from './components/ICUScene'

import {
  advanceMessage,
  applyTimeout,
  createInitialState,
  getActiveGlobalEffects,
  getNode,
  incrementTime,
  selectDecision,
} from './engine/scenarioEngine'

import {
  loadDefaultScenario,
} from './engine/scenarioLoader'

import type {
  HotspotId,
  Scenario,
  SimulatorState,
} from './engine/types'

import './App.css'

/*
 * ============================================================
 * HOTSPOT UI INFORMATION
 * ============================================================
 *
 * This describes how each physical object is presented to
 * the user.
 *
 * Scenario progression itself comes from the JSON.
 */

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

/*
 * ============================================================
 * TIME FORMAT
 * ============================================================
 */

function formatTime(
  totalSeconds: number,
) {
  const minutes = Math.floor(
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

/*
 * ============================================================
 * APP
 * ============================================================
 */

function App() {
  /*
   * ----------------------------------------------------------
   * Scenario
   * ----------------------------------------------------------
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

  /*
   * A ref lets timeout callbacks access the most recent state
   * without depending on an old render.
   */

  const simulatorStateRef =
    useRef<
      SimulatorState | null
    >(null)

  /*
   * ----------------------------------------------------------
   * Interface state
   * ----------------------------------------------------------
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
   * ============================================================
   * LOAD SCENARIO
   * ============================================================
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

  /*
   * Keep the ref synchronized with React state.
   */

  useEffect(() => {
    simulatorStateRef.current =
      simulatorState
  }, [simulatorState])

  /*
   * ============================================================
   * CURRENT NODE
   * ============================================================
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
   * ============================================================
   * SCENARIO CLOCK
   * ============================================================
   */

  const scenarioCompleted =
    simulatorState
      ?.completed ??
    true

  useEffect(() => {
    if (
      scenarioCompleted
    ) {
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
   * ============================================================
   * DECISION TIMEOUT
   * ============================================================
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

              /*
               * Timeout reached.
               */

              window.clearInterval(
                timer,
              )

              const currentState =
                simulatorStateRef.current

              if (
                !currentState ||
                currentState.current_node_id !==
                  nodeId
              ) {
                return null
              }

              const result =
                applyTimeout(
                  scenario,
                  currentState,
                )

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
   * ============================================================
   * TOAST AUTO DISMISS
   * ============================================================
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
   * ============================================================
   * ESCAPE KEY
   * ============================================================
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
  }, [helpOpen])

  /*
   * ============================================================
   * GLOBAL RULES
   * ============================================================
   */

  const activeGlobalEffects =
    scenario &&
    simulatorState
      ? getActiveGlobalEffects(
          scenario,
          simulatorState,
        )
      : []

  /*
   * The scenario JSON contains:
   *
   * vitals.spo2 < 90
   *       ↓
   * monitor -> blinking_red
   */

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
   * ============================================================
   * HOTSPOT INTERACTION
   * ============================================================
   */

  const handleHotspotClick =
    useCallback(
      (
        hotspot:
          HotspotId,
      ) => {
        setSelectedHotspot(
          hotspot,
        )
      },
      [],
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
   * ============================================================
   * MESSAGE NODE
   * ============================================================
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

    const result =
      advanceMessage(
        scenario,
        simulatorState,
      )

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
   * ============================================================
   * DECISION
   * ============================================================
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

    const result =
      selectDecision(
        scenario,
        simulatorState,
        optionId,
      )

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
   * ============================================================
   * RESET
   * ============================================================
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

    setToast(
      'Scenario reset.',
    )
  }

  /*
   * ============================================================
   * SELECTED / HOVERED OBJECT INFO
   * ============================================================
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

  /*
   * If the current decision contains an option associated
   * with the selected 3D object, show that action.
   */

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
   * ============================================================
   * LOADING SCREEN
   * ============================================================
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
   * ============================================================
   * MAIN INTERFACE
   * ============================================================
   */

  return (
    <main className="simulator">
      {/*
       * --------------------------------------------------------
       * TOP BAR
       * --------------------------------------------------------
       */}

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            ICU
          </div>

          <div className="brand-copy">
            <strong>
              Clinical
              Simulator
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
                simulatorState.time_elapsed,
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
              setHelpOpen(
                true,
              )
            }
            aria-label="Open simulator help"
          >
            ?
          </button>
        </div>
      </header>

      {/*
       * --------------------------------------------------------
       * 3D WORKSPACE
       * --------------------------------------------------------
       */}

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
           * ----------------------------------------------------
           * VITALS
           * ----------------------------------------------------
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
                  Respiratory
                  rate
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
                    .vitals
                    .temp
                }{' '}
                °C
              </strong>
            </div>
          </section>

          {/*
           * ----------------------------------------------------
           * CURRENT OBJECTIVE / NODE
           * ----------------------------------------------------
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
           * ----------------------------------------------------
           * MESSAGE NODE
           * ----------------------------------------------------
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
           * ----------------------------------------------------
           * SELECTED HOTSPOT
           * ----------------------------------------------------
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
                    Current
                    status
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
                    clinical scenario.
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
                    This equipment
                    is not associated
                    with an available
                    decision at this
                    stage.
                  </p>
                </div>
              ) : currentNode.type ===
                'gate' &&
                selectedHotspot ===
                  'hs_ehr' ? (
                <div className="clinical-note">
                  <span>
                    Documentation
                  </span>

                  <strong>
                    EHR required
                  </strong>

                  <p>
                    The documentation
                    interface will be
                    connected in the
                    next milestone.
                  </p>
                </div>
              ) : null}
            </aside>
          )}

          {/*
           * ----------------------------------------------------
           * HOVER LABEL
           * ----------------------------------------------------
           */}

          {hoveredInfo &&
            !selectedInfo && (
              <div className="hover-label">
                <strong>
                  {
                    hoveredInfo.eyebrow
                  }
                </strong>

                <span>
                  Click to
                  interact
                </span>
              </div>
            )}

          {/*
           * ----------------------------------------------------
           * SCENE HELP
           * ----------------------------------------------------
           */}

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
              Hover to
              identify
            </span>
          </div>

          {/*
           * ----------------------------------------------------
           * GLOBAL ALARM
           * ----------------------------------------------------
           */}

          {monitorAlarm && (
            <div className="alarm-banner">
              <div className="alarm-icon">
                !
              </div>

              <div>
                <strong>
                  SpO₂ alarm
                  active
                </strong>

                <span>
                  Oxygen
                  saturation is
                  below 90%.
                </span>
              </div>
            </div>
          )}

          {/*
           * ----------------------------------------------------
           * END NODE
           * ----------------------------------------------------
           */}

          {currentNode.type ===
            'end' && (
            <section className="scenario-complete-panel">
              <span className="eyebrow">
                Debrief
              </span>

              <h2>
                Scenario
                complete
              </h2>

              <p>
                {
                  currentNode.text
                }
              </p>

              <div className="completion-score">
                <span>
                  Final score
                </span>

                <strong>
                  {
                    simulatorState.score
                  }
                </strong>
              </div>

              <button
                type="button"
                className="primary-action"
                onClick={
                  handleReset
                }
              >
                Restart scenario
                <span>↻</span>
              </button>
            </section>
          )}
        </div>
      </section>

      {/*
       * --------------------------------------------------------
       * TOAST
       * --------------------------------------------------------
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
       * --------------------------------------------------------
       * HELP
       * --------------------------------------------------------
       */}

      {helpOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setHelpOpen(
              false,
            )
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
              Interacting
              with the ICU
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
                  inside the
                  room.
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
                  Identify
                  objects
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
                  Make a
                  decision
                </strong>

                <span>
                  Click an object
                  and choose the
                  available
                  action.
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
              Return to
              simulation
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App