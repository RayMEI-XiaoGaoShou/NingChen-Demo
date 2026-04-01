import { Component, type ErrorInfo, type ReactNode } from 'react'

export const RUNTIME_ERROR_STORAGE_KEY = 'ningchen-runtime-error'

interface PhaseErrorBoundaryProps {
    resetKey: string
    phaseName: string
    fallback: ReactNode
    children: ReactNode
}

interface PhaseErrorBoundaryState {
    hasError: boolean
}

export class PhaseErrorBoundary extends Component<PhaseErrorBoundaryProps, PhaseErrorBoundaryState> {
    state: PhaseErrorBoundaryState = {
        hasError: false,
    }

    static getDerivedStateFromError(): PhaseErrorBoundaryState {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[PhaseErrorBoundary] ${this.props.phaseName}`, error, info)

        try {
            localStorage.setItem(
                RUNTIME_ERROR_STORAGE_KEY,
                JSON.stringify({
                    phaseName: this.props.phaseName,
                    message: error.message,
                    stack: error.stack ?? '',
                    componentStack: info.componentStack,
                    capturedAt: new Date().toISOString(),
                }),
            )
        } catch {
            // Ignore storage failures; the fallback UI still protects the session.
        }
    }

    componentDidUpdate(prevProps: PhaseErrorBoundaryProps) {
        if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false })
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback
        }

        return this.props.children
    }
}
