import {
  useMemo,
  useState,
} from 'react'

import type {
  EHRConfig,
  VitalSigns,
} from '../engine/types'

import type {
  EHRFormValues,
} from '../engine/scenarioEngine'

interface EHRPanelProps {
  config: EHRConfig

  vitals: VitalSigns

  values: EHRFormValues

  requiredFields: string[]

  onFieldChange: (
    formId: string,
    field: string,
    value: string,
  ) => void

  onClose: () => void

  onContinue: () => void
}

/*
 * Human-readable labels for fields
 * used by the provided scenario.
 */
const fieldLabels: Record<
  string,
  string
> = {
  observation: 'Observation',
  skin_color: 'Skin colour',
  consciousness: 'Consciousness',

  device: 'Device',
  fiO2_setting: 'FiO₂ setting',
  flow_rate: 'Flow rate',

  recipient: 'Recipient',
  reason: 'Reason for communication',
  outcome: 'Outcome',
}

function getFieldLabel(
  field: string,
) {
  return (
    fieldLabels[field] ??
    field
      .replaceAll('_', ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      )
  )
}

function EHRPanel({
  config,
  vitals,
  values,
  requiredFields,
  onFieldChange,
  onClose,
  onContinue,
}: EHRPanelProps) {
  const [activeTab, setActiveTab] =
    useState('overview')

  /*
   * Required fields arrive in this format:
   *
   * assessment_form.observation
   * intervention_form.fiO2_setting
   */
  const requiredSet =
    useMemo(
      () =>
        new Set(
          requiredFields,
        ),
      [requiredFields],
    )

  const missingRequiredFields =
    requiredFields.filter(
      (path) => {
        const separator =
          path.indexOf('.')

        if (separator === -1) {
          return false
        }

        const formId =
          path.slice(
            0,
            separator,
          )

        const field =
          path.slice(
            separator + 1,
          )

        const value =
          values[formId]?.[
            field
          ]

        return (
          !value ||
          value.trim()
            .length === 0
        )
      },
    )

  const forms =
    Object.entries(
      config.forms,
    )

  return (
    <div className="ehr-backdrop">
      <section
        className="ehr-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ehr-title"
      >
        {/*
         * ========================================
         * HEADER
         * ========================================
         */}

        <header className="ehr-header">
          <div>
            <span className="eyebrow">
              Electronic Health
              Record
            </span>

            <h2 id="ehr-title">
              Patient — Bed 01
            </h2>

            <p>
              Review clinical
              information and
              document your
              actions.
            </p>
          </div>

          <button
            type="button"
            className="ehr-close"
            onClick={onClose}
            aria-label="Close electronic health record"
          >
            ×
          </button>
        </header>

        {/*
         * ========================================
         * BODY
         * ========================================
         */}

        <div className="ehr-body">
          {/*
           * --------------------------------------
           * NAVIGATION
           * --------------------------------------
           */}

          <nav
            className="ehr-navigation"
            aria-label="EHR sections"
          >
            <button
              type="button"
              className={
                activeTab ===
                'overview'
                  ? 'ehr-nav-item active'
                  : 'ehr-nav-item'
              }
              onClick={() =>
                setActiveTab(
                  'overview',
                )
              }
            >
              <span>
                Overview
              </span>
            </button>

            {forms.map(
              ([
                formId,
                form,
              ]) => {
                const requiredCount =
                  requiredFields.filter(
                    (path) =>
                      path.startsWith(
                        `${formId}.`,
                      ),
                  ).length

                const missingCount =
                  missingRequiredFields.filter(
                    (path) =>
                      path.startsWith(
                        `${formId}.`,
                      ),
                  ).length

                return (
                  <button
                    key={
                      formId
                    }
                    type="button"
                    className={
                      activeTab ===
                      formId
                        ? 'ehr-nav-item active'
                        : 'ehr-nav-item'
                    }
                    onClick={() =>
                      setActiveTab(
                        formId,
                      )
                    }
                  >
                    <span>
                      {
                        form.title
                      }
                    </span>

                    {requiredCount >
                      0 && (
                      <span
                        className={
                          missingCount >
                          0
                            ? 'ehr-nav-status required'
                            : 'ehr-nav-status complete'
                        }
                      >
                        {missingCount >
                        0
                          ? `${missingCount} required`
                          : 'Complete'}
                      </span>
                    )}
                  </button>
                )
              },
            )}
          </nav>

          {/*
           * --------------------------------------
           * CONTENT
           * --------------------------------------
           */}

          <div className="ehr-content">
            {activeTab ===
            'overview' ? (
              <>
                <div className="ehr-section-heading">
                  <div>
                    <span className="eyebrow">
                      Patient
                      overview
                    </span>

                    <h3>
                      Current
                      observations
                    </h3>
                  </div>

                  <span className="ehr-live">
                    <span />
                    LIVE
                  </span>
                </div>

                <div className="ehr-patient-banner">
                  <div className="ehr-avatar">
                    P
                  </div>

                  <div>
                    <strong>
                      ICU Patient
                    </strong>

                    <span>
                      Bed 01 ·
                      Critical Care
                    </span>
                  </div>
                </div>

                <section className="ehr-overview-section">
                  <div className="ehr-section-title">
                    <div>
                      <strong>
                        Vital
                        signs
                      </strong>

                      <span>
                        Current
                        scenario
                        values
                      </span>
                    </div>

                    <span className="ehr-updated">
                      Live
                    </span>
                  </div>

                  <div className="ehr-vitals-grid">
                    <div
                      className={
                        vitals.spo2 <
                        90
                          ? 'ehr-vital danger'
                          : 'ehr-vital'
                      }
                    >
                      <span>
                        SpO₂
                      </span>

                      <strong>
                        {
                          vitals.spo2
                        }
                        %
                      </strong>
                    </div>

                    <div className="ehr-vital">
                      <span>
                        HR
                      </span>

                      <strong>
                        {
                          vitals.hr
                        }
                      </strong>

                      <small>
                        bpm
                      </small>
                    </div>

                    <div className="ehr-vital">
                      <span>
                        RR
                      </span>

                      <strong>
                        {
                          vitals.rr
                        }
                      </strong>

                      <small>
                        /min
                      </small>
                    </div>

                    <div className="ehr-vital">
                      <span>
                        BP
                      </span>

                      <strong>
                        {
                          vitals.bp
                        }
                      </strong>

                      <small>
                        mmHg
                      </small>
                    </div>

                    <div className="ehr-vital">
                      <span>
                        Temperature
                      </span>

                      <strong>
                        {
                          vitals.temp
                        }
                        °C
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="ehr-overview-section">
                  <div className="ehr-section-title">
                    <div>
                      <strong>
                        Documentation
                        status
                      </strong>

                      <span>
                        Required
                        entries for
                        the current
                        scenario
                        stage
                      </span>
                    </div>
                  </div>

                  {requiredFields.length ===
                  0 ? (
                    <div className="ehr-empty-state">
                      <span className="ehr-empty-icon">
                        ✓
                      </span>

                      <div>
                        <strong>
                          No
                          documentation
                          currently
                          required
                        </strong>

                        <p>
                          Continue
                          interacting
                          with the
                          scenario.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="ehr-requirements">
                      {requiredFields.map(
                        (
                          path,
                        ) => {
                          const separator =
                            path.indexOf(
                              '.',
                            )

                          const formId =
                            path.slice(
                              0,
                              separator,
                            )

                          const field =
                            path.slice(
                              separator +
                                1,
                            )

                          const value =
                            values[
                              formId
                            ]?.[
                              field
                            ]

                          const complete =
                            Boolean(
                              value?.trim(),
                            )

                          return (
                            <button
                              key={
                                path
                              }
                              type="button"
                              className="ehr-requirement"
                              onClick={() =>
                                setActiveTab(
                                  formId,
                                )
                              }
                            >
                              <span
                                className={
                                  complete
                                    ? 'requirement-icon complete'
                                    : 'requirement-icon'
                                }
                              >
                                {complete
                                  ? '✓'
                                  : '○'}
                              </span>

                              <div>
                                <strong>
                                  {getFieldLabel(
                                    field,
                                  )}
                                </strong>

                                <span>
                                  {
                                    config
                                      .forms[
                                      formId
                                    ]
                                      ?.title
                                  }
                                </span>
                              </div>

                              <span className="requirement-arrow">
                                →
                              </span>
                            </button>
                          )
                        },
                      )}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                {/*
                 * ==================================
                 * DOCUMENTATION FORM
                 * ==================================
                 */}

                {config.forms[
                  activeTab
                ] && (
                  <>
                    <div className="ehr-section-heading">
                      <div>
                        <span className="eyebrow">
                          Documentation
                        </span>

                        <h3>
                          {
                            config
                              .forms[
                              activeTab
                            ].title
                          }
                        </h3>

                        <p>
                          Record the
                          relevant
                          information
                          from your
                          interaction.
                        </p>
                      </div>
                    </div>

                    <form
                      className="ehr-form"
                      onSubmit={(
                        event,
                      ) => {
                        event.preventDefault()
                        onContinue()
                      }}
                    >
                      {config.forms[
                        activeTab
                      ].fields.map(
                        (
                          field,
                        ) => {
                          const fieldPath =
                            `${activeTab}.${field}`

                          const required =
                            requiredSet.has(
                              fieldPath,
                            )

                          const value =
                            values[
                              activeTab
                            ]?.[
                              field
                            ] ??
                            ''

                          const missing =
                            required &&
                            value
                              .trim()
                              .length ===
                              0

                          return (
                            <div
                              key={
                                field
                              }
                              className={
                                missing
                                  ? 'ehr-field ehr-field-required'
                                  : 'ehr-field'
                              }
                            >
                              <label
                                htmlFor={
                                  fieldPath
                                }
                              >
                                {getFieldLabel(
                                  field,
                                )}

                                {required && (
                                  <span className="required-marker">
                                    *
                                  </span>
                                )}
                              </label>

                              <input
                                id={
                                  fieldPath
                                }
                                name={
                                  fieldPath
                                }
                                type="text"
                                value={
                                  value
                                }
                                placeholder={`Enter ${getFieldLabel(
                                  field,
                                ).toLowerCase()}`}
                                aria-required={
                                  required
                                }
                                onChange={(
                                  event,
                                ) =>
                                  onFieldChange(
                                    activeTab,
                                    field,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                              />

                              {missing && (
                                <span className="ehr-field-hint">
                                  Required
                                  before
                                  scenario
                                  progression.
                                </span>
                              )}
                            </div>
                          )
                        },
                      )}

                      <div className="ehr-form-note">
                        <span>
                          i
                        </span>

                        <p>
                          Required
                          fields are
                          marked with
                          an asterisk.
                          Your entries
                          remain
                          available
                          while the
                          scenario is
                          active.
                        </p>
                      </div>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/*
         * ========================================
         * FOOTER
         * ========================================
         */}

        <footer className="ehr-footer">
          <div>
            {requiredFields.length >
            0 ? (
              missingRequiredFields.length >
              0 ? (
                <>
                  <strong className="ehr-footer-warning">
                    {
                      missingRequiredFields.length
                    }{' '}
                    required{' '}
                    {missingRequiredFields.length ===
                    1
                      ? 'field'
                      : 'fields'}{' '}
                    incomplete
                  </strong>

                  <span>
                    Complete the
                    required
                    documentation
                    to continue.
                  </span>
                </>
              ) : (
                <>
                  <strong className="ehr-footer-success">
                    Documentation
                    complete
                  </strong>

                  <span>
                    All required
                    fields have
                    been
                    completed.
                  </span>
                </>
              )
            ) : (
              <>
                <strong>
                  Patient record
                </strong>

                <span>
                  No required
                  documentation
                  at this stage.
                </span>
              </>
            )}
          </div>

          <div className="ehr-footer-actions">
            <button
              type="button"
              className="ehr-secondary-button"
              onClick={onClose}
            >
              Close
            </button>

            {requiredFields.length >
              0 && (
              <button
                type="button"
                className="primary-action ehr-save-button"
                onClick={
                  onContinue
                }
              >
                Save &amp;
                continue
                <span>→</span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}

export default EHRPanel