import { memo, useEffect, useRef } from 'react'
import type { HotspotId } from '../../engine/types'
import { createICUScene, type CameraAction } from '../../three/createICUScene'

interface ICUSceneProps {
  alarm: boolean
  enabled: boolean
  activeHotspots: HotspotId[]
  highlighted: HotspotId | null
  onHotspotClick: (id: HotspotId) => void
  onHotspotHover: (id: HotspotId | null) => void
}
function ICUScene({ alarm, enabled, activeHotspots, highlighted, onHotspotClick, onHotspotHover }: ICUSceneProps) {
  const mount = useRef<HTMLDivElement>(null)
  const scene = useRef<ReturnType<typeof createICUScene> | null>(null)
  useEffect(() => {
    if (!mount.current) return
    const instance = createICUScene(mount.current, onHotspotClick, onHotspotHover, activeHotspots)
    scene.current = instance
    return () => { instance.dispose(); scene.current = null }
  }, [onHotspotClick, onHotspotHover, activeHotspots])
  useEffect(() => { scene.current?.setAlarm(alarm) }, [alarm])
  useEffect(() => { scene.current?.setEnabled(enabled) }, [enabled])
  useEffect(() => { scene.current?.highlight(highlighted) }, [highlighted])
  const cameraControls: [CameraAction, string][] = [['left', 'Rotate left'], ['right', 'Rotate right'], ['in', 'Zoom in'], ['out', 'Zoom out'], ['reset', 'Reset view']]
  return (
    <>
      <div ref={mount} className="icu-scene" />
      <div className="camera-controls" role="group" aria-label="Camera controls">
        {cameraControls.map(([action, label]) => <button type="button" key={action} disabled={!enabled} onClick={() => scene.current?.moveCamera(action)}>{label}</button>)}
      </div>
    </>
  )
}
export default memo(ICUScene)
