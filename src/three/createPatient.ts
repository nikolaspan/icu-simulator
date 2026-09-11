import * as THREE from 'three'
import type { Primitives } from './primitives'
export function createPatient({ createBox, createCylinder }: Primitives) {
  const patientGroup = new THREE.Group()
  const bedFrame = createBox(4.5, 0.28, 2, '#81969c')
  bedFrame.position.y = 0.85
  patientGroup.add(bedFrame)
  const bedBase = createBox(2.7, 0.45, 1.3, '#9fb0b5')
  bedBase.position.y = 0.55
  patientGroup.add(bedBase)
  const mattress = createBox(4.15, 0.26, 1.78, '#f6fafb')
  mattress.position.y = 1.13
  patientGroup.add(mattress)
  const pillow = createBox(0.75, 0.18, 1.15, '#f9fbfc')
  pillow.position.set(-1.55, 1.34, 0)
  patientGroup.add(pillow)
  const headboard = createBox(0.18, 1.2, 2, '#afc5ca')
  headboard.position.set(-2.15, 1.55, 0)
  patientGroup.add(headboard)
  const footboard = createBox(0.18, 0.95, 2, '#afc5ca')
  footboard.position.set(2.15, 1.42, 0)
  patientGroup.add(footboard)
  const torsoGeometry = new THREE.CapsuleGeometry(0.42, 1.4, 8, 18)
  const torsoMaterial = new THREE.MeshStandardMaterial({
    color: '#7399a8', roughness: 0.76,
  })
  const torso = new THREE.Mesh(torsoGeometry, torsoMaterial)
  torso.rotation.z = Math.PI / 2
  torso.position.set(0, 1.53, 0)
  torso.castShadow = true
  patientGroup.add(torso)
  const headGeometry = new THREE.SphereGeometry(0.39, 24, 24)
  const headMaterial = new THREE.MeshStandardMaterial({
    color: '#d5a88d', roughness: 0.78,
  })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.set(-1.17, 1.52, 0)
  head.castShadow = true
  patientGroup.add(head)
  const blanket = createBox(1.8, 0.12, 1.55, '#94bbc6')
  blanket.position.set(0.85, 1.48, 0)
  patientGroup.add(blanket)
  const wheelPositions = [[-1.65, 0.25, -0.7], [-1.65, 0.25, 0.7], [1.65, 0.25, -0.7], [1.65, 0.25, 0.7],]
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = createCylinder(0.14, 0.1, '#39484d')
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, y, z)
    patientGroup.add(wheel)
  })
  patientGroup.position.set(0.4, 0, 0.5)
  return patientGroup
}
