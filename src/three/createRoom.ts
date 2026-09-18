import * as THREE from 'three'
import type { Primitives } from './primitives'

export function createRoom(scene: THREE.Scene, { createBox, createCylinder, createTube }: Primitives) {
  function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number) {
    const mesh = createBox(w, h, d, color, 'wall')
    mesh.position.set(x, y, z)
    scene.add(mesh)
    return mesh
  }
  box(13, 0.14, 10, '#b7c5c8', 0, -0.07, 0)
  // Sparse, flush flooring seams and protective wall panels give the room scale.
  for (const x of [-4.5, -1.5, 1.5, 4.5]) box(0.013, 0.004, 10, '#acbcbf', x, 0.003, 0)
  for (const z of [-3, 0, 3]) box(13, 0.004, 0.013, '#acbcbf', 0, 0.003, z)
  box(13, 5.2, 0.16, '#e6ece9', 0, 2.6, -5)
  box(0.16, 5.2, 10, '#dce5e4', -6.5, 2.6, 0)
  box(12.8, 1.35, 0.04, '#c7d7d5', 0, 0.85, -4.9)
  box(12.8, 0.13, 0.09, '#899f9f', 0, 0.13, -4.85)
  box(0.09, 0.13, 10, '#899f9f', -6.38, 0.13, 0)
  for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) box(0.016, 3.2, 0.02, '#d3dfdd', x, 3.3, -4.9)
  box(7.6, 0.67, 0.15, '#f0f2ee', -0.7, 2.45, -4.8)
  box(7.8, 0.07, 0.22, '#849a9d', -0.7, 2.1, -4.7)
  for (const x of [-3.7, -2.9, -0.7, 0.1, 1.6]) {
    box(0.31, 0.3, 0.08, '#d7dfdd', x, 2.46, -4.68)
    const outlet = createCylinder(0.075, 0.065, x < -2 ? '#658b80' : '#8d9ca2', 'plastic')
    outlet.rotation.x = Math.PI / 2
    outlet.position.set(x, 2.46, -4.61)
    scene.add(outlet)
  }
  // A cutaway ceiling keeps equipment visible; fixtures stay attached to a soffit.
  box(12.9, 0.19, 1.65, '#d9e3e1', 0, 5.12, -4.15)
  for (const x of [-2.8, 2.8]) {
    box(2.4, 0.12, 0.94, '#a3b5b7', x, 4.98, -4.05)
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.04, 0.77), new THREE.MeshStandardMaterial({ color: '#eff8f5', roughness: 0.8, emissive: '#e3f0ed', emissiveIntensity: 0.3 }))
    diffuser.position.set(x, 4.9, -4.05)
    scene.add(diffuser)
  }
  // One IV assembly, with a grounded base and a restrained opaque fluid bag.
  const pole = createCylinder(0.033, 3.1, '#aab7bd')
  pole.position.set(-2.45, 1.6, -1.9)
  scene.add(pole)
  box(0.8, 0.07, 0.6, '#a0b0b5', -2.45, 0.09, -1.9)
  box(0.7, 0.05, 0.05, '#9dabb1', -2.45, 3.14, -1.9)
  box(0.28, 0.49, 0.13, '#c8dfdb', -2.2, 2.82, -1.9)
  box(0.22, 0.2, 0.014, '#f0f4eb', -2.2, 2.85, -1.82)
  scene.add(createTube([[-2.2, 2.56, -1.9], [-2.13, 1.98, -1.76], [-1.96, 1.26, -1.1], [-0.4, 1.44, 0.04]], 0.016, '#d2e1de'))
}
