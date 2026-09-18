import * as THREE from 'three'
import type { VitalSigns } from '../engine/types'

// A screen owns one small canvas and texture for its entire lifetime.
function createDisplay(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to draw equipment displays.')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  function label(text: string, x: number, y: number, size = 20, color = '#c6d8db', weight = 500) {
    context!.fillStyle = color
    context!.font = `${weight} ${size}px system-ui, sans-serif`
    context!.fillText(text, x, y)
  }
  function clear(color = '#101f27') { context!.fillStyle = color; context!.fillRect(0, 0, width, height) }
  return { context, texture, material, label, clear }
}

function wave(context: CanvasRenderingContext2D, y: number, color: string, ecg: boolean) {
  context.strokeStyle = color
  context.lineWidth = 3
  context.beginPath()
  for (let x = 20; x <= 330; x++) {
    const phase = (x % 78) / 78
    const amplitude = ecg ? (phase > 0.4 && phase < 0.46 ? -28 : phase > 0.46 && phase < 0.52 ? 14 : Math.sin(phase * Math.PI * 4) * 3) : -Math.pow(Math.sin(phase * Math.PI), 4) * 22
    if (x === 20) context.moveTo(x, y + amplitude)
    else context.lineTo(x, y + amplitude)
  }
  context.stroke()
}

export function createMonitorDisplay() {
  const display = createDisplay(512, 352)
  const { context, label, clear, texture } = display
  let previous = ''
  return {
    ...display,
    update(vitals: VitalSigns, alarm: boolean) {
      const key = `${vitals.hr}:${vitals.spo2}:${vitals.rr}:${vitals.bp}:${vitals.temp}:${alarm}`
      if (key === previous) return
      previous = key
      clear()
      context.fillStyle = alarm ? '#732b36' : '#243c43'
      context.fillRect(0, 0, 512, 40)
      label(alarm ? 'SpO₂ LOW  •  CHECK PATIENT' : 'BED 01  •  MONITORING', 16, 27, 19, '#fff', 650)
      label('ECG', 20, 76, 17, '#91d9b8')
      label('HR', 363, 75, 18, '#91d9b8')
      label(String(vitals.hr), 355, 127, 49, '#91d9b8', 650)
      wave(context, 119, '#91d9b8', true)
      label('PLETH', 20, 179, 17, '#8ac9dd')
      label('SpO₂ %', 363, 178, 18, alarm ? '#ff9c9f' : '#8ac9dd')
      label(String(vitals.spo2), 355, 232, 52, alarm ? '#ff9c9f' : '#8ac9dd', 700)
      wave(context, 219, '#8ac9dd', false)
      context.fillStyle = '#1d333b'
      context.fillRect(12, 264, 488, 2)
      label(`RR  ${vitals.rr}`, 20, 302, 24, '#e2d2a4')
      label(`BP  ${vitals.bp}`, 171, 302, 24, '#e0eaed')
      label(`${vitals.temp.toFixed(1)} °C`, 396, 302, 21, '#e0eaed')
      label('SIMULATED WAVEFORMS', 20, 337, 13, '#96aaaf')
      texture.needsUpdate = true
    },
  }
}

export function createVentilatorDisplay() {
  const display = createDisplay(384, 256)
  const { context, label, clear, texture } = display
  let previous: boolean | undefined
  return {
    ...display,
    update(oxygenAdjusted: boolean) {
      if (previous === oxygenAdjusted) return
      previous = oxygenAdjusted
      clear()
      label('RESPIRATORY SUPPORT', 16, 29, 19, '#e0eaed', 650)
      context.strokeStyle = '#88c7d0'
      context.lineWidth = 3
      context.beginPath()
      for (let x = 16; x < 365; x++) {
        const y = 96 - ((x % 86) > 24 && (x % 86) < 56 ? 28 : 0)
        if (x === 16) context.moveTo(x, y); else context.lineTo(x, y)
      }
      context.stroke()
      label('FiO₂', 16, 153, 20)
      label(oxygenAdjusted ? '100%' : '—', 16, 205, 44, '#b8ddd8', 650)
      label(oxygenAdjusted ? 'Setting updated' : 'Review settings', 175, 190, 19)
      label('SIMULATED DISPLAY', 16, 240, 13, '#96aaaf')
      texture.needsUpdate = true
    },
  }
}

export function createEHRDisplay() {
  const display = createDisplay(512, 320)
  const { context, clear, label } = display
  clear('#edf3f3')
  context.fillStyle = '#235d63'
  context.fillRect(0, 0, 512, 53)
  label('PATIENT RECORD', 22, 35, 24, '#fff', 650)
  label('ICU  /  BED 01', 24, 93, 23, '#24444b', 650)
  label('Clinical documentation', 24, 124, 18, '#526b72')
  ;['Clinical assessment', 'Intervention / Settings', 'Communication log'].forEach((text, index) => {
    context.fillStyle = '#fff'
    context.fillRect(20, 146 + index * 53, 472, 43)
    label(text, 34, 175 + index * 53, 20, '#34555c')
    label('›', 461, 175 + index * 53, 24, '#235d63')
  })
  display.texture.needsUpdate = true
  return display
}
