import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  titleId: string
  className: string
  children: ReactNode
  onClose: () => void
}

export default function Modal({ titleId, className, children, onClose }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog ref={ref} className={`modal ${className}`} aria-labelledby={titleId}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))
          .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        // Keep Tab within the open dialog; Escape and Close always release it.
        // Native focus wrapping otherwise differs between browser chrome and tabs.
        if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus() }
      }}
      onCancel={event => { event.preventDefault(); onClose() }}>
      {children}
    </dialog>
  )
}
