import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { HotspotId } from '../engine/types'
import { createPrimitives } from './primitives'
import { createRoom } from './createRoom'
import { createPatient } from './createPatient'
import { createEquipment } from './createEquipment'
import { createHotspots } from './hotspots'

export type CameraAction = 'left' | 'right' | 'in' | 'out' | 'reset'

export function createICUScene(container: HTMLDivElement, onClick: (id: HotspotId) => void, onHover: (id: HotspotId | null) => void, active: HotspotId[]) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#dce7ea')
  scene.fog = new THREE.Fog('#dce7ea', 14, 24)
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100)
  camera.position.set(8.5, 5.6, 9.5)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const canvas = renderer.domElement
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', 'Interactive ICU room. Left and right arrows rotate; plus and minus zoom; Home resets the view. Equipment buttons follow the room.')
  canvas.style.touchAction = 'none'
  container.appendChild(canvas)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 1.5, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.minDistance = 6
  controls.maxDistance = 14
  controls.minPolarAngle = Math.PI / 5
  controls.maxPolarAngle = Math.PI / 2.05
  scene.add(new THREE.HemisphereLight('#f8fdff', '#71848b', 2.4))
  const mainLight = new THREE.DirectionalLight('#ffffff', 2.8)
  mainLight.position.set(4, 8, 5)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.set(2048, 2048)
  scene.add(mainLight)
  const clinicalLight = new THREE.PointLight('#c9eff7', 12, 10)
  clinicalLight.position.set(-2, 4.3, -1)
  scene.add(clinicalLight)

  const primitives = createPrimitives()
  createRoom(scene, primitives)
  const patient = createPatient(primitives)
  const equipment = createEquipment(primitives)
  const hotspots = createHotspots(scene, camera, canvas, onClick, onHover)
  const groups: [HotspotId, THREE.Group][] = [
    ['hs_patient', patient], ['hs_monitor', equipment.monitorGroup], ['hs_ventilator', equipment.ventilatorGroup],
    ['hs_ehr', equipment.ehrGroup], ['hs_call', equipment.callGroup],
  ]
  groups.forEach(([id, group]) => { scene.add(group); if (active.includes(id)) hotspots.register(group, id) })
  scene.updateMatrixWorld(true)

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
    if (action === 'reset') { camera.position.set(8.5, 5.6, 9.5); controls.target.set(0, 1.5, 0) }
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
  function resize() {
    const { clientWidth: width, clientHeight: height } = container
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()
  function render(time: number) {
    if (document.hidden || contextLost) return
    equipment.alarmMaterial.emissiveIntensity = alarm ? (reducedMotion ? 1.7 : 1.7 + Math.sin(time / 1000 * 5) * 1.2) : 0
    if (enabled) controls.update()
    renderer.render(scene, camera)
  }
  function lost(event: Event) { event.preventDefault(); contextLost = true; onHover(null); console.warn('The ICU graphics context was lost; waiting for the browser to restore it.') }
  function restored() { contextLost = false }
  canvas.addEventListener('webglcontextlost', lost)
  canvas.addEventListener('webglcontextrestored', restored)
  renderer.setAnimationLoop(render)

  return {
    moveCamera,
    highlight: hotspots.highlight,
    setAlarm(value: boolean) { alarm = value; equipment.alarmLight.visible = value },
    setEnabled(value: boolean) { enabled = value; controls.enabled = value; hotspots.setEnabled(value) },
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      motion.removeEventListener('change', updateMotion)
      hotspots.dispose()
      controls.dispose()
      canvas.removeEventListener('keydown', keydown)
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
      mainLight.shadow.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
