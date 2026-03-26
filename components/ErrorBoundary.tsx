// ErrorBoundary - React 19 compatible version
// Note: Using type assertions for React.Component due to ESM module limitations
import * as React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ErrorBoundary extends (React as any).Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    componentDidCatch(error: Error, errorInfo: any): void {
        console.error('[Error Boundary] Caught error:', error, errorInfo);
    }

    render(): React.ReactNode {
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
