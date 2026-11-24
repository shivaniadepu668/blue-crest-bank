import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && typeof parsed.error === 'string') {
          friendlyMessage = `${parsed.error} (${parsed.operationType || 'operation'} on ${
            parsed.path || 'Firestore'
          })`;
        }
      } catch {
        // Not JSON, use raw message
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold text-slate-900">
                Application Error Encountered
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              A secure data operation could not be completed. Please review the details below or
              reload the workspace.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 font-mono text-xs text-slate-700 break-words">
              {friendlyMessage}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                Return to Workspace
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
