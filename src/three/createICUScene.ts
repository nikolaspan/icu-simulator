import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { HotspotId, VitalSigns } from '../engine/types'
import { createPrimitives } from './primitives'
import { createRoom } from './createRoom'
import { createPatient } from './createPatient'
import { createEquipment } from './createEquipment'
import { createHotspots } from './hotspots'

export type CameraAction = 'left' | 'right' | 'in' | 'out' | 'reset'

export function createICUScene(container: HTMLDivElement, onClick: (id: HotspotId) => void, onHover: (id: HotspotId | null) => void, active: HotspotId[]) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#dce5e5')
  scene.fog = new THREE.Fog('#dce5e5', 22, 38)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60)
  const home = new THREE.Vector3(7.1, 6.5, 12.6)
  camera.position.copy(home)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const canvas = renderer.domElement
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', 'Interactive ICU room. Right-drag to rotate; scroll to zoom; left-click equipment to interact. Left and right arrow keys rotate; plus and minus zoom; Home resets the view. On touch screens, drag to rotate and pinch to zoom.')
  canvas.style.touchAction = 'none'
  container.appendChild(canvas)

  const controls = new OrbitControls(camera, canvas)
  controls.mouseButtons.LEFT = null
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY
  controls.target.set(0, 1.75, -0.15)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.minDistance = 9
  controls.maxDistance = 19
  controls.minPolarAngle = Math.PI / 5
  controls.maxPolarAngle = Math.PI / 2.35
  controls.minAzimuthAngle = -0.22
  controls.maxAzimuthAngle = 0.95
  scene.add(new THREE.HemisphereLight('#edf5f6', '#95a4a6', 1.8))
  const mainLight = new THREE.DirectionalLight('#fffaf0', 2.1)
  mainLight.position.set(-3, 9, 4)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.set(1024, 1024)
  Object.assign(mainLight.shadow.camera, { left: -9, right: 9, top: 8, bottom: -7, near: 0.5, far: 25 })
  mainLight.shadow.camera.updateProjectionMatrix()
  mainLight.shadow.bias = -0.0003
  mainLight.shadow.normalBias = 0.035
  scene.add(mainLight)
  const fillLight = new THREE.DirectionalLight('#d7eaf1', 0.8)
  fillLight.position.set(4, 5, -3)
  scene.add(fillLight)

  const primitives = createPrimitives()
  createRoom(scene, primitives)
  const patient = createPatient(primitives)
  const equipment = createEquipment(primitives)
  scene.add(equipment.breathingCircuit)
  const hotspots = createHotspots(scene, camera, canvas, onClick, onHover)
  const groups: [HotspotId, THREE.Group][] = [
    ['hs_patient', patient], ['hs_monitor', equipment.monitorGroup], ['hs_ventilator', equipment.ventilatorGroup],
    ['hs_ehr', equipment.ehrGroup], ['hs_call', equipment.callGroup],
  ]
  groups.forEach(([id, group]) => { scene.add(group); if (active.includes(id)) hotspots.register(group, id) })
  scene.updateMatrixWorld(true)
  // The room and its equipment are stationary: calculate shadows once.
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true

  let alarm = false
  let enabled = true
  let contextLost = false
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reducedMotion = motion.matches
  function updateMotion() { reducedMotion = motion.matches; controls.enableDamping = !reducedMotion }
  updateMotion()
  motion.addEventListener('change', updateMotion)

  // Reuse vectors for keyboard controls and allocate nothing in the animation loop.
  const offset = new THREE.Vector3()
  const upAxis = new THREE.Vector3(0, 1, 0)
  function moveCamera(action: CameraAction) {
    if (!enabled) return
    if (action === 'reset') {
      // Flush drag inertia before restoring the view so reset lands exactly home.
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      camera.position.copy(home)
      controls.target.set(0, 1.75, -0.15)
      controls.update()
      controls.enableDamping = damping
    }
    else {
      offset.copy(camera.position).sub(controls.target)
      if (action === 'left' || action === 'right') offset.applyAxisAngle(upAxis, action === 'left' ? -0.15 : 0.15)
      else offset.multiplyScalar(action === 'in' ? 0.9 : 1.1)
      camera.position.copy(controls.target).add(offset)
    }
    controls.update()
  }
  function keydown(event: KeyboardEvent) {
    const actions: Record<string, CameraAction> = { ArrowLeft: 'left', ArrowRight: 'right', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' }
    const action = actions[event.key]
    if (action) { event.preventDefault(); moveCamera(action) }
  }
  canvas.addEventListener('keydown', keydown)
  // OrbitControls also suppresses its own context menu. Keep this canvas-only
  // guard active while a dialog temporarily disables the controls.
  function contextmenu(event: MouseEvent) { event.preventDefault() }
  canvas.addEventListener('contextmenu', contextmenu)
  function resize() {
    const { clientWidth: width, clientHeight: height } = container
    if (!width || !height) return
    camera.aspect = width / height
    // Preserve the complete bedside composition in narrower room panels.
    const distance = Math.max(1, 1.25 / camera.aspect)
    home.set(7.1 * distance, 1.75 + 4.75 * distance, -0.15 + 12.75 * distance)
    controls.maxDistance = Math.max(19, 15.5 * distance)
    if (!hasResized) { camera.position.copy(home); hasResized = true }
    else if (distance !== fitScale) {
      // Resize the framing while preserving the user's orbit and relative zoom.
      offset.copy(camera.position).sub(controls.target).multiplyScalar(distance / fitScale)
      camera.position.copy(controls.target).add(offset)
    }
    fitScale = distance
    controls.update()
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  let hasResized = false
  let fitScale = 1
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()
  function render(time: number) {
    if (document.hidden || contextLost) return
    equipment.alarmMaterial.emissiveIntensity = alarm ? (reducedMotion ? 0.7 : 0.65 + Math.sin(time / 1000 * 4) * 0.35) : 0
    if (enabled) controls.update()
    renderer.render(scene, camera)
  }
  function lost(event: Event) { event.preventDefault(); contextLost = true; onHover(null); console.warn('The ICU graphics context was lost; waiting for the browser to restore it.') }
  function restored() { contextLost = false; renderer.shadowMap.needsUpdate = true }
  canvas.addEventListener('webglcontextlost', lost)
  canvas.addEventListener('webglcontextrestored', restored)
  renderer.setAnimationLoop(render)

  return {
    moveCamera,
    highlight: hotspots.highlight,
    setClinicalState(vitals: VitalSigns, value: boolean, oxygenAdjusted: boolean) {
      alarm = value
      equipment.alarmMaterial.color.set(value ? '#d85b60' : '#cbd5d2')
      equipment.alarmMaterial.emissiveIntensity = value ? 0.7 : 0
      equipment.monitorDisplay.update(vitals, value)
      equipment.ventilatorDisplay.update(oxygenAdjusted)
      canvas.dataset.alarm = value ? 'active' : 'inactive'
    },
    setEnabled(value: boolean) { enabled = value; controls.enabled = value; hotspots.setEnabled(value) },
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      motion.removeEventListener('change', updateMotion)
      hotspots.dispose()
      controls.dispose()
      canvas.removeEventListener('keydown', keydown)
      canvas.removeEventListener('contextmenu', contextmenu)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          geometries.add(object.geometry)
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
        }
      })
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      equipment.dispose()
      mainLight.shadow.dispose()
      renderer.dispose()
      // Release the discarded canvas context, including renderer-owned fallback
      // textures. This avoids retaining GPU contexts across repeated restarts.
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
