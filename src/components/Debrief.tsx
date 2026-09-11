import {
  useMemo,
} from 'react'

import {
  downloadLogCsv,
  downloadSessionJson,
  type LogEntry,
} from '../engine/logger'

import type {
  DecisionNode,
  GateNode,
  Scenario,
  SimulatorState,
} from '../engine/types'

interface DebriefProps {
  scenario: Scenario

  state: SimulatorState

  logs: LogEntry[]

  onRestart: () => void
}

/*
 * ============================================================
 * TIME FORMAT
 * ============================================================
 */

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

/*
 * ============================================================
 * DOCUMENTATION STATUS
 * ============================================================
 */

interface DocumentationItem {
  id: string
  label: string
  complete: boolean
}

function getDocumentationItems(
  scenario: Scenario,
  state: SimulatorState,
): DocumentationItem[] {
  return scenario.nodes
    .filter(
      (
        node,
      ): node is GateNode =>
        node.type === 'gate',
    )
    .map((gate) => {
      const updates =
        gate.effects_on_pass
          ?.state_update ?? {}

      const flagPaths =
        Object.keys(
          updates,
        ).filter(
          (path) =>
            path.startsWith(
              'flags.',
            ),
        )

      const complete =
        flagPaths.length > 0 &&
        flagPaths.every(
          (path) => {
            const flagName =
              path.slice(
                'flags.'.length,
              )

            return (
              state.flags[
                flagName
              ] === true
            )
          },
        )

      return {
        id: gate.id,
        label: gate.text,
        complete,
      }
    })
}

/*
 * ============================================================
 * DECISION PATH LABELS
 * ============================================================
 */

function getPathLabel(
  scenario: Scenario,
  pathItem: string,
) {
  /*
   * Timeout entries are stored like:
   *
   * n2_initial_decision:timeout
   */

  if (
    pathItem.endsWith(
      ':timeout',
    )
  ) {
    const nodeId =
      pathItem.replace(
        ':timeout',
        '',
      )

    const node =
      scenario.nodes.find(
        (item) =>
          item.id === nodeId,
      )

    return {
      title:
        'Response timeout',

      detail:
        node?.text ??
        nodeId,

      type:
        'warning',
    }
  }

  /*
   * Is it a node?
   */

  const node =
    scenario.nodes.find(
      (item) =>
        item.id === pathItem,
    )

  if (node) {
    switch (node.type) {
      case 'message':
        return {
          title:
            'Scenario update',

          detail:
            node.text,

          type:
            'node',
        }

      case 'decision':
        return {
          title:
            'Decision point',

          detail:
            node.text,

          type:
            'node',
        }

      case 'gate':
        return {
          title:
            'Documentation gate',

          detail:
            node.text,

          type:
            'gate',
        }

      case 'end':
        return {
          title:
            'Scenario complete',

          detail:
            node.text,

          type:
            'complete',
        }
    }
  }

  /*
   * Is it a decision option?
   */

  for (
    const scenarioNode of
      scenario.nodes
  ) {
    if (
      scenarioNode.type !==
      'decision'
    ) {
      continue
    }

    const decisionNode =
      scenarioNode as DecisionNode

    const option =
      decisionNode.options.find(
        (item) =>
          item.id ===
          pathItem,
      )

    if (option) {
      return {
        title:
          'Action selected',

        detail:
          option.label,

        type:
          'action',
      }
    }
  }

  /*
   * Fallback.
   */

  return {
    title:
      'Scenario event',

    detail:
      pathItem,

    type:
      'node',
  }
}

/*
 * ============================================================
 * EVENT COUNTS
 * ============================================================
 */

function countEvents(
  logs: LogEntry[],
  eventType:
    LogEntry['event_type'],
) {
  return logs.filter(
    (entry) =>
      entry.event_type ===
      eventType,
  ).length
}

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

