import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Etwas ist schiefgelaufen
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4 overflow-auto max-h-32 text-red-600 dark:text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Erneut versuchen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
