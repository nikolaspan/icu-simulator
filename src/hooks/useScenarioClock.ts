import { useEffect, useEffectEvent } from 'react'

export function useScenarioClock(active: boolean, sessionId: string | undefined, onTick: (now: number) => void) {
  const tick = useEffectEvent(onTick)
  useEffect(() => {
    if (!active) return
    // Measure wall time; counting interval callbacks loses time in background tabs.
    const timer = window.setInterval(() => tick(performance.now()), 200)
    const catchUp = () => tick(performance.now())
    document.addEventListener('visibilitychange', catchUp)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', catchUp)
    }
  }, [active, sessionId])
}
