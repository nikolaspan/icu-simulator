import * as THREE from 'three'
import type { Primitives } from './primitives'
export function createEquipment({ createBox, createCylinder }: Primitives) {
  const monitorGroup = new THREE.Group()
  const monitorStand = createBox(0.12, 2.3, 0.12, '#75888e')
  monitorStand.position.y = 1.55
  monitorGroup.add(monitorStand)
  const monitorBody = createBox(1.75, 1.35, 0.34, '#28363d')
  monitorBody.position.y = 3.05
  monitorGroup.add(monitorBody)
  const monitorScreen = createBox(1.48, 1.06, 0.035, '#061318')
  monitorScreen.position.set(0, 3.05, 0.19)
  monitorGroup.add(monitorScreen)
  const waveformPoints = []
  for (let index = 0; index < 26; index++) {
    const x = -0.62 + index * 0.05
    let y = 3.15
    if (index % 6 === 2) {
      y += 0.15
    }
    if (index % 6 === 3) {
      y -= 0.12
    }
    waveformPoints.push(new THREE.Vector3(x, y, 0.22))
  }
  const waveformGeometry = new THREE.BufferGeometry().setFromPoints(waveformPoints)
  const waveformMaterial = new THREE.LineBasicMaterial({
    color: '#60e39d',
  })
  const waveform = new THREE.Line(waveformGeometry, waveformMaterial)
  monitorGroup.add(waveform)
  const alarmGeometry = new THREE.SphereGeometry(0.09, 16, 16)
  const alarmMaterial = new THREE.MeshStandardMaterial({
    color: '#ff4f58', emissive: '#ff2835', emissiveIntensity: 2,
  })
  const alarmLight = new THREE.Mesh(alarmGeometry, alarmMaterial)
  alarmLight.position.set(0.68, 3.53, 0.24)
  monitorGroup.add(alarmLight)
  const monitorBase = createBox(0.85, 0.1, 0.75, '#697d83')
  monitorBase.position.y = 0.4
  monitorGroup.add(monitorBase)
  monitorGroup.position.set(-3.65, 0, -1.75)
  const ventilatorGroup = new THREE.Group()
  const ventilatorBody = createBox(1.3, 1.75, 1, '#d4e0e3')
  ventilatorBody.position.y = 1.15
  ventilatorGroup.add(ventilatorBody)
  const ventilatorTop = createBox(1.05, 0.55, 0.7, '#aabcc1')
  ventilatorTop.position.y = 2.25
  ventilatorGroup.add(ventilatorTop)
  const ventilatorScreen = createBox(0.85, 0.45, 0.035, '#0b252d')
  ventilatorScreen.position.set(0, 2.27, 0.37)
  ventilatorGroup.add(ventilatorScreen)
  const ventilatorKnob = createCylinder(0.09, 0.08, '#4f666c')
  ventilatorKnob.rotation.x = Math.PI / 2
  ventilatorKnob.position.set(0.42, 1.65, 0.54)
  ventilatorGroup.add(ventilatorKnob)
  const controlOne = createCylinder(0.045, 0.05, '#237f8f')
  controlOne.rotation.x = Math.PI / 2
  controlOne.position.set(-0.32, 1.65, 0.54)
  ventilatorGroup.add(controlOne)
  const controlTwo = createCylinder(0.045, 0.05, '#237f8f')
  controlTwo.rotation.x = Math.PI / 2
  controlTwo.position.set(-0.12, 1.65, 0.54)
  ventilatorGroup.add(controlTwo)
  ventilatorGroup.position.set(3.55, 0, -1.05)
  const ehrGroup = new THREE.Group()
  const ehrStand = createBox(0.16, 1.9, 0.16, '#71878d')
  ehrStand.position.y = 1
  ehrGroup.add(ehrStand)
  const ehrShelf = createBox(1.65, 0.12, 0.75, '#a8b9bd')
  ehrShelf.position.set(0, 1.65, 0.15)
  ehrGroup.add(ehrShelf)
  const ehrBody = createBox(1.75, 1.15, 0.22, '#283940')
  ehrBody.position.y = 2.38
  ehrGroup.add(ehrBody)
  const ehrScreen = createBox(1.48, 0.88, 0.035, '#164b58')
  ehrScreen.position.set(0, 2.38, 0.13)
  ehrGroup.add(ehrScreen)
  const ehrRowOne = createBox(1.1, 0.05, 0.025, '#80cad5')
  ehrRowOne.position.set(-0.05, 2.6, 0.16)
  ehrGroup.add(ehrRowOne)
  const ehrRowTwo = createBox(0.85, 0.05, 0.025, '#80cad5')
  ehrRowTwo.position.set(-0.17, 2.4, 0.16)
  ehrGroup.add(ehrRowTwo)
  const ehrRowThree = createBox(0.95, 0.05, 0.025, '#80cad5')
  ehrRowThree.position.set(-0.12, 2.2, 0.16)
  ehrGroup.add(ehrRowThree)
  ehrGroup.position.set(4.35, 0, 2.7)
  ehrGroup.rotation.y = -0.4
  const callGroup = new THREE.Group()
  const callPanel = createBox(0.7, 0.85, 0.12, '#eef3f4')
  callGroup.add(callPanel)
  const callButton = createCylinder(0.18, 0.08, '#c83c47')
  callButton.rotation.x = Math.PI / 2
  callButton.position.z = 0.11
  callGroup.add(callButton)
  callGroup.position.set(4.8, 2.15, -4.8)
  return {
    monitorGroup, ventilatorGroup, ehrGroup, callGroup, alarmMaterial, alarmLight
  }
}
