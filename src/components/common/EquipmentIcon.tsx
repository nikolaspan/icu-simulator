import type { HotspotId } from '../../engine/types'

const paths: Record<HotspotId, string> = {
  hs_monitor: 'M3 4h18v13H3z M8 21h8 M12 17v4 M5 11h3l2-4 3 7 2-3h4',
  hs_patient: 'M3 7v13 M21 11v9 M3 16h18 M6 16v-5h5v5 M11 12h10v4 M7 7h2v2H7z',
  hs_ventilator: 'M5 3h14v9H5z M8 6h2l2 3 2-3h2 M7 12v6h10v-6 M12 18v3 M6 21h12',
  hs_ehr: 'M3 3h18v13H3z M7 7h10 M7 10h7 M12 16v3 M6 19h12l2 3H4z',
  hs_call: 'M6 2h12v20H6z M9 6h6 M12 10v7 M9 13.5h6',
}
export default function EquipmentIcon({ id }: { id: HotspotId }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[id]} /></svg>
}
