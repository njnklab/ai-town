import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };

export default class ErrorBoundary extends React.Component<Props, { hasError: boolean; message?: string }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('UI ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="text-white p-4">出现错误：{this.state.message}. 请刷新页面或查看控制台日志。</div>
      );
    }
    return this.props.children;
  }
}

