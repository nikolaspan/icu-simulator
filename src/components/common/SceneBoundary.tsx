import { Component, type ErrorInfo, type ReactNode } from 'react'

export default class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ICU graphics could not be displayed:', error, info) }
  render() {
    if (this.state.failed) return <div className="scene-error" role="alert"><h2>The ICU room could not be displayed</h2><p>You can continue using the equipment buttons below. Reload the page to retry 3D graphics.</p></div>
    return this.props.children
  }
}
