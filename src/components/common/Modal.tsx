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
      onCancel={event => { event.preventDefault(); onClose() }}>
      {children}
    </dialog>
  )
}
