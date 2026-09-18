import * as THREE from 'three'
import type { Primitives } from './primitives'

export function createPatient({ createBox, createCylinder, createSphere }: Primitives) {
  const group = new THREE.Group()
  function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number, fabric = false) {
    const mesh = createBox(w, h, d, color, fabric ? 'fabric' : 'paint')
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    group.add(mesh)
    return mesh
  }
  box(4.5, 0.22, 2, '#7c939b', 0, 0.92, 0)
  box(2.7, 0.16, 1.3, '#9bafb6', 0, 0.38, 0)
  const support = box(0.85, 0.46, 0.8, '#cbd6d8', 0, 0.64, 0)
  support.rotation.z = -0.16
  box(4.18, 0.27, 1.79, '#e7edeb', 0, 1.16, 0, true)
  const raised = box(1.25, 0.16, 1.76, '#f0f3ee', -1.43, 1.37, 0, true)
  raised.rotation.z = -0.15
  const pillow = createSphere(0.5, '#fafaf3', 'fabric')
  pillow.scale.set(0.88, 0.28, 1.27)
  pillow.position.set(-1.55, 1.58, 0)
  group.add(pillow)
  for (const x of [-2.16, 2.16]) {
    box(0.16, x < 0 ? 0.84 : 0.65, 1.96, '#c4d7d6', x, 1.48, 0)
    box(0.18, 0.13, 1.45, '#758f93', x, x < 0 ? 1.88 : 1.77, 0)
  }
  // Short split rails retain a clear view of the patient.
  for (const z of [-0.98, 0.98]) {
    for (const x of [-0.94, 1.04]) {
      const rail = createCylinder(0.046, 1.3, '#a8b7bd')
      rail.rotation.z = Math.PI / 2
      rail.position.set(x, 1.69, z)
      group.add(rail)
      for (const end of [-0.51, 0.51]) {
        const post = createCylinder(0.035, 0.52, '#a8b7bd')
        post.position.set(x + end, 1.44, z)
        group.add(post)
      }
    }
  }
  const torso = createSphere(0.5, '#b9cecc', 'fabric')
  torso.scale.set(1.38, 0.58, 0.84)
  torso.position.set(-0.52, 1.52, 0)
  torso.castShadow = true
  group.add(torso)
  const head = createSphere(0.32, '#c99f85', 'skin')
  head.scale.set(1.13, 0.92, 0.88)
  head.position.set(-1.48, 1.8, 0)
  head.castShadow = true
  group.add(head)
  for (const z of [-0.54, 0.54]) {
    const arm = createSphere(0.16, '#c99f85', 'skin')
    arm.scale.set(3.1, 0.72, 0.9)
    arm.position.set(-0.4, 1.45, z)
    group.add(arm)
  }
  const blanket = createSphere(0.8, '#799eaa', 'fabric')
  blanket.scale.set(1.75, 0.34, 0.99)
  blanket.position.set(0.66, 1.42, 0)
  blanket.castShadow = true
  group.add(blanket)
  box(0.13, 0.07, 1.49, '#aac3c9', -0.27, 1.68, 0, true)
  for (const x of [-1.65, 1.65]) for (const z of [-0.72, 0.72]) {
    box(0.12, 0.21, 0.12, '#9bafb6', x, 0.33, z)
    const wheel = createCylinder(0.2, 0.12, '#39464b', 'rubber')
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(x, 0.2, z)
    wheel.castShadow = true
    group.add(wheel)
  }
  group.position.set(0.1, 0, 0.6)
  return group
}
