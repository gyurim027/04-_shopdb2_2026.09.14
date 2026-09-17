import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Customer frontend render error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="container page-section">
        <div className="fatal-error-card">
          <AlertTriangle size={34} />
          <h1>화면을 불러오지 못했습니다.</h1>
          <p>일시적인 화면 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            <RotateCcw size={17} /> 새로고침
          </button>
        </div>
      </div>
    )
  }
}
