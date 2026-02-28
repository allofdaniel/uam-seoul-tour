'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('SKYBOUND Error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold mb-4 text-orange-400">SKYBOUND 오류 발생</h1>
          <p className="text-gray-400 mb-4 text-center max-w-md">
            렌더링 중 오류가 발생했습니다.
          </p>
          <pre className="bg-gray-900 text-red-400 p-4 rounded-lg max-w-lg overflow-auto text-xs mb-6">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
