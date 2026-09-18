# ICU simulator visual and interaction update

## Scope and audit

The original implementation had working scenario transitions, scoring, logging, exports, and required-field validation. The audit found washed-out lighting, nearly uniform materials, sparse equipment silhouettes, an EHR cart obscuring the patient, box-shaped selection outlines, weak selection persistence, and the active task appearing below the room on mobile.

Browser testing additionally exposed feedback covering equipment controls, residual camera inertia after resetting the view, and inconsistent native dialog Tab wrapping in Firefox. These were corrected. Right-drag rotation and action-driven documentation defaults were added according to the follow-up request.

Scoring, branching, timeout duration, physiological effects, and manual clinical judgments remain unchanged. The JSON additions declare known documentation values and improve feedback text. Pre-existing edits to the scenario engine and logger were preserved.

## Implementation

- Clinical design tokens, readable vital hierarchy, countdown urgency at 10 and 5 seconds, explicit documentation gates, and responsive task-first layouts.
- Primitive-built bed rails, mattress, patient, wall services, IV assembly, ventilator cart and tubing, computer workstation, and wall-mounted call control.
- Three small reusable CanvasTextures. Monitor values and alarm state follow scenario data; FiO₂ displays 100% only after the intervention. Waveforms are identified as simulated. The EHR display is static.
- Short hover brackets and persistent selection brackets; keyboard equipment navigation and explicit mouse/touch instructions.
- Right-drag rotates; left-click interacts; left-drag does not rotate or select; wheel/middle-drag zoom. Context-menu suppression is limited to the canvas.
- A 40° camera FOV, bounded azimuth/elevation, minimum distance 9 and desktop maximum 19. Narrow viewports adjust the framing without losing the user's orbit. Reset clears residual damping.
- A single cached 1024² shadow map, shared geometry/material caches, capped pixel ratio, and no per-frame screen redraws. Cleanup stops rendering, removes listeners, disconnects observers, disposes scene resources once, and releases the old WebGL context.
- Feedback occupies normal flow beneath the header. Its surface ignores pointer events; only Dismiss handles pointer input. Feedback remains visible for seven seconds.
- EHR validation starts neutral, identifies missing fields after submission, retains drafts, and focuses the first missing field. Closing preserves draft values; passing a gate requires Save & continue.
- Accessible SVG vital history based only on recorded changes, explicit autofill provenance, modal focus wrapping with Escape/Close, and a result-first debrief with decisions, documentation, final vitals, and secondary exports.

## Extending documentation autofill

An optional `documentation_defaults` map belongs to a decision option. Its keys must reference existing EHR fields; values and provenance must be non-empty text. Existing scenarios without the map continue to work.

```json
"documentation_defaults": {
  "intervention_form.fiO2_setting": {
    "value": "100%",
    "source": "ventilator intervention"
  }
}
```

The session helper processes only newly completed actions, independent of exact node IDs and whether logging is enabled. It initializes empty fields and preserves non-empty values. Editing a field removes its autofill label. Reopening, ticking, or saving never reapplies defaults, including after deliberate clearing. Restart clears values and provenance.

The supplied scenario initializes FiO₂ to `100%` after the oxygen intervention and recipient to `On-duty physician` after the physician call. Observation, skin colour, consciousness, communication reason, and outcome remain manual.

## Reproducing validation

No packages are required beyond the existing project and system Firefox/geckodriver.

```bash
npm run build
npm run lint
node --import ./tests/register-typescript.mjs tests/engine.test.mjs
```

In separate terminals, start the app and installed browser driver:

```bash
npm run dev -- --host 127.0.0.1
geckodriver --port 4444
```

Run browser phases sequentially because they share one browser session:

