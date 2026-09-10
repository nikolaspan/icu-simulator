import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import ICUScene, {
  type HotspotId,
} from './components/ICUScene'

import './App.css'

interface HotspotInfo {
  title: string
  eyebrow: string
  description: string
  actionLabel: string
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
    actionLabel: 'Assess patient',
  },

  hs_monitor: {
    title: 'Vital Signs Monitor',
    eyebrow: 'Monitor',
    description:
      'Review current vital signs and recent changes in the patient condition.',
    actionLabel: 'Review monitor',
  },

  hs_ventilator: {
    title: 'Ventilator',
    eyebrow: 'Respiratory support',
    description:
      'Review the current respiratory settings before making an intervention.',
    actionLabel: 'View controls',
  },

  hs_ehr: {
    title: 'Electronic Health Record',
    eyebrow: 'EHR Terminal',
    description:
      'Review patient information and document assessments and interventions.',
    actionLabel: 'Open record',
  },

  hs_call: {
    title: 'Clinical Escalation',
    eyebrow: 'Call Button',
    description:
      'Use the call system when escalation to another healthcare professional is required.',
    actionLabel: 'Review call option',
  },
}

function formatTime(
  totalSeconds: number,
) {
  const minutes = Math.floor(
    totalSeconds / 60,
  )

  const seconds =
    totalSeconds % 60

  return `${String(minutes).padStart(
    2,
    '0',
  )}:${String(seconds).padStart(
    2,
    '0',
  )}`
}

function App() {
  const [
    selectedHotspot,
    setSelectedHotspot,
  ] = useState<HotspotId | null>(
    null,
  )

  const [
    hoveredHotspot,
    setHoveredHotspot,
  ] = useState<HotspotId | null>(
    null,
  )

  const [elapsed, setElapsed] =
    useState(0)

  const [toast, setToast] =
    useState<string | null>(
      null,
    )

  const [helpOpen, setHelpOpen] =
    useState(false)

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setElapsed(
          (value) => value + 1,
        )
      }, 1000)

    return () =>
      window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer =
      window.setTimeout(() => {
        setToast(null)
      }, 3200)

    return () =>
      window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key !== 'Escape'
      ) {
        return
      }

      if (helpOpen) {
        setHelpOpen(false)
        return
      }

      setSelectedHotspot(null)
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

  const handleHotspotClick =
    useCallback(
      (hotspot: HotspotId) => {
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

  function handleContextAction() {
    if (!selectedHotspot) {
      return
    }

    switch (selectedHotspot) {
      case 'hs_patient':
        setToast(
          'Patient assessment selected.',
        )
        break

      case 'hs_monitor':
        setToast(
          'Monitor review selected. SpO₂ is currently below the configured threshold.',
        )
        break

      case 'hs_ventilator':
        setToast(
          'Ventilator controls selected.',
        )
        break

      case 'hs_ehr':
        setToast(
          'EHR terminal selected.',
        )
        break

      case 'hs_call':
        setToast(
          'Clinical escalation station selected.',
        )
        break
    }
  }

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
              Hypoxemia
              Management
            </span>
          </div>
        </div>

        <div className="topbar-status">
          <div className="status-item">
            <span>
              Scenario
            </span>

            <strong>
              <span className="status-dot" />
              In progress
            </strong>
          </div>

          <div className="status-item">
            <span>Time</span>

            <strong>
              {formatTime(
                elapsed,
              )}
            </strong>
          </div>

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
              <div className="vital-card vital-danger">
                <span>
                  SpO₂
                </span>

                <strong>
                  88
                  <small>
                    %
                  </small>
                </strong>

                <em>
                  Below threshold
                </em>
              </div>

              <div className="vital-card">
                <span>HR</span>

                <strong>
                  110
                  <small>
                    bpm
                  </small>
                </strong>

                <em>
                  Heart rate
                </em>
              </div>

              <div className="vital-card">
                <span>RR</span>

                <strong>
                  24
                  <small>
                    /min
                  </small>
                </strong>

                <em>
                  Respiratory rate
                </em>
              </div>

              <div className="vital-card">
                <span>BP</span>

                <strong className="bp-value">
                  125/80
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
                37.0 °C
              </strong>
            </div>
          </section>

          <section className="objective-panel">
            <span className="eyebrow">
              Current objective
            </span>

            <strong>
              Assess the
              patient's
              condition
            </strong>

            <p>
              Explore the room
              and select the
              equipment or
              patient you want
              to interact with.
            </p>
          </section>

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
                <div className="clinical-note danger-note">
                  <span>
                    Current
                    status
                  </span>

                  <strong>
                    SpO₂ 88%
                  </strong>

                  <p>
                    Oxygen
                    saturation is
                    below the
                    configured
                    alert
                    threshold.
                  </p>
                </div>
              )}

              {selectedHotspot ===
                'hs_patient' && (
                <div className="clinical-note">
                  <span>
                    Observation
                  </span>

                  <strong>
                    Assessment
                    required
                  </strong>

                  <p>
                    Review the
                    patient's
                    visible
                    condition
                    before
                    proceeding.
                  </p>
                </div>
              )}

              <button
                type="button"
                className="primary-action"
                onClick={
                  handleContextAction
                }
              >
                {
                  selectedInfo.actionLabel
                }

                <span>→</span>
              </button>
            </aside>
          )}

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

          <div className="alarm-banner">
            <div className="alarm-icon">
              !
            </div>

            <div>
              <strong>
                SpO₂ alarm active
              </strong>

              <span>
                Oxygen
                saturation is
                below 90%.
              </span>
            </div>
          </div>
        </div>
      </section>

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
                setHelpOpen(false)
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
              Move around the
              virtual ICU and
              interact directly
              with objects in
              the room.
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
                  object
                </strong>

                <span>
                  Hover over
                  interactive
                  equipment.
                </span>
              </div>

              <div>
                <strong>
                  Interact
                </strong>

                <span>
                  Click a
                  highlighted
                  object.
                </span>
              </div>
            </div>

            <button
              type="button"
              className="primary-action"
              onClick={() =>
                setHelpOpen(false)
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