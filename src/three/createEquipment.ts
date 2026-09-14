import * as THREE from 'three'
import type { Primitives, Finish } from './primitives'
import { createEHRDisplay, createMonitorDisplay, createVentilatorDisplay } from './screens'

export function createEquipment({ createBox, createCylinder, createTube }: Primitives) {
  function box(group: THREE.Group, w: number, h: number, d: number, color: string, x: number, y: number, z: number, finish: Finish = 'paint', shadow = false) {
    const mesh = createBox(w, h, d, color, finish)
    mesh.position.set(x, y, z)
    mesh.castShadow = shadow
    group.add(mesh)
    return mesh
  }
  function knob(group: THREE.Group, r: number, x: number, y: number, z: number, color = '#899ba1') {
    const mesh = createCylinder(r, 0.06, color, 'plastic')
    mesh.rotation.x = Math.PI / 2
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }
  function cart(group: THREE.Group, width: number, depth: number) {
    box(group, width, 0.12, depth, '#a3b3b9', 0, 0.3, 0, 'paint', true)
    for (const x of [-width / 2 + 0.12, width / 2 - 0.12]) for (const z of [-depth / 2 + 0.12, depth / 2 - 0.12]) {
      const wheel = createCylinder(0.16, 0.09, '#38484e', 'rubber')
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, 0.16, z)
      group.add(wheel)
    }
  }
  function screen(group: THREE.Group, w: number, h: number, x: number, y: number, z: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
    mesh.position.set(x, y, z)
    group.add(mesh)
  }
  const monitorDisplay = createMonitorDisplay()
  const ventilatorDisplay = createVentilatorDisplay()
  const ehrDisplay = createEHRDisplay()

  const monitorGroup = new THREE.Group()
  cart(monitorGroup, 1.1, 0.88)
  box(monitorGroup, 0.12, 2.45, 0.12, '#acb9bd', 0, 1.55, 0, 'steel', true)
  box(monitorGroup, 1.84, 1.36, 0.3, '#e1e7e4', 0, 3.05, 0, 'plastic', true)
  box(monitorGroup, 1.65, 1.18, 0.06, '#34464e', 0, 3.07, 0.17, 'plastic')
  screen(monitorGroup, 1.48, 1.02, -0.03, 3.09, 0.205, monitorDisplay.material)
  knob(monitorGroup, 0.047, 0.67, 2.49, 0.2)
  box(monitorGroup, 0.6, 0.055, 0.035, '#81979c', -0.12, 2.47, 0.19)
  const alarmMaterial = new THREE.MeshStandardMaterial({ color: '#cbd5d2', roughness: 0.4, emissive: '#d9494d', emissiveIntensity: 0 })
  const alarmLight = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.16), alarmMaterial)
  alarmLight.position.set(0.5, 3.77, 0.04)
  monitorGroup.add(alarmLight)
  monitorGroup.position.set(-3.65, 0, -1.65)
  monitorGroup.rotation.y = 0.2

  const ventilatorGroup = new THREE.Group()
  cart(ventilatorGroup, 1.3, 1.08)
  box(ventilatorGroup, 0.2, 0.91, 0.2, '#a5b6bc', 0, 0.76, 0, 'steel', true)
  box(ventilatorGroup, 1.29, 1.08, 0.91, '#dce5e3', 0, 1.53, 0, 'plastic', true)
  box(ventilatorGroup, 1.36, 0.12, 0.98, '#8ba5aa', 0, 2.07, 0)
  box(ventilatorGroup, 1.21, 0.85, 0.24, '#bacbcc', 0, 2.52, -0.12, 'plastic', true)
  box(ventilatorGroup, 1.09, 0.74, 0.045, '#344b52', 0, 2.52, 0.018, 'plastic')
  screen(ventilatorGroup, 0.98, 0.65, 0, 2.52, 0.044, ventilatorDisplay.material)
  knob(ventilatorGroup, 0.13, 0.36, 1.71, 0.49)
  knob(ventilatorGroup, 0.048, -0.36, 1.75, 0.49, '#407f86')
  for (const y of [1.3, 1.38, 1.46]) box(ventilatorGroup, 0.54, 0.018, 0.014, '#9aaeb3', -0.14, y, 0.463)
  knob(ventilatorGroup, 0.1, -0.42, 1.1, 0.48, '#9dbaae')
  ventilatorGroup.position.set(3.25, 0, -1.35)
  ventilatorGroup.rotation.y = 0.02
  // Tubing is decorative and excluded from the ventilator's selection bounds.
  const breathingCircuit = createTube([[2.82, 1.1, -0.86], [2.66, 0.88, -0.47], [1.2, 1.94, -0.7], [-0.8, 2, -0.3], [-1.42, 1.81, 0.62]], 0.047, '#b0cbd0')

  const ehrGroup = new THREE.Group()
  cart(ehrGroup, 1.47, 1.02)
  box(ehrGroup, 0.16, 1.78, 0.16, '#a4b4ba', 0, 1.15, 0, 'steel', true)
  box(ehrGroup, 1.62, 0.12, 0.73, '#d4dfdf', 0, 1.76, 0.26, 'paint', true)
  box(ehrGroup, 1.52, 1.03, 0.18, '#344850', 0, 2.46, -0.05, 'plastic', true)
  screen(ehrGroup, 1.36, 0.85, 0, 2.49, 0.047, ehrDisplay.material)
  box(ehrGroup, 0.89, 0.04, 0.28, '#566c73', -0.17, 1.84, 0.34, 'plastic')
  for (const z of [0.25, 0.33, 0.41]) box(ehrGroup, 0.77, 0.009, 0.018, '#a5b9be', -0.17, 1.866, z, 'plastic')
  box(ehrGroup, 0.17, 0.065, 0.23, '#6d858a', 0.53, 1.85, 0.36, 'plastic')
  ehrGroup.position.set(4.55, 0, 1.95)
  ehrGroup.rotation.y = -0.3

  const callGroup = new THREE.Group()
  box(callGroup, 0.66, 0.87, 0.16, '#e5ebe5', 0, 0, 0, 'plastic', true)
  box(callGroup, 0.49, 0.18, 0.035, '#577c7d', 0, 0.25, 0.096)
  knob(callGroup, 0.17, 0, -0.07, 0.11, '#397e87')
  box(callGroup, 0.18, 0.04, 0.014, '#eff5ed', 0, -0.07, 0.15)
  box(callGroup, 0.04, 0.18, 0.014, '#eff5ed', 0, -0.07, 0.15)
  callGroup.position.set(4.8, 2.4, -4.77)
  return {
    monitorGroup, ventilatorGroup, ehrGroup, callGroup, breathingCircuit, alarmMaterial, alarmLight,
    monitorDisplay, ventilatorDisplay,
    dispose() { monitorDisplay.texture.dispose(); ventilatorDisplay.texture.dispose(); ehrDisplay.texture.dispose() },
  }
}