```bash
node tests/browser_setup.mjs
node tests/browser_acceptance.mjs path
node tests/browser_acceptance.mjs graphics
node tests/browser_acceptance.mjs timeout
node tests/browser_acceptance.mjs responsive
node tests/browser_acceptance.mjs repeat
node tests/browser_setup.mjs --reduced-motion
node tests/browser_acceptance.mjs reduced
node tests/browser_setup.mjs --close
```

Setup creates its own headless browser session and replaces only the session recorded in `/tmp/icu-browser-session.json`. Exports go to ignored `dist/validation-downloads`; a later production build clears them. Screenshots are written to `/tmp/icu-*.png`. Exact mobile CSS viewports use Firefox WebDriver BiDi rather than minimum desktop window sizes. The graphics probe uses Three.js scene callbacks inside the browser and does not add production diagnostics or a test framework.

## Results

- Production build: PASS. Vite still reports the existing advisory about a bundle larger than 500 kB; this is not a build error.
- ESLint: PASS.
- Engine checks: 10/10 PASS, including all 12 scenario branches and new autofill/schema/override tests.
- Full successful browser path: PASS. Five actual raycast hotspots, hover, drag rejection, assessment, intervention, both documentation gates, manual override preservation, debrief, downloaded JSON/CSV contents, logs, and reset.
- Real 30-second timeout: PASS. Amber/red urgency, one timeout, SpO₂ 85 / HR 120, successful subsequent intervention, continued documentation/escalation, and verified exported logs.
- Two complete consecutive sessions using Restart: PASS. Fresh drafts, scoring, logs, and exports; no stale session state.
- Graphics: PASS. Right-drag rotates, left-drag cannot rotate/select, wheel zoom works, context menu remains available outside the canvas, orbit/zoom are bounded, and interventions preserve the camera and scene instance.
- Alarm: PASS. Actual lamp emission pulses at SpO₂ 88, becomes zero after recovery to 94, and remains zero. Existing monitor/ventilator textures update; the static EHR texture does not.
- Five repeated resets: PASS. Live counts stay at 74 geometries and 6 textures; approximately 126 draw calls and 6,726 triangles in the default view. Discarded contexts are lost, their geometries are released, their animation loops stop, their canvas listeners are removed, and only the current ResizeObserver remains. Renderer-internal fallback texture counters can remain on disposed renderer objects, so cleanup also verifies context release.
- Responsive and accessibility: PASS at actual CSS widths 1024, 768, 390, and 320. No horizontal page overflow; task visibility, mobile timer/forms, focus restoration, Tab containment, and Escape work. Screenshots were visually inspected.
- Reduced motion: PASS. Alarm lamp is steady and dialog animation is disabled.
- No browser console errors in passing browser phases.
- `package.json` and `package-lock.json`: unchanged, verified by empty Git diff and matching SHA-256 hashes. No packages installed.

## Files changed

- Scene: `src/three/{primitives,createRoom,createPatient,createEquipment,createICUScene,hotspots,screens}.ts`, `src/types/three.d.ts`, and `src/components/scene/ICUScene.tsx`.
- UI: `src/App.tsx`; layout components `TopBar`, `SimulatorWorkspace`, and `HelpDialog`; simulation components `VitalsPanel`, `ObjectivePanel`, and `InteractionPanel`; common `Modal` and new `EquipmentIcon`.
- EHR: `EHRPanel`, `EHRForm`, `EHRNavigation`, `EHROverview`, and new `VitalTrend` under `src/components/ehr/`.
- Debrief: `src/components/debrief/Debrief.tsx` and `DecisionTimeline.tsx`.
- Styles: `src/styles/{base,layout,simulation,ehr,debrief,responsive}.css`.
- Documentation defaults: new `src/engine/documentationAutofill.ts`, plus `session.ts`, `scenarioValidation.ts`, `types.ts`, `src/hooks/useScenario.ts`, and `public/scenarios/hypoxia.json`.
- Verification: `tests/engine.test.mjs`, `tests/browser_acceptance.mjs`, new `tests/browser_setup.mjs`, and this document.