function Debrief({
  scenario,
  state,
  logs,
  onRestart,
}: DebriefProps) {
  const documentation =
    useMemo(
      () =>
        getDocumentationItems(
          scenario,
          state,
        ),
      [
        scenario,
        state,
      ],
    )

  const completedDocs =
    documentation.filter(
      (item) =>
        item.complete,
    ).length

  const scoreDifference =
    state.score -
    scenario.initial_state
      .current_score

  const path =
    useMemo(
      () =>
        state.decision_path.map(
          (
            pathItem,
            index,
          ) => ({
            key:
              `${pathItem}-${index}`,

            ...getPathLabel(
              scenario,
              pathItem,
            ),
          }),
        ),
      [
        scenario,
        state.decision_path,
      ],
    )

  return (
    <div className="debrief-backdrop">
      <section
        className="debrief-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debrief-title"
      >
        {/*
         * ========================================
         * HEADER
         * ========================================
         */}

        <header className="debrief-header">
          <div>
            <span className="eyebrow">
              Scenario debrief
            </span>

            <h2 id="debrief-title">
              Simulation
              complete
            </h2>

            <p>
              Review your
              decisions,
              documentation and
              final patient
              state.
            </p>
          </div>

          <div className="debrief-complete-badge">
            <span>✓</span>

            Completed
          </div>
        </header>

        {/*
         * ========================================
         * CONTENT
         * ========================================
         */}

        <div className="debrief-content">
          {/*
           * --------------------------------------
           * SUMMARY
           * --------------------------------------
           */}

          <section className="debrief-summary-grid">
            <article className="debrief-summary-card debrief-score-card">
              <span>
                Final score
              </span>

              <strong>
                {state.score}
              </strong>

              <small
                className={
                  scoreDifference >=
                  0
                    ? 'positive'
                    : 'negative'
                }
              >
                {scoreDifference >=
                0
                  ? '+'
                  : ''}
                {
                  scoreDifference
                }{' '}
                from starting
                score
              </small>
            </article>

            <article className="debrief-summary-card">
              <span>
                Scenario time
              </span>

              <strong>
                {formatTime(
                  state.time_elapsed,
                )}
              </strong>

              <small>
                Total simulated
                session time
              </small>
            </article>

            <article className="debrief-summary-card">
              <span>
                Documentation
              </span>

              <strong>
                {
                  completedDocs
                }
                /
                {
                  documentation.length
                }
              </strong>

              <small>
                Required gates
                completed
              </small>
            </article>

            <article className="debrief-summary-card">
              <span>
                Logged events
              </span>

              <strong>
                {logs.length}
              </strong>

              <small>
                Recorded during
                session
              </small>
            </article>
          </section>

          {/*
           * --------------------------------------
           * TWO COLUMN SECTION
           * --------------------------------------
           */}

          <div className="debrief-columns">
            {/*
             * ====================================
             * DECISION PATH
             * ====================================
             */}

            <section className="debrief-section">
              <div className="debrief-section-heading">
                <div>
                  <span className="eyebrow">
                    Decision path
                  </span>

                  <h3>
                    Your scenario
                    journey
                  </h3>
                </div>

                <span className="debrief-count">
                  {
                    path.length
                  }{' '}
                  events
                </span>
              </div>

              <div className="decision-timeline">
                {path.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.key
                      }
                      className="timeline-item"
                    >
                      <div className="timeline-marker-column">
                        <span
                          className={`timeline-marker ${item.type}`}
                        >
                          {item.type ===
                          'complete'
                            ? '✓'
                            : index +
                              1}
                        </span>

                        {index <
                          path.length -
                            1 && (
                          <span className="timeline-line" />
                        )}
                      </div>

                      <div className="timeline-content">
                        <strong>
                          {
                            item.title
                          }
                        </strong>

                        <p>
                          {
                            item.detail
                          }
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>

            {/*
             * ====================================
             * DOCUMENTATION + FINAL STATE
             * ====================================
             */}

            <div className="debrief-side-column">
              <section className="debrief-section">
                <div className="debrief-section-heading">
                  <div>
                    <span className="eyebrow">
                      Documentation
                    </span>

                    <h3>
                      Completion
                      checklist
                    </h3>
                  </div>
                </div>

                <div className="debrief-checklist">
                  {documentation.length >
                  0 ? (
                    documentation.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className={
                            item.complete
                              ? 'debrief-check-item complete'
                              : 'debrief-check-item missed'
                          }
                        >
                          <span className="debrief-check-icon">
                            {item.complete
                              ? '✓'
                              : '!'}
                          </span>

                          <div>
                            <strong>
                              {item.complete
                                ? 'Completed'
                                : 'Missed'}
                            </strong>

                            <p>
                              {
                                item.label
                              }
                            </p>
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <div className="debrief-empty">
                      No documentation
                      gates were
                      configured.
                    </div>
                  )}
                </div>
              </section>

              <section className="debrief-section">
                <div className="debrief-section-heading">
                  <div>
                    <span className="eyebrow">
                      Final state
                    </span>

                    <h3>
                      Patient vitals
                    </h3>
                  </div>
                </div>

                <div className="debrief-vitals">
                  <div>
                    <span>
                      SpO₂
                    </span>

                    <strong>
                      {
                        state
                          .vitals
                          .spo2
                      }
                      %
                    </strong>
                  </div>

                  <div>
                    <span>
                      HR
                    </span>

                    <strong>
                      {
                        state
                          .vitals
                          .hr
                      }
                    </strong>

                    <small>
                      bpm
                    </small>
                  </div>

                  <div>
                    <span>
                      RR
                    </span>

                    <strong>
                      {
                        state
                          .vitals
                          .rr
                      }
                    </strong>

                    <small>
                      /min
                    </small>
                  </div>

                  <div>
                    <span>
                      BP
                    </span>

                    <strong>
                      {
                        state
                          .vitals
                          .bp
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Temp
                    </span>

                    <strong>
                      {
                        state
                          .vitals
                          .temp
                      }
                      °C
                    </strong>
                  </div>
                </div>
              </section>

              <section className="debrief-section">
                <div className="debrief-section-heading">
                  <div>
                    <span className="eyebrow">
                      Session activity
                    </span>

                    <h3>
                      Event summary
                    </h3>
                  </div>
                </div>

                <div className="debrief-event-grid">
                  <div>
                    <span>
                      Hotspot
                      interactions
                    </span>

                    <strong>
                      {countEvents(
                        logs,
                        'HOTSPOT_INTERACTION',
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Decisions
                    </span>

                    <strong>
                      {countEvents(
                        logs,
                        'OPTION_SELECTED',
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      EHR
                      submissions
                    </span>

                    <strong>
                      {countEvents(
                        logs,
                        'EHR_SUBMIT',
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Vital
                      changes
                    </span>

                    <strong>
                      {countEvents(
                        logs,
                        'VITALS_CHANGE',
                      )}
                    </strong>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/*
         * ========================================
         * FOOTER / EXPORT
         * ========================================
         */}

        <footer className="debrief-footer">
          <div>
            <strong>
              Session data
            </strong>

            <span>
              Export the
              complete simulator
              activity log for
              review.
            </span>
          </div>

          <div className="debrief-actions">
            <button
              type="button"
              className="debrief-secondary-button"
              onClick={() =>
                downloadLogCsv(
                  scenario
                    .scenario_meta
                    .id,
                  logs,
                )
              }
            >
              Export CSV
            </button>

            <button
              type="button"
              className="debrief-secondary-button"
              onClick={() =>
                downloadSessionJson(
                  scenario
                    .scenario_meta
                    .id,

                  scenario
                    .scenario_meta
                    .title,

                  state,

                  logs,
                )
              }
            >
              Export JSON
            </button>

            <button
              type="button"
              className="primary-action debrief-restart-button"
              onClick={
                onRestart
              }
            >
              Restart scenario

              <span>↻</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default Debrief