import * as THREE from 'three'

const finishes = {
  paint: { roughness: 0.64, metalness: 0.15 },
  steel: { roughness: 0.3, metalness: 0.75 },
  plastic: { roughness: 0.52, metalness: 0 },
  rubber: { roughness: 0.95, metalness: 0 },
  fabric: { roughness: 1, metalness: 0 },
  skin: { roughness: 0.86, metalness: 0 },
  wall: { roughness: 0.94, metalness: 0 },
} as const
export type Finish = keyof typeof finishes

// One cache per room. Tiny fittings do not cast shadows; major forms opt in.
export function createPrimitives() {
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const geometries = new Map<string, THREE.BufferGeometry>()
  function material(color: string, finish: Finish) {
    const key = `${color}:${finish}`
    let value = materials.get(key)
    if (!value) {
      value = new THREE.MeshStandardMaterial({ color, ...finishes[finish] })
      materials.set(key, value)
    }
    return value
  }
  function mesh(key: string, create: () => THREE.BufferGeometry, color: string, finish: Finish) {
    let geometry = geometries.get(key)
    if (!geometry) { geometry = create(); geometries.set(key, geometry) }
    const value = new THREE.Mesh(geometry, material(color, finish))
    value.receiveShadow = true
    return value
  }
  return {
    createBox: (w: number, h: number, d: number, color: string, finish: Finish = 'paint') => mesh(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d), color, finish),
    createCylinder: (r: number, h: number, color: string, finish: Finish = 'steel') => mesh(`cylinder:${r}:${h}`, () => new THREE.CylinderGeometry(r, r, h, 16), color, finish),
    createSphere: (r: number, color: string, finish: Finish = 'plastic') => mesh(`sphere:${r}`, () => new THREE.SphereGeometry(r, 20, 12), color, finish),
    createTube: (points: number[][], radius: number, color: string) => new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 28, radius, 6, false),
      material(color, 'rubber'),
    ),
  }
}
export type Primitives = ReturnType<typeof createPrimitives>
