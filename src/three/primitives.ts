import * as THREE from 'three'

// Caches belong to one scene; shared resources are disposed once at teardown.
export function createPrimitives() {
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const geometries = new Map<string, THREE.BufferGeometry>()
  function material(color: string, cylinder = false) {
    const key = `${color}:${cylinder}`
    let value = materials.get(key)
    if (!value) {
      value = new THREE.MeshStandardMaterial({ color, roughness: cylinder ? 0.5 : 0.58, metalness: cylinder ? 0.12 : 0.08 })
      materials.set(key, value)
    }
    return value
  }
  function mesh(key: string, create: () => THREE.BufferGeometry, color: string, cylinder = false) {
    let geometry = geometries.get(key)
    if (!geometry) { geometry = create(); geometries.set(key, geometry) }
    const value = new THREE.Mesh(geometry, material(color, cylinder))
    value.castShadow = true
    value.receiveShadow = !cylinder
    return value
  }
  return {
    createBox: (w: number, h: number, d: number, color: string) => mesh(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d), color),
    createCylinder: (r: number, h: number, color: string) => mesh(`cylinder:${r}:${h}`, () => new THREE.CylinderGeometry(r, r, h, 24), color, true),
  }
}
export type Primitives = ReturnType<typeof createPrimitives>
