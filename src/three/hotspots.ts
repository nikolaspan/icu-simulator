import * as THREE from 'three'
import type { HotspotId } from '../engine/types'

export function createHotspots(scene: THREE.Scene, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement,
  onClick: (id: HotspotId) => void, onHover: (id: HotspotId | null) => void) {
  const objects: THREE.Object3D[] = []
  const helpers = new Map<HotspotId, THREE.LineSegments>()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hits: THREE.Intersection[] = []
  let hovered: HotspotId | null = null
  let selected: HotspotId | null = null
  let start: { x: number; y: number; id: number } | null = null
  let dragged = false
  let enabled = true
  let multitouch = false
  let cameraDragging = false
  const pointers = new Set<number>()

  function register(object: THREE.Object3D, id: HotspotId) {
    object.traverse(child => {
      if (child instanceof THREE.Mesh) { child.userData.hotspot = id; objects.push(child) }
    })
    // Short corner brackets identify the volume without drawing a cage around it.
    const bounds = new THREE.Box3().setFromObject(object).expandByScalar(0.07)
    const points: THREE.Vector3[] = []
    const { min, max } = bounds
    const length = Math.min(0.24, (max.x - min.x) / 4, (max.y - min.y) / 4)
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
      const corner = new THREE.Vector3(x, y, z)
      points.push(corner, new THREE.Vector3(x + (x === min.x ? length : -length), y, z),
        corner, new THREE.Vector3(x, y + (y === min.y ? length : -length), z),
        corner, new THREE.Vector3(x, y, z + (z === min.z ? length : -length)))
    }
    const helper = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: '#176c76', transparent: true, opacity: 0.65, depthWrite: false }))
    helper.visible = false
    scene.add(helper)
    helpers.set(id, helper)
  }
  function highlight(id: HotspotId | null, selection = selected) {
    selected = selection
    helpers.forEach((helper, key) => {
      helper.visible = enabled && (key === id || key === selected)
      const material = helper.material as THREE.LineBasicMaterial
      material.opacity = key === selected ? 1 : 0.65
      material.color.set(key === selected ? '#13565e' : '#368590')
    })
    canvas.style.cursor = cameraDragging ? 'grabbing' : id ? 'pointer' : 'default'
  }
  function hover(id: HotspotId | null) {
    if (id !== hovered) { hovered = id; highlight(id); onHover(id) }
    else canvas.style.cursor = cameraDragging ? 'grabbing' : id ? 'pointer' : 'default'
  }
  function find(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null
    pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1
    pointer.y = -(event.clientY - rect.top) / rect.height * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    hits.length = 0
    raycaster.intersectObjects(objects, false, hits)
    const id = hits[0]?.object.userData.hotspot
    // Only IDs registered by this scene can become an interaction.
    return typeof id === 'string' && helpers.has(id as HotspotId) ? id as HotspotId : null
  }
  function down(event: PointerEvent) {
    if (!enabled) return
    if (event.button !== 0) { cancel(); cameraDragging = true; highlight(null); return }
    pointers.add(event.pointerId)
    if (pointers.size > 1) { multitouch = true; dragged = true; return }
    start = { x: event.clientX, y: event.clientY, id: event.pointerId }
    dragged = false
    multitouch = false
  }
  function move(event: PointerEvent) {
    if (!enabled) return
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) dragged = true
    if (dragged && event.pointerType === 'touch') cameraDragging = true
    if (dragged || cameraDragging) { hover(null); canvas.style.cursor = cameraDragging ? 'grabbing' : 'default' }
    else hover(find(event))
  }
  function up(event: PointerEvent) {
    if (enabled && start?.id === event.pointerId && !dragged && !multitouch && event.button === 0) {
      const id = find(event)
      if (id) onClick(id)
    }
    pointers.delete(event.pointerId)
    if (!pointers.size) { start = null; dragged = false; multitouch = false; cameraDragging = false }
    if (enabled) hover(event.pointerType === 'touch' ? null : find(event))
  }
  function cancel() { pointers.clear(); start = null; dragged = false; multitouch = false; cameraDragging = false; hover(null) }
  function leave() { if (!start) hover(null) }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  canvas.addEventListener('pointerleave', leave)
  return {
    register, highlight,
    setEnabled(value: boolean) { enabled = value; if (!value) cancel(); highlight(hovered) },
    dispose() {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('lostpointercapture', cancel)
      canvas.removeEventListener('pointerleave', leave)
    },
  }
}
