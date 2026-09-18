// Small local declarations for the plain Three.js APIs used by this project.
// Extend this surface alongside scene code; no external type package is required.
declare module 'three' {
  export class Vector2 { x: number; y: number; constructor(x?: number, y?: number) }
  export class Vector3 {
    x: number; y: number; z: number
    constructor(x?: number, y?: number, z?: number)
    set(x: number, y: number, z: number): this
    copy(value: Vector3): this
    clone(): Vector3
    sub(value: Vector3): this
    add(value: Vector3): this
    multiplyScalar(value: number): this
    applyAxisAngle(axis: Vector3, angle: number): this
  }
  export class Color { constructor(value: string | number); set(value: string | number): this }
  export class Object3D {
    position: Vector3
    rotation: { x: number; y: number; z: number }
    scale: Vector3
    visible: boolean
    castShadow: boolean
    receiveShadow: boolean
    userData: Record<string, unknown>
    add(...objects: Object3D[]): this
    traverse(callback: (object: Object3D) => void): void
    updateMatrixWorld(force?: boolean): void
  }
  export class Group extends Object3D {}
  export class Scene extends Object3D { background: Color; fog: Fog }
  export class Fog { constructor(color: string, near: number, far: number) }
  export class PerspectiveCamera extends Object3D {
    constructor(fov: number, aspect: number, near: number, far: number)
    aspect: number
    updateProjectionMatrix(): void
  }
  export class BufferGeometry { setFromPoints(points: Vector3[]): this; dispose(): void }
  export class PlaneGeometry extends BufferGeometry { constructor(width: number, height: number) }
  export class CatmullRomCurve3 { constructor(points: Vector3[]) }
  export class TubeGeometry extends BufferGeometry { constructor(curve: CatmullRomCurve3, segments: number, radius: number, radialSegments: number, closed: boolean) }
  export class BoxGeometry extends BufferGeometry { constructor(width: number, height: number, depth: number) }
  export class CylinderGeometry extends BufferGeometry { constructor(top: number, bottom: number, height: number, segments: number) }
  export class SphereGeometry extends BufferGeometry { constructor(radius: number, width: number, height: number) }
  export class CapsuleGeometry extends BufferGeometry { constructor(radius: number, length: number, cap: number, radial: number) }
  export class Material { opacity: number; transparent: boolean; dispose(): void }
  export class CanvasTexture {
    constructor(canvas: HTMLCanvasElement)
    colorSpace: string
    needsUpdate: boolean
    generateMipmaps: boolean
    minFilter: number
    dispose(): void
  }
  export class MeshBasicMaterial extends Material { constructor(options: { map: CanvasTexture; toneMapped?: boolean }) }
  export class MeshStandardMaterial extends Material {
    constructor(options: { color: string; roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number })
    emissiveIntensity: number
    color: Color
    emissive: Color
  }
  export class LineBasicMaterial extends Material { constructor(options: { color: string; transparent?: boolean; opacity?: number; depthWrite?: boolean }); color: Color }
  export class Box3 { min: Vector3; max: Vector3; setFromObject(object: Object3D): this; expandByScalar(value: number): this }
  export class Mesh extends Object3D {
    constructor(geometry: BufferGeometry, material: Material | Material[])
    geometry: BufferGeometry
    material: Material | Material[]
  }
  export class Line extends Object3D {
    constructor(geometry: BufferGeometry, material: Material)
    geometry: BufferGeometry
    material: Material | Material[]
  }
  export class LineSegments extends Line {}
  export class BoxHelper extends LineSegments {
    constructor(object: Object3D, color: Color)
    update(): void
  }
  export class HemisphereLight extends Object3D { constructor(sky: string, ground: string, intensity: number) }
  export class DirectionalLight extends Object3D {
    constructor(color: string, intensity: number)
    shadow: { mapSize: { set(width: number, height: number): void }; camera: { left: number; right: number; top: number; bottom: number; near: number; far: number; updateProjectionMatrix(): void }; bias: number; normalBias: number; dispose(): void }
  }
  export class PointLight extends Object3D { constructor(color: string, intensity: number, distance: number) }
  export interface Intersection { object: Object3D; distance: number }
  export class Raycaster {
    setFromCamera(pointer: Vector2, camera: PerspectiveCamera): void
    intersectObjects(objects: Object3D[], recursive: boolean, target?: Intersection[]): Intersection[]
  }
  export const PCFShadowMap: number
  export const SRGBColorSpace: string
  export const LinearFilter: number
  export const MOUSE: { ROTATE: number; DOLLY: number; PAN: number }
  export class WebGLRenderer {
    constructor(options: { antialias: boolean })
    domElement: HTMLCanvasElement
    shadowMap: { enabled: boolean; type: number; autoUpdate: boolean; needsUpdate: boolean }
    outputColorSpace: string
    setPixelRatio(ratio: number): void
    setSize(width: number, height: number): void
    setAnimationLoop(callback: ((time: number) => void) | null): void
    render(scene: Scene, camera: PerspectiveCamera): void
    dispose(): void
    forceContextLoss(): void
  }
}
declare module 'three/addons/controls/OrbitControls.js' {
  import { PerspectiveCamera, Vector3 } from 'three'
  export class OrbitControls {
    constructor(camera: PerspectiveCamera, element: HTMLElement)
    target: Vector3
    enabled: boolean
    enableDamping: boolean
    dampingFactor: number
    enablePan: boolean
    minDistance: number
    maxDistance: number
    minPolarAngle: number
    maxPolarAngle: number
    minAzimuthAngle: number
    maxAzimuthAngle: number
    mouseButtons: { LEFT: number | null; MIDDLE: number | null; RIGHT: number | null }
    update(): boolean
    dispose(): void
  }
}
