// ErrorBoundary - React 18 compatible version
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary MUST be a class component - this is a React limitation.
 * Error boundaries require componentDidCatch() and getDerivedStateFromError()
 * lifecycle methods, which have no hooks equivalent.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[Error Boundary] Caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center h-full p-8 bg-red-900/20 text-red-200 border border-red-500/50 rounded-lg m-4">
                    <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                    <pre className="bg-black/40 p-4 rounded overflow-auto max-w-full text-xs mb-4">
                        {this.state.error?.message}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
