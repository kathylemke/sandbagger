import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

// Global error handler to catch unhandled errors outside React tree
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('[UNCAUGHT ERROR]', e.message, 'at', e.filename, 'line', e.lineno);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[UNHANDLED REJECTION]', e.reason);
  });
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || 'Unknown error',
      errorStack: error.stack || ''
    };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary caught]', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>⚠️ Something went wrong</Text>
          <Text style={styles.message}>{this.state.errorMessage}</Text>
          {this.state.errorStack ? (
            <Text style={styles.stack} numberOfLines={3}>{this.state.errorStack}</Text>
          ) : null}
          <TouchableOpacity style={styles.btn} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f5f0' },
  title: { fontSize: 20, fontWeight: '700', color: '#1a472a', marginBottom: 12 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8 },
  stack: { fontSize: 10, color: '#999', textAlign: 'left', marginBottom: 16, fontFamily: 'monospace' },
  btn: { backgroundColor: '#d4a843', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#0f2d1a', fontWeight: '700' },
});