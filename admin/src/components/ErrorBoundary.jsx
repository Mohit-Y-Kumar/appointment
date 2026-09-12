import React from 'react'
import { toast } from 'react-toastify'

/**
 Catches React component errors and displays a fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0
        }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('Error caught by ErrorBoundary:', error)
        console.error('Error Info:', errorInfo)

        // Update state with error details
        this.setState(prevState => ({
            error,
            errorInfo,
            errorCount: prevState.errorCount + 1
        }))

        // Show user-friendly toast notification
        toast.error('An unexpected error occurred. Please try refreshing the page.')

        
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className='flex items-center justify-center min-h-screen bg-gray-100'>
                    <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full'>
                        <div className='flex justify-center mb-4'>
                            <div className='bg-red-100 rounded-full p-4'>
                                <svg
                                    className='w-8 h-8 text-red-600'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                    />
                                </svg>
                            </div>
                        </div>

                        <h1 className='text-2xl font-bold text-center text-gray-800 mb-2'>
                            Oops! Something went wrong
                        </h1>

                        <p className='text-gray-600 text-center mb-6'>
                            We apologize for the inconvenience. An unexpected error occurred.
                        </p>

                        {import.meta.env.DEV && (
                            <div className='bg-red-50 border border-red-200 rounded p-4 mb-6'>
                                <p className='text-sm font-mono text-red-700 wrap-break-words'>
                                    <strong>Error:</strong> {this.state.error?.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className='mt-2 text-xs text-red-600'>
                                        <summary className='cursor-pointer font-semibold'>
                                            Stack trace
                                        </summary>
                                        <pre className='mt-2 overflow-auto whitespace-pre-wrap'>
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className='flex gap-3'>
                            <button
                                onClick={() => window.location.reload()}
                                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition'
                            >
                                Refresh Page
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                className='flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400 transition'
                            >
                                Go Home
                            </button>
                        </div>

                        {this.state.errorCount > 3 && (
                            <p className='text-xs text-gray-500 text-center mt-4'>
                                Multiple errors detected. Please clear your browser cache or contact support.
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
