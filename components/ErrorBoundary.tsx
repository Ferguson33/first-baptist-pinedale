"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Generic Error Boundary for catching render errors in auth, membership,
 * and other critical page load logic.
 * Prevents the entire site from crashing on transient auth/profile errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    // Force a soft refresh of the app state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="max-w-md text-center bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-[var(--color-navy)] mb-3">
              Something went wrong
            </h2>
            <p className="text-[var(--color-stone)] mb-6">
              We hit a temporary issue loading your account or membership status.
              This can happen after signing up or on refresh.
            </p>
            <button
              onClick={this.handleReset}
              className="px-8 py-3 bg-[var(--color-navy)] text-white rounded-full font-semibold hover:bg-black transition"
            >
              Refresh the page
            </button>
            <p className="mt-4 text-xs text-[var(--color-stone-light)]">
              If this keeps happening, please contact the church office.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
