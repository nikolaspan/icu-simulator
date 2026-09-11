import * as THREE from 'three'
import type { HotspotId } from '../engine/types'

export function createHotspots(scene: THREE.Scene, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement,
  onClick: (id: HotspotId) => void, onHover: (id: HotspotId | null) => void) {
  const objects: THREE.Object3D[] = []
  const helpers = new Map<HotspotId, THREE.BoxHelper>()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hits: THREE.Intersection[] = []
  let hovered: HotspotId | null = null
  let start: { x: number; y: number; id: number } | null = null
  let dragged = false
  let enabled = true
  let multitouch = false
  const pointers = new Set<number>()

  function register(object: THREE.Object3D, id: HotspotId) {
    object.traverse(child => {
      if (child instanceof THREE.Mesh) { child.userData.hotspot = id; objects.push(child) }
    })
    const helper = new THREE.BoxHelper(object, new THREE.Color('#147788'))
    helper.visible = false
    scene.add(helper)
    helpers.set(id, helper)
  }
  function highlight(id: HotspotId | null) {
    if (hovered) { const helper = helpers.get(hovered); if (helper) helper.visible = false }
    hovered = id
    if (id) { const helper = helpers.get(id); if (helper) { helper.update(); helper.visible = true } }
    canvas.style.cursor = dragged ? 'grabbing' : id ? 'pointer' : 'grab'
  }
  function hover(id: HotspotId | null) {
    if (id !== hovered) { highlight(id); onHover(id) }
    else canvas.style.cursor = dragged ? 'grabbing' : id ? 'pointer' : 'grab'
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
    if (!enabled || event.button !== 0) return
    pointers.add(event.pointerId)
    if (pointers.size > 1) { multitouch = true; dragged = true; return }
    start = { x: event.clientX, y: event.clientY, id: event.pointerId }
    dragged = false
    multitouch = false
  }
  function move(event: PointerEvent) {
    if (!enabled) return
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) dragged = true
    if (dragged) { highlight(null); canvas.style.cursor = 'grabbing' }
    else hover(find(event))
  }
  function up(event: PointerEvent) {
    if (enabled && start?.id === event.pointerId && !dragged && !multitouch && event.button === 0) {
      const id = find(event)
      if (id) onClick(id)
    }
    pointers.delete(event.pointerId)
    if (!pointers.size) { start = null; dragged = false; multitouch = false }
    if (enabled) hover(event.pointerType === 'touch' ? null : find(event))
  }
  function cancel() { pointers.clear(); start = null; dragged = false; multitouch = false; hover(null) }
  function leave() { if (!start) hover(null) }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  canvas.addEventListener('pointerleave', leave)
  return {
    register, highlight,
    setEnabled(value: boolean) { enabled = value; if (!value) cancel() },
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
