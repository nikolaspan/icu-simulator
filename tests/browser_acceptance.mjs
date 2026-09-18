// Uses an already-installed Firefox/geckodriver, Node fetch/WebSocket, and Three.js.
// No browser automation dependency is required. See VALIDATION.md for setup.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import * as THREE from 'three'
import { fileURLToPath } from 'node:url'
const downloadDirectory = fileURLToPath(new URL('../dist/validation-downloads/', import.meta.url))

const saved = JSON.parse(await fs.readFile('/tmp/icu-browser-session.json', 'utf8')).value
const root = `http://127.0.0.1:4444/session/${saved.sessionId}`
const phase = process.argv[2] ?? 'smoke'
const events = []
const ws = new WebSocket(saved.capabilities.webSocketUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
const pending = new Map()
let commandId = 10
ws.onmessage = event => {
  const data = JSON.parse(event.data)
  if (data.method === 'log.entryAdded') events.push(data.params)
  if (pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id)
    pending.delete(data.id)
    if (data.type === 'error') reject(new Error(JSON.stringify(data)))
    else resolve(data.result)
  }
}
function bidi(method, params) {
  return new Promise((resolve, reject) => {
    const id = commandId++
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
} 
ws.send(JSON.stringify({ id: 1, method: 'session.subscribe', params: { events: ['log.entryAdded'] } }))
async function wd(path, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(root + path, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  const result = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(result))
  return result.value
}
const js = (script, args = []) => wd('/execute/sync', { script, args })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function wait(check, description, timeout = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeout) { if (await check()) return; await sleep(100) }
  throw new Error('Timed out: ' + description)
}
async function element(selector) { return wd('/element', { using: 'css selector', value: selector }) }
const idOf = element => element['element-6066-11e4-a52e-4f735466cecf']
async function click(selector) { const target = await element(selector); await wd(`/element/${idOf(target)}/click`, {}) }
async function clickText(text, scope = 'body') {
  const target = await js('return Array.from(document.querySelector(arguments[1]).querySelectorAll("button")).find(e=>e.textContent.trim().startsWith(arguments[0]) || e.getAttribute("aria-label") === arguments[0])', [text, scope])
  assert.ok(target, `Button exists: ${text}`)
  await wd(`/element/${idOf(target)}/click`, {})
}
async function clearInput(id) { const target = await element(`[id="${id}"]`); await wd(`/element/${idOf(target)}/clear`, {}) }
async function input(id, text) { const target = await element(`[id="${id}"]`); await wd(`/element/${idOf(target)}/value`, { text }) }
async function keys(text) { await wd('/actions', { actions: [{ type: 'key', id: 'keyboard', actions: [...text].flatMap(value => [{ type: 'keyDown', value }, { type: 'keyUp', value }]) }] }) }
async function screenshot(name) { await sleep(220); await fs.writeFile(`/tmp/icu-${name}.png`, Buffer.from(await wd('/screenshot'), 'base64')) }
async function text(selector) { return js('return document.querySelector(arguments[0])?.textContent', [selector]) }
async function exists(selector) { return js('return Boolean(document.querySelector(arguments[0]))', [selector]) }
async function reset() { await clickText('Reset', '.topbar'); await wait(() => exists('.objective-panel > .primary-action'), 'initial objective') }
async function score(expected) { assert.equal(await js('return document.querySelectorAll(".status-item strong")[1].textContent'), String(expected)) }
async function pointer(x, y, action = 'click', dx = 0, dy = 0, button = 0) {
  const actions = [{ type: 'pointerMove', duration: 100, x: Math.round(x), y: Math.round(y), origin: 'viewport' }]
  if (action !== 'hover') actions.push({ type: 'pointerDown', button })
  if (action === 'drag') actions.push({ type: 'pointerMove', duration: 400, x: Math.round(x + dx), y: Math.round(y + dy), origin: 'viewport' })
  if (action !== 'hover') actions.push({ type: 'pointerUp', button })
  await wd('/actions', { actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions }] })
}
async function point(position) {
  const rect = await js('const r=document.querySelector("canvas").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}')
  const camera = new THREE.PerspectiveCamera(40, rect.width / rect.height, .1, 60)
  const fit = Math.max(1, 1.25 / camera.aspect)
  camera.position.set(7.1 * fit, 1.75 + 4.75 * fit, -0.15 + 12.75 * fit)
  camera.lookAt(0, 1.75, -0.15)
  camera.updateMatrixWorld()
  const p = new THREE.Vector3(...position).project(camera)
  return { x: rect.x + (p.x + 1) / 2 * rect.width, y: rect.y + (1 - p.y) / 2 * rect.height }
}
async function hotspot(position, label, hover = false) {
  const p = await point(position)
  await pointer(p.x, p.y, hover ? 'hover' : 'click')
  if (hover) await wait(async () => (await text('.hover-label'))?.includes(label), `hover ${label}`)
  else await wait(async () => (await text('.interaction-panel h2')) === label, `raycast ${label}`)
}
async function load() {
  await wd('/window/rect', { width: 1440, height: 1050 })
  await wd('/url', { url: 'http://127.0.0.1:5173/' })
  await wait(() => exists('.objective-panel'), 'scenario loads')
  await sleep(500)
}
try {
  if (phase === 'inspect') { await screenshot('inspect'); console.log(await js('return {scrollY,probe:window.icuProbe ? [...window.icuProbe.renderers].map(r=>({...r.info.memory,frames:window.icuProbe.frames.get(r)})) : null,script:[...document.scripts].find(s=>s.text.includes("icuProbe"))?.text,active:document.activeElement?.outerHTML,body:document.body.innerText}')) }
  if (phase === 'smoke') {
    await load()
    console.log(await js('return {title:document.title,canvas:!!document.querySelector("canvas"),error:document.querySelector(".scene-error")?.textContent,width:innerWidth,height:innerHeight,body:document.body.innerText}'))
    await screenshot('desktop-initial')
  }
  if (phase === 'path' || phase === 'repeat') {
    for (let cycle = 0; cycle < (phase === 'repeat' ? 2 : 1); cycle++) {
    if (cycle === 0) await load()
    assert.ok(await exists('canvas'))
    assert.ok((await text('.vital-danger')).includes('88'))
    assert.ok(await exists('.alarm-banner'))
    await score(100)
    await hotspot([.1, 1.53, .6], 'Patient / Bed', true)
    const p = await point([.1, 1.53, .6])
    await pointer(p.x, p.y, 'drag', 80, 25)
    assert.equal(await exists('.interaction-panel'), false, 'drag must not click')
    await clickText('Reset view')
    await sleep(500)
    await click('.objective-panel > .primary-action')
    assert.match(await text('.timeout-badge'), /30s|29s/)
    await hotspot([.1, 1.53, .6], 'Patient / Bed')
    await clickText('Perform immediate patient assessment', '.interaction-panel')
    await score(110)
    await hotspot([3.25, 2.52, -1.3], 'Ventilator')
    await clickText('Increase FiO2 to 100%', '.interaction-panel')
    await score(130)
    assert.equal(await exists('.alarm-banner'), false)
    assert.equal(await js('return document.querySelector("canvas").dataset.alarm'), 'inactive')
    assert.ok((await text('.vitals-panel')).includes('94'))
    assert.ok((await text('.vitals-panel')).includes('100'))
    // Monitor is still interactive after its alarm clears.
    await hotspot([-3.65, 3.05, -1.44], 'Vital Signs Monitor')
    assert.match(await text('.interaction-panel'), /No active oxygen saturation alarm/)
    await click('[aria-label="Close interaction panel"]')
    // EHR terminal uses the real 3D raycast; other checks also use the keyboard controls.
    const ehrPoint = await point([4.55, 2.49, 1.997])
    await pointer(ehrPoint.x, ehrPoint.y)
    await wait(() => exists('dialog[open].ehr-panel'), 'EHR terminal opens')
    assert.equal(await exists('[aria-invalid="true"]'), false, 'required fields are initially neutral')
    assert.equal(await js('return document.querySelector(".ehr-footer button[type=submit]").className'), 'secondary-action')
    await clickText('Intervention / Settings', '.ehr-navigation')
    assert.equal(await js('return document.getElementById("intervention_form.fiO2_setting").value'), '100%')
    assert.match(await text('.ehr-fields'), /Auto-filled from ventilator intervention/)
    await clearInput('intervention_form.fiO2_setting')
    await input('intervention_form.fiO2_setting', '95%')
    await clickText('Save & continue', '.ehr-panel')
    assert.equal(await js('return document.activeElement.id'), 'assessment_form.observation')
    assert.ok(await exists('[aria-invalid="true"]'))
    await score(130)
    assert.equal(await js('return document.getElementById("assessment_form.observation").value'), '', 'observation is manual')
    await input('assessment_form.observation', 'Cyanosis and rapid breathing')
    await score(130)
    await keys('\uE00C')
    assert.equal(await exists('dialog[open]'), false, 'Escape closes EHR')
    await click('#equipment-hs_ehr')
    await clickText('Clinical Assessment', '.ehr-navigation')
    assert.equal(await js('return document.getElementById("assessment_form.observation").value'), 'Cyanosis and rapid breathing')
    await clickText('Intervention / Settings', '.ehr-navigation')
    assert.equal(await js('return document.getElementById("intervention_form.fiO2_setting").value'), '95%', 'manual value survives reopening')
    assert.doesNotMatch(await text('.ehr-fields'), /Auto-filled/)
    await clearInput('intervention_form.fiO2_setting')
    await input('intervention_form.fiO2_setting', '100%')
    assert.equal(await js('return document.querySelector(".ehr-footer button[type=submit]").className'), 'primary-action')
    await screenshot('ehr-complete')
    await clickText('Save & continue', '.ehr-panel')
    assert.equal(await exists('dialog[open]'), false)
    await score(140)
    assert.match(await text('.objective-copy'), /Five minutes later/)
    await click('.objective-panel > .primary-action')
    await hotspot([4.8, 2.4, -4.66], 'Call Button')
    await clickText('Call the physician', '.interaction-panel')
    await score(150)
    await clickText('Open EHR')
    await clickText('Save & continue', '.ehr-panel')
    assert.equal(await js('return document.getElementById("communication_log.recipient").value'), 'On-duty physician')
    assert.match(await text('.ehr-fields'), /Auto-filled from physician call/)
    assert.equal(await js('return document.activeElement.id'), 'communication_log.outcome')
    await input('communication_log.outcome', 'Patient reviewed')
    await clickText('Save & continue', '.ehr-panel')
    await wait(() => exists('.debrief-panel'), 'debrief')
    await score(155)
    assert.equal(await js('return document.querySelectorAll(".debrief-checklist > .complete").length'), 2)
    assert.match(await text('.decision-timeline'), /Perform immediate patient assessment/)
    assert.match(await text('.decision-timeline'), /Increase FiO2 to 100%/)
    await screenshot('debrief')
    const previousDownloads = new Set(await fs.readdir(downloadDirectory))
    await clickText('Export JSON')
    await clickText('Export CSV')
    await sleep(1000)
    await wait(async () => (await fs.readdir(downloadDirectory)).filter(file => !previousDownloads.has(file) && /[.](json|csv)$/.test(file)).length === 2, 'export files downloaded')
    const files = (await fs.readdir(downloadDirectory)).filter(file => !previousDownloads.has(file))
    assert.ok(files.some(file => file.endsWith('.json')), 'JSON download')
    assert.ok(files.some(file => file.endsWith('.csv')), 'CSV download')
    const json = JSON.parse(await fs.readFile(downloadDirectory + '/' + files.find(file => file.endsWith('.json')), 'utf8'))
    assert.equal(json.final_score, 155)
    assert.equal(json.logs.filter(log => log.event_type === 'NODE_ENTER').length, 8, 'StrictMode has no duplicate node logs')
    assert.equal(json.logs.filter(log => log.event_type === 'OPTION_SELECTED').length, 3)
    assert.equal(json.logs.filter(log => log.event_type === 'VITALS_CHANGE').length, 1)
    const csv = await fs.readFile(downloadDirectory + '/' + files.find(file => file.endsWith('.csv')), 'utf8')
    assert.equal(csv.split('\n').length, json.logs.length + 1)
    await clickText('Restart scenario')
    await score(100)
    assert.ok((await text('.vital-danger')).includes('88'))
    assert.equal(await exists('.timeout-badge'), false)
    await click('#equipment-hs_ehr')
    await clickText('Clinical Assessment', '.ehr-navigation')
    assert.equal(await js('return document.getElementById("assessment_form.observation").value'), '')
    await keys('\uE00C')
    console.log('PASS: complete path, five raycast hotspots, autofill, manual overrides, validation, exports, StrictMode logs and restart', {cycle:cycle+1})
    }
  }
  if (phase === 'graphics' || phase === 'reduced') {
    await load()
    // Observe actual render objects from the already-loaded Three.js module.
    // No production diagnostics or extra dependencies are needed.
    const installed = await wd('/execute/async', { script: `
      const done = arguments[arguments.length - 1];
      fetch('/src/three/createICUScene.ts').then(r => r.text()).then(async source => {
        const url = source.match(/from ["']([^"']*three[.]js[^"']*)/)[1];
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = 'import * as THREE from ' + JSON.stringify(url) + ';' +
          'const original = THREE.Scene.prototype.onAfterRender;' +
          'window.icuProbe = { renderers: new Set(), frames: new Map(), listeners: new Map(), observers: new Set() };' +
          'const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;' +
          'EventTarget.prototype.addEventListener = function(type, listener, options) {' +
          'if (this instanceof HTMLCanvasElement) { const entries=window.icuProbe.listeners.get(this)||[]; entries.push({type,listener,capture:typeof options==="boolean"?options:!!options?.capture}); window.icuProbe.listeners.set(this,entries); } return add.call(this,type,listener,options); };' +
          'EventTarget.prototype.removeEventListener = function(type, listener, options) {' +
          'const capture=typeof options==="boolean"?options:!!options?.capture; const entries=window.icuProbe.listeners.get(this); if(entries) window.icuProbe.listeners.set(this,entries.filter(e=>e.type!==type || e.listener!==listener || e.capture!==capture)); return remove.call(this,type,listener,options); };' +
          'const Resize = window.ResizeObserver; window.ResizeObserver = class extends Resize {' +
          'constructor(callback){super(callback);window.icuProbe.observers.add(this)} disconnect(){super.disconnect();window.icuProbe.observers.delete(this)} };' +
          'THREE.Scene.prototype.onAfterRender = function(renderer, scene, camera) {' +
          'Object.assign(window.icuProbe, { scene, camera, renderer });' +
          'window.icuProbe.renderers.add(renderer);' +
          'window.icuProbe.frames.set(renderer, (window.icuProbe.frames.get(renderer) || 0) + 1);' +
          'return original.call(this, renderer, scene, camera); };';
        document.head.appendChild(script);
        done(true);
      }).catch(error => done(String(error)));
    `, args: [] })
    assert.equal(installed, true)
    await wait(() => js('return Boolean(window.icuProbe?.scene)'), 'render probe')
    const snapshot = () => js(`
      const {scene,camera,renderer} = window.icuProbe;
      let lamp; const textures = {};
      scene.traverse(object => {
        if (object.userData.hotspot === 'hs_monitor' && object.material?.emissive?.getHexString() === 'd9494d') lamp = object.material;
        if (object.material?.map) textures[object.userData.hotspot] = {uuid:object.material.map.uuid, version:object.material.map.version};
      });
      return {scene:scene.uuid,camera:camera.position.toArray(),lamp:lamp.emissiveIntensity,color:lamp.color.getHexString(),textures,memory:{...renderer.info.memory},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,shadows:renderer.shadowMap.autoUpdate,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
    `)
    const initial = await snapshot()
    assert.equal(initial.color, 'd85b60')
    assert.ok(initial.lamp > 0)
    assert.equal(initial.shadows, false, 'stationary shadows are cached')
    await sleep(350)
    const later = await snapshot()
    assert.deepEqual(later.textures, initial.textures, 'screens do not redraw every frame')
    if (phase === 'reduced') {
      assert.equal(initial.reduced, true, 'OS reduced-motion preference is enabled')
      assert.equal(initial.lamp, later.lamp, 'alarm lamp is steady with reduced motion')
      await clickText('Help', '.topbar')
      assert.equal(await js('return getComputedStyle(document.querySelector("dialog")).animationName'), 'none')
      await keys('\uE00C')
      console.log('PASS: reduced-motion preference disables panel animation and alarm pulsing')
    } else {
      assert.notEqual(initial.lamp, later.lamp, 'active alarm lamp pulses')
      const p = await point([.1, 1.53, .6])
      await pointer(p.x, p.y, 'drag', 65, 20)
      await sleep(300)
      assert.deepEqual((await snapshot()).camera, initial.camera, 'left drag cannot rotate')
      assert.equal(await exists('.interaction-panel'), false, 'left drag cannot select')
      await pointer(p.x, p.y, 'drag', 65, 20, 2)
      await sleep(1700)
      let moved = await snapshot()
      assert.notDeepEqual(initial.camera, moved.camera, 'right drag rotates')
      assert.equal(await exists('.interaction-panel'), false, 'right drag cannot select')
      assert.equal(await js('return document.querySelector("canvas").dispatchEvent(new MouseEvent("contextmenu",{bubbles:true,cancelable:true}))'), false, 'canvas context menu suppressed')
      assert.equal(await js('return document.querySelector(".topbar").dispatchEvent(new MouseEvent("contextmenu",{bubbles:true,cancelable:true}))'), true, 'outside context menu preserved')
      const beforeWheel = Math.hypot(moved.camera[0], moved.camera[1]-1.75, moved.camera[2]+.15)
      await wd('/actions', { actions: [{ type:'wheel', id:'wheel', actions:[{type:'scroll',x:Math.round(p.x),y:Math.round(p.y),deltaX:0,deltaY:-120,duration:100,origin:'viewport'}] }] })
      await sleep(600)
      moved = await snapshot()
      assert.ok(Math.hypot(moved.camera[0],moved.camera[1]-1.75,moved.camera[2]+.15) < beforeWheel, 'mouse wheel zooms')
      await click('.objective-panel > .primary-action')
      await click('#equipment-hs_patient')
      await clickText('Perform immediate patient assessment', '.interaction-panel')
      await click('#equipment-hs_ventilator')
      await clickText('Increase FiO2 to 100%', '.interaction-panel')
      const recovered = await snapshot()
      assert.equal(recovered.scene, initial.scene, 'state changes retain the scene instance')
      assert.ok(recovered.camera.every((value,index)=>Math.abs(value-moved.camera[index])<.005), 'interventions preserve the camera')
      assert.equal(recovered.lamp, 0)
      assert.equal(recovered.color, 'cbd5d2')
      assert.equal(recovered.textures.hs_monitor.uuid, initial.textures.hs_monitor.uuid)
      assert.ok(recovered.textures.hs_monitor.version > initial.textures.hs_monitor.version)
      assert.ok(recovered.textures.hs_ventilator.version > initial.textures.hs_ventilator.version)
      assert.equal(recovered.textures.hs_ehr.version, initial.textures.hs_ehr.version)
      await sleep(1200)
      assert.equal((await snapshot()).lamp, 0, 'recovered lamp remains off')
      await click('#equipment-hs_monitor')
      await pointer(25, 80, 'hover')
      assert.equal(await js('return window.icuProbe.scene.children.filter(o=>o.isLineSegments && o.visible).length'), 1, 'selection remains after pointer leaves')
      await click('[aria-label="Close interaction panel"]')
      await js('document.activeElement.blur()')
      await pointer(25, 80, 'hover')
      await clickText('Reset view')
      // Apply repeated controls in one event loop to verify hard orbit/zoom bounds.
      await js('for(let i=0;i<60;i++) document.querySelectorAll(".camera-controls button")[2].click()')
      await sleep(300)
      const near = await snapshot()
      assert.ok(Math.hypot(near.camera[0],near.camera[1]-1.75,near.camera[2]+.15) >= 8.99)
      await js('for(let i=0;i<60;i++) document.querySelectorAll(".camera-controls button")[1].click()')
      await sleep(300)
      const rotated = await snapshot()
      assert.ok(Math.atan2(rotated.camera[0],rotated.camera[2]+.15) <= .9501)
      assert.ok(rotated.camera[1] > 3, 'camera stays above equipment/floor')
      await js('for(let i=0;i<60;i++) document.querySelectorAll(".camera-controls button")[3].click()')
      await sleep(300)
      const far = await snapshot()
      assert.ok(Math.hypot(far.camera[0],far.camera[1]-1.75,far.camera[2]+.15) <= 19.01, 'zoom-out is bounded')
      await clickText('Reset view')
      for (let i=0;i<5;i++) {
        await reset()
        await sleep(200)
        const fresh = await snapshot()
        assert.deepEqual(fresh.memory, initial.memory, 'renderer resources remain bounded after restart')
        assert.equal(await js('return document.querySelectorAll(".icu-scene canvas").length'), 1)
      }
      const disposed = await js('return [...window.icuProbe.renderers].filter(r=>r!==window.icuProbe.renderer).map(r=>({...r.info.memory,lost:r.getContext().isContextLost(),frames:window.icuProbe.frames.get(r)}))')
      assert.ok(disposed.every(memory => memory.geometries === 0 && memory.lost), 'old geometry and GPU contexts are released')
      await sleep(500)
      const stopped = await js('return [...window.icuProbe.renderers].filter(r=>r!==window.icuProbe.renderer).map(r=>window.icuProbe.frames.get(r))')
      assert.deepEqual(stopped, disposed.map(item=>item.frames), 'discarded animation loops remain stopped')
      assert.equal(await js('return [...window.icuProbe.listeners].filter(([canvas])=>!canvas.isConnected).reduce((sum,[,entries])=>sum+entries.length,0)'), 0, 'discarded canvas listeners are removed')
      assert.equal(await js('return window.icuProbe.observers.size'), 1, 'only the current ResizeObserver remains')
      console.log('PASS: actual lamp/texture synchronization, no per-frame texture updates, persistent camera, selection, orbit limits, five resets and GPU disposal', {memory:initial.memory,calls:initial.calls,triangles:initial.triangles})
    }
  }
  if (phase === 'timeout') {
    await load()
    await click('.objective-panel > .primary-action')
    await wait(() => exists('.timeout-badge'), 'timer')
    await sleep(20300)
    assert.ok(await exists('.timeout-badge.warning'))
    await sleep(5100)
    assert.ok(await exists('.timeout-badge.urgent'))
    await sleep(5600)
    await score(90)
    assert.ok((await text('.vital-danger')).includes('85'))
    assert.ok((await text('.vitals-panel')).includes('120'))
    assert.equal(await exists('.timeout-badge'), false)
    assert.match(await text('.objective-copy'), /ventilator oxygen setting/)
    await sleep(1200)
    await score(90)
    await screenshot('timeout')
    await click('#equipment-hs_ventilator')
    await clickText('Increase FiO2 to 100%', '.interaction-panel')
    await clickText('Open EHR')
    await clickText('Clinical Assessment', '.ehr-navigation')
    await input('assessment_form.observation', 'Assessment after delayed response')
    await clickText('Save & continue', '.ehr-panel')
    await click('.objective-panel > .primary-action')
    await click('#equipment-hs_call')
    await clickText('Call the physician', '.interaction-panel')
    await clickText('Open EHR')
    await clickText('Communication Log', '.ehr-navigation')
    await input('communication_log.outcome', 'Physician reviewed')
    await clickText('Save & continue', '.ehr-panel')
    await score(135)
    const previousFiles = new Set(await fs.readdir(downloadDirectory))
    await clickText('Export JSON')
    await wait(async () => (await fs.readdir(downloadDirectory)).some(file=>!previousFiles.has(file)&&file.endsWith('.json')), 'timeout export')
    const filename = (await fs.readdir(downloadDirectory)).find(file=>!previousFiles.has(file)&&file.endsWith('.json'))
    const exported = JSON.parse(await fs.readFile(downloadDirectory + '/' + filename, 'utf8'))
    assert.equal(exported.decision_path.filter(id=>id.endsWith(':timeout')).length, 1)
    assert.equal(exported.logs.filter(log=>log.event_type==='VITALS_CHANGE').length, 2)
    assert.equal(exported.logs.filter(log=>log.event_type==='NODE_ENTER').length, 8)
    console.log('PASS: real 30-second timeout, warning/danger countdown, effects once, continued interaction and no duplicate logs')
  }
  if (phase === 'responsive') {
    await load()
    await clickText('Help', '.topbar')
    assert.ok(await exists('dialog[open].help-modal'))
    await js('document.querySelector(".help-modal .primary-action").focus()')
    await keys('\uE004')
    assert.equal(await js('return Boolean(document.activeElement.closest("dialog[open]"))'), true, 'native focus trap')
    await keys('\uE00C')
    assert.equal(await js('return document.activeElement.textContent'), 'Help', 'focus restoration')
    const { contexts } = await bidi('browsingContext.getTree', {})
    for (const width of [1024, 768, 390, 320]) {
      await bidi('browsingContext.setViewport', { context: contexts[0].context, viewport: { width, height: 900 } })
      assert.equal(await js('return innerWidth'), width, 'test the actual CSS viewport width')
      await sleep(250)
      assert.equal(await js('return document.documentElement.scrollWidth <= innerWidth'), true, `no horizontal overflow at ${width}`)
      assert.equal(await js('return getComputedStyle(document.querySelector(".objective-panel")).display !== "none"'), true)
      await screenshot(`responsive-${width}`)
    }
    await reset()
    await click('.objective-panel > .primary-action')
    assert.equal(await js('return getComputedStyle(document.querySelector(".timeout-badge")).display !== "none"'), true)
    await click('#equipment-hs_patient')
    await clickText('Perform immediate patient assessment', '.interaction-panel')
    await click('#equipment-hs_ventilator')
    await clickText('Increase FiO2 to 100%', '.interaction-panel')
    await clickText('Open EHR')
    await clickText('Save & continue', '.ehr-panel')
    assert.equal(await js('return document.activeElement.id'), 'assessment_form.observation')
    assert.equal(await js('return document.documentElement.scrollWidth <= innerWidth'), true)
    await screenshot('ehr-mobile-error')
    await keys('\uE00C')
    console.log('PASS: keyboard dialogs, focus restoration, actual 1024/768/390/320px viewports, mobile timer and EHR errors')
    await bidi('browsingContext.setViewport', { context:contexts[0].context, viewport:null })
  }
  await sleep(100)
  const errors = events.filter(event => event.level === 'error')
  console.log('Browser errors:', JSON.stringify(errors))
  assert.equal(errors.length, 0)
} finally {
  ws.close()
}
