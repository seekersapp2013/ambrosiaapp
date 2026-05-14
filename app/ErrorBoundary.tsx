import React from 'react';
import { View, Text, Button as RNButton, ScrollView } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0A0A0A', padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
            Something went wrong
          </Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <Text style={{ color: '#EF4444', fontSize: 14, marginBottom: 10 }}>
              {this.state.error?.name}
            </Text>
            <Text style={{ color: '#A3A3A3', fontSize: 12, marginBottom: 20 }}>
              {this.state.error?.message}
            </Text>
            <Text style={{ color: '#737373', fontSize: 10, fontFamily: 'monospace' }}>
              {this.state.error?.stack}
            </Text>
          </ScrollView>
          <RNButton
            title="Try Again"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}
