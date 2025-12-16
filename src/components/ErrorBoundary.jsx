import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error but don't break the app
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Reset error state after a delay to allow retry
    setTimeout(() => {
      this.setState({ hasError: false, error: null });
    }, 5000);
  }

  render() {
    if (this.state.hasError) {
      // Return fallback UI instead of crashing
      return this.props.fallback || (
        <div className="p-4 text-center text-gray-500">
          {this.props.message || 'Something went wrong. Please refresh the page.'}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

