import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MealPlanner crashed while rendering', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
          <div className="max-w-2xl rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Something went wrong</p>
            <h1 className="mt-2 text-xl font-bold">Meal Planner could not render this page.</h1>
            <p className="mt-2 text-sm text-gray-600">
              Safari reported a runtime error. Refreshing may help, but the message below is the useful part if this keeps happening.
            </p>
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-red-50 p-3 text-xs text-red-900">
              {this.state.error.message || String(this.state.error)}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
