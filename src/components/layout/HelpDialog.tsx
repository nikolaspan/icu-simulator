import Modal from '../common/Modal'

export default function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal titleId="help-title" className="help-modal" onClose={onClose}>
      <header className="modal-header"><div><span className="eyebrow">Simulator help</span><h2 id="help-title">Interacting with the ICU</h2></div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close help">×</button>
      </header>
      <div className="modal-content">
        <p>Inspect the equipment, choose an available action, and document your work in the EHR.</p>
        <dl className="help-items">
          <div><dt>Rotate and zoom</dt><dd>Hold the right mouse button and drag inside the room to rotate. Scroll or middle-drag to zoom. Left-click selects equipment; left-drag does not rotate. On touch screens, drag to rotate and pinch to zoom. Camera buttons and arrow keys also work.</dd></div>
          <div><dt>Identify equipment</dt><dd>Hover to highlight an object, then click to interact. You can also Tab to an equipment button and press Enter.</dd></div>
          <div><dt>Follow the objective</dt><dd>Available equipment is marked “Action available”. Timed decisions continue counting down while help or the EHR is open.</dd></div>
          <div><dt>Document and continue</dt><dd>Required fields are labelled. Save &amp; continue checks every required section and takes you to any missing entry. Drafts remain when you close the EHR.</dd></div>
        </dl>
        <p>Escape closes help, the EHR, or the selected equipment panel. Reset starts a new session and clears its entries and logs.</p>
        <button type="button" className="primary-action" onClick={onClose}>Return to simulation</button>
      </div>
    </Modal>
  )
}
