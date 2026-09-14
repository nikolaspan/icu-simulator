import { memo, useEffect, useRef } from 'react'
import type { HotspotId, VitalSigns } from '../../engine/types'
import { createICUScene, type CameraAction } from '../../three/createICUScene'

interface ICUSceneProps {
  alarm: boolean
  vitals: VitalSigns
  oxygenAdjusted: boolean
  enabled: boolean
  activeHotspots: HotspotId[]
  highlighted: HotspotId | null
  selected: HotspotId | null
  onHotspotClick: (id: HotspotId) => void
  onHotspotHover: (id: HotspotId | null) => void
}
function ICUScene({ alarm, vitals, oxygenAdjusted, enabled, activeHotspots, highlighted, selected, onHotspotClick, onHotspotHover }: ICUSceneProps) {
  const mount = useRef<HTMLDivElement>(null)
  const scene = useRef<ReturnType<typeof createICUScene> | null>(null)
  useEffect(() => {
    if (!mount.current) return
    const instance = createICUScene(mount.current, onHotspotClick, onHotspotHover, activeHotspots)
    scene.current = instance
    return () => { instance.dispose(); scene.current = null }
  }, [onHotspotClick, onHotspotHover, activeHotspots])
  useEffect(() => { scene.current?.setClinicalState(vitals, alarm, oxygenAdjusted) }, [vitals, alarm, oxygenAdjusted])
  useEffect(() => { scene.current?.setEnabled(enabled) }, [enabled])
  useEffect(() => { scene.current?.highlight(highlighted, selected) }, [highlighted, selected])
  const cameraControls: [CameraAction, string][] = [['left', 'Rotate left'], ['right', 'Rotate right'], ['in', 'Zoom in'], ['out', 'Zoom out'], ['reset', 'Reset view']]
  return (
    <>
      <div ref={mount} className="icu-scene" />
      <div className="camera-controls" role="group" aria-label="Camera controls">
        {cameraControls.map(([action, label]) => <button type="button" key={action} title={label} aria-label={label} disabled={!enabled} onClick={() => scene.current?.moveCamera(action)}><span aria-hidden="true">{{ left: '↶', right: '↷', in: '+', out: '−', reset: '⌂' }[action]}</span><span className="sr-only">{label}</span></button>)}
      </div>
    </>
  )
}
export default memo(ICUScene)
